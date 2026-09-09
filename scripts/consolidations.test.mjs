import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkConsolidations, renderRedirect, syncConsolidations } from "./consolidations.mjs";

const origin = "https://hagiasophiaticket.com";
function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), "hagia-consolidation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const page = (path, body) => {
    mkdirSync(resolve(root, `.${path}`), { recursive: true });
    writeFileSync(resolve(root, `.${path}`, "index.html"), body);
  };
  const policy = { temporaryNoindex: [], consolidations: { "/old/": "/guide/" }, deferredConsolidations: [] };
  const save = () => writeFileSync(resolve(root, "recovery-index-policy.json"), JSON.stringify(policy));
  const sitemap = paths => writeFileSync(resolve(root, "sitemap.xml"), `<urlset>${paths.map(path => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`);
  const indexable = path => `<link rel="canonical" href="${origin}${path}"><h1>Guide</h1>`;
  page("/old/", '<meta name="robots" content="noindex,follow"><h1>Old guide</h1>');
  page("/guide/", indexable("/guide/"));
  sitemap(["/guide/"]);
  save();
  return { root, page, policy, save, sitemap, indexable };
}

test("migration replaces noindex with an immediate canonical redirect, then is idempotent", t => {
  const { root } = fixture(t);
  assert.equal(checkConsolidations(root).length, 1);
  assert.deepEqual(syncConsolidations(root), { redirects: 1, deferred: 0, changed: 1 });
  const html = readFileSync(resolve(root, "old/index.html"), "utf8");
  assert.match(html, /http-equiv="refresh" content="0; url=https:\/\/hagiasophiaticket.com\/guide\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/hagiasophiaticket.com\/guide\/"/);
  assert.match(html, /<a href="\/guide\/">/);
  assert.doesNotMatch(html, /noindex|<script/);
  assert.deepEqual(checkConsolidations(root), []);
  assert.equal(syncConsolidations(root).changed, 0);
});

test("every target is validated before any source is overwritten", t => {
  const { root, page, policy, save, indexable, sitemap } = fixture(t);
  const before = readFileSync(resolve(root, "old/index.html"), "utf8");
  policy.consolidations["/another/"] = "/blocked/";
  page("/another/", "unchanged");
  page("/blocked/", indexable("/blocked/") + '<meta content="noindex" name="googlebot">');
  sitemap(["/guide/", "/blocked/"]);
  save();
  assert.throws(() => syncConsolidations(root), /indexable and final/);
  assert.equal(readFileSync(resolve(root, "old/index.html"), "utf8"), before);
});

test("redirect loops, chains and missing destinations are rejected", t => {
  const f = fixture(t);
  f.policy.consolidations["/guide/"] = "/old/"; f.save();
  assert.throws(() => syncConsolidations(f.root), /loop or chain/);
  delete f.policy.consolidations["/guide/"];
  f.policy.consolidations["/old/"] = "/missing/"; f.save();
  assert.throws(() => syncConsolidations(f.root), /ENOENT/);
});

test("noindex targets are permitted only as explicit deferred, unchanged consolidations", t => {
  const f = fixture(t);
  f.policy.temporaryNoindex = ["/guide/"];
  f.policy.deferredConsolidations = ["/old/"];
  f.page("/guide/", f.indexable("/guide/") + '<meta name="robots" content="noindex,follow">');
  f.save();
  assert.deepEqual(syncConsolidations(f.root), { redirects: 0, deferred: 1, changed: 0 });
  f.page("/old/", renderRedirect("/old/", "/guide/"));
  assert.throws(() => syncConsolidations(f.root), /Deferred consolidation/);
});

test("canonical, sitemap and existing redirect conflicts block migration", t => {
  const f = fixture(t);
  f.page("/guide/", f.indexable("/different/"));
  assert.throws(() => syncConsolidations(f.root), /self-canonical/);
  f.page("/guide/", f.indexable("/guide/"));
  f.sitemap([]);
  assert.throws(() => syncConsolidations(f.root), /missing from sitemap/);
  f.sitemap(["/guide/", "/old/"]);
  assert.throws(() => syncConsolidations(f.root), /source is in sitemap/);
  f.sitemap(["/guide/"]);
  f.page("/guide/", f.indexable("/guide/") + '<meta http-equiv="refresh" content="0; url=/different/">');
  assert.throws(() => syncConsolidations(f.root), /indexable and final/);
});

test("external or traversing destinations cannot be generated", t => {
  const f = fixture(t);
  for (const target of ["https://example.com/", "/../private/", "/guide/?target=other"]) {
    f.policy.consolidations["/old/"] = target; f.save();
    assert.throws(() => syncConsolidations(f.root), /Invalid consolidation path/);
  }
});

test("localized fallback text and canonical remain usable without JavaScript", () => {
  for (const lang of ["en", "de", "fr", "es"]) {
    const html = renderRedirect(`/${lang}/old/`, `/${lang}/guide/`);
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    assert.match(html, new RegExp(`<a href="/${lang}/guide/">`));
    assert.doesNotMatch(html, /<script|noindex/);
  }
});
