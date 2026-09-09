import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const origin = "https://hagiasophiaticket.com";
const copy = {
  en: ["This guide has moved", "Continue to the updated guide"],
  de: ["Dieser Ratgeber ist umgezogen", "Zum aktualisierten Ratgeber"],
  fr: ["Ce guide a changé d’adresse", "Consulter le guide mis à jour"],
  es: ["Esta guía ha cambiado de dirección", "Ver la guía actualizada"]
};

function pagePath(root, path) {
  if (!/^\/(?:[a-z0-9-]+\/)*$/.test(path)) throw new Error(`Invalid consolidation path: ${path}`);
  return resolve(root, `.${path}`, "index.html");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
}

function metadata(html) {
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag).filter(tag => attribute(tag, "rel") === "canonical")
    .map(tag => attribute(tag, "href"));
  return {
    noindex: meta.some(tag => /^(robots|googlebot)$/i.test(attribute(tag, "name") || "") && /\b(noindex|none)\b/i.test(attribute(tag, "content") || "")),
    refresh: meta.some(tag => /^refresh$/i.test(attribute(tag, "http-equiv") || "")),
    canonical
  };
}

export function renderRedirect(source, target) {
  const language = source.split("/")[1];
  const lang = copy[language] ? language : "en";
  const [title, label] = copy[lang];
  return `<!DOCTYPE html>
<html lang="${lang}" data-seo-redirect="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | HagiaSophiaTicket</title>
<link rel="canonical" href="${origin}${target}">
<meta http-equiv="refresh" content="0; url=${origin}${target}">
</head>
<body>
<main><h1>${title}</h1><p><a href="${target}">${label}</a></p></main>
</body>
</html>
`;
}

// Validate the entire plan before any files are changed. GitHub Pages cannot
// configure per-path HTTP redirects, so use Google's supported instant refresh.
export function consolidationPlan(root) {
  const policy = JSON.parse(readFileSync(resolve(root, "recovery-index-policy.json"), "utf8"));
  const deferred = new Set(policy.deferredConsolidations || []);
  const temporary = new Set(policy.temporaryNoindex);
  const sitemap = readFileSync(resolve(root, "sitemap.xml"), "utf8");
  const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
  const entries = Object.entries(policy.consolidations);
  for (const source of deferred) {
    if (!Object.hasOwn(policy.consolidations, source)) throw new Error(`Unknown deferred consolidation: ${source}`);
  }
  return entries.map(([source, target]) => {
    if (source === target || Object.hasOwn(policy.consolidations, target)) throw new Error(`Redirect loop or chain: ${source} -> ${target}`);
    const file = pagePath(root, source);
    const original = readFileSync(file, "utf8");
    const destination = metadata(readFileSync(pagePath(root, target), "utf8"));
    if (sitemapUrls.has(origin + source)) throw new Error(`Consolidation source is in sitemap: ${source}`);
    if (deferred.has(source)) {
      if (!temporary.has(target) || !destination.noindex || !metadata(original).noindex || metadata(original).refresh) {
        throw new Error(`Deferred consolidation must retain noindex source and target without a redirect: ${source}`);
      }
      return { source, target, file, original, deferred: true };
    }
    if (destination.noindex || destination.refresh || temporary.has(target)) throw new Error(`Redirect target must be indexable and final: ${target}`);
    if (destination.canonical.length !== 1 || destination.canonical[0] !== origin + target) throw new Error(`Redirect target must be self-canonical: ${target}`);
    if (!sitemapUrls.has(origin + target)) throw new Error(`Redirect target missing from sitemap: ${target}`);
    return { source, target, file, original, expected: renderRedirect(source, target), deferred: false };
  });
}

export function checkConsolidations(root) {
  return consolidationPlan(root).filter(entry => !entry.deferred && entry.original !== entry.expected)
    .map(entry => `${entry.source}: consolidation redirect is missing or inconsistent; run node scripts/sync-consolidations.mjs.`);
}

export function syncConsolidations(root) {
  const plan = consolidationPlan(root);
  let changed = 0;
  for (const entry of plan) {
    if (!entry.deferred && entry.original !== entry.expected) {
      writeFileSync(entry.file, entry.expected);
      changed += 1;
    }
  }
  return { redirects: plan.filter(entry => !entry.deferred).length, deferred: plan.filter(entry => entry.deferred).length, changed };
}
