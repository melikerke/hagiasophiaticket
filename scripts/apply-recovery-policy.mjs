#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { syncConsolidations } from "./consolidations.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const policy = JSON.parse(readFileSync(resolve(repositoryRoot, "recovery-index-policy.json"), "utf8"));
const siteOrigin = "https://hagiasophiaticket.com";
const temporaryNoindex = new Set(policy.temporaryNoindex);
const consolidations = new Map(Object.entries(policy.consolidations));
const noindexPaths = new Set([...temporaryNoindex, ...consolidations.keys()]);
const hreflangByPath = new Map();
const materiallyUpdated = new Set([
  "/",
  "/about/",
  "/editorial-policy/",
  "/basilica-cistern-opening-hours/",
  "/combo-tickets/",
  "/de/",
  "/fr/",
  "/es/",
  "/de/kombitickets/",
  "/fr/billets-combines/",
  "/es/entradas-combinadas/",
  "/things-to-do-near-hagia-sophia/"
]);
const recoveryDate = "2026-08-27";
const restoredIndexablePages = new Set(["/about/", "/editorial-policy/"]);

for (const group of policy.hreflangGroups) {
  for (const path of Object.values(group)) hreflangByPath.set(path, group);
}

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function urlPathFor(filePath) {
  const relativeFile = relative(repositoryRoot, filePath).split(sep).join("/");
  if (relativeFile === "index.html") return "/";
  if (relativeFile.endsWith("/index.html")) return `/${relativeFile.slice(0, -"index.html".length)}`;
  return `/${relativeFile}`;
}

function removeBalancedDivsByClass(source, className) {
  const openingPattern = new RegExp(`<div\\b[^>]*\\bclass=(?:"[^"]*\\b${className}\\b[^"]*"|'[^']*\\b${className}\\b[^']*')[^>]*>`, "i");
  let output = source;
  while (true) {
    const opening = openingPattern.exec(output);
    if (!opening) return output;
    const tagPattern = /<div\b[^>]*>|<\/div\s*>/gi;
    tagPattern.lastIndex = opening.index;
    let depth = 0;
    let endIndex = -1;
    for (let tag = tagPattern.exec(output); tag; tag = tagPattern.exec(output)) {
      if (/^<div\b/i.test(tag[0])) depth += 1;
      else depth -= 1;
      if (depth === 0) {
        endIndex = tagPattern.lastIndex;
        break;
      }
    }
    if (endIndex < 0) throw new Error(`Unbalanced .${className} block`);
    output = output.slice(0, opening.index) + output.slice(endIndex);
  }
}

function replaceInternalConsolidationLinks(source) {
  return source.replace(/\b(href|value)=("|')([^"']+)\2/gi, (match, attribute, quote, value) => {
    if (!value.startsWith("/")) return match;
    const suffixIndex = value.search(/[?#]/);
    const path = suffixIndex === -1 ? value : value.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? "" : value.slice(suffixIndex);
    const target = consolidations.get(path);
    return target ? `${attribute}=${quote}${target}${suffix}${quote}` : match;
  });
}

function normalizeHeaderAction(source, urlPath) {
  if (urlPath === "/") return source;
  const language = urlPath.startsWith("/de/") ? "de" : urlPath.startsWith("/fr/") ? "fr" : urlPath.startsWith("/es/") ? "es" : "en";
  const destinations = { en: "/", de: "/de/", fr: "/fr/", es: "/es/" };
  const labels = { en: "Tickets", de: "Tickets", fr: "Billets", es: "Entradas" };
  const replacement = `<div class="nav-actions"><a class="btn" href="${destinations[language]}">${labels[language]}</a></div>`;
  return source.replace(/<div\s+class=(?:"nav-actions"|'nav-actions')>[\s\S]*?<\/div>/gi, replacement);
}

function removeHreflang(source) {
  const standalonePattern = /^[ \t]*<link\b(?=[^>]*\brel=(?:"alternate"|'alternate'))(?=[^>]*\bhreflang=(?:"[^"]+"|'[^']+'))[^>]*>[ \t]*(?:\r?\n|$)/gim;
  const inlinePattern = /<link\b(?=[^>]*\brel=(?:"alternate"|'alternate'))(?=[^>]*\bhreflang=(?:"[^"]+"|'[^']+'))[^>]*>/gi;
  return source.replace(standalonePattern, "").replace(inlinePattern, "");
}

function insertAfterCanonical(source, markup) {
  const canonicalPattern = /<link\b(?=[^>]*\brel=(?:"canonical"|'canonical'))[^>]*>/i;
  const canonical = canonicalPattern.exec(source);
  if (!canonical) throw new Error("Missing canonical link");
  const insertionPoint = canonical.index + canonical[0].length;
  const remainder = source.slice(insertionPoint).replace(/^[ \t]*(?:\r?\n)?/, "");
  return `${source.slice(0, insertionPoint)}\n${markup}\n${remainder}`;
}

function applyHreflang(source, urlPath) {
  let output = removeHreflang(source);
  const group = hreflangByPath.get(urlPath);
  if (!group || noindexPaths.has(urlPath)) return output;
  const markup = ["en", "de", "fr", "es"]
    .map((language) => `<link rel="alternate" hreflang="${language}" href="${siteOrigin}${group[language]}">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${siteOrigin}${group.en}">`)
    .join("\n");
  return insertAfterCanonical(output, markup);
}

function applyRobots(source, urlPath) {
  const robotsPattern = /<meta\b(?=[^>]*\bname=(?:"robots"|'robots'))[^>]*>/i;
  if (restoredIndexablePages.has(urlPath)) {
    return source.replace(/<meta\b(?=[^>]*\bname=(?:"robots"|'robots'))(?=[^>]*\bcontent=(?:"noindex,follow"|'noindex,follow'))[^>]*>\s*/i, "");
  }
  if (!noindexPaths.has(urlPath)) return source;
  if (robotsPattern.test(source)) return source.replace(robotsPattern, '<meta name="robots" content="noindex,follow">');
  return insertAfterCanonical(source, '<meta name="robots" content="noindex,follow">');
}

function addAuthorIdentity(source) {
  return source.replace(
    /"author":\{"@type":"Person","name":"Melike","jobTitle":"Founder & Editor"\}/g,
    '"author":{"@type":"Person","@id":"https://hagiasophiaticket.com/about/#melike","name":"Melike","jobTitle":"Founder & Editor","url":"https://hagiasophiaticket.com/about/#melike"}'
  );
}

function addSkipLink(source, urlPath) {
  if (urlPath === "/" || !/<main\b/i.test(source)) return source;
  const language = urlPath.startsWith("/de/") ? "de" : urlPath.startsWith("/fr/") ? "fr" : urlPath.startsWith("/es/") ? "es" : "en";
  const labels = {
    en: "Skip to main content",
    de: "Zum Hauptinhalt springen",
    fr: "Aller au contenu principal",
    es: "Saltar al contenido principal"
  };
  let output = source;
  if (!/<main\b[^>]*\bid=(?:"main-content"|'main-content')/i.test(output)) {
    output = output.replace(/<main\b/i, '<main id="main-content"');
  }
  if (!/<a\b[^>]*\bclass=(?:"[^"]*\bskip-link\b[^"]*"|'[^']*\bskip-link\b[^']*')/i.test(output)) {
    output = output.replace(/(<body\b[^>]*>)/i, `$1<a class="skip-link" href="#main-content">${labels[language]}</a>`);
  }
  return output;
}

function localizeSharedInterface(source, urlPath) {
  if (urlPath.startsWith("/de/")) {
    return source
      .replace(/aria-label="Open menu"/g, 'aria-label="Menü öffnen"')
      .replace(/aria-label="Language"/g, 'aria-label="Sprache"')
      .replace(/>Home</g, ">Startseite<")
      .replace(/Founder &amp; Editor/g, "Gründerin &amp; Redakteurin")
      .replace(/Hagia Sophia Ticket &amp; Visitor Guide/g, "Hagia-Sophia-Ticket &amp; Besucherführer")
      .replace(/Hagia Sophia Ticket & Visitor Guide/g, "Hagia-Sophia-Ticket &amp; Besucherführer")
      .replace(/geprueft/g, "geprüft")
      .replace(/Datenschutzerklaerung/g, "Datenschutzerklärung");
  }
  if (urlPath.startsWith("/fr/")) {
    return source
      .replace(/aria-label="Open menu"/g, 'aria-label="Ouvrir le menu"')
      .replace(/aria-label="Language"/g, 'aria-label="Langue"')
      .replace(/>Home</g, ">Accueil<")
      .replace(/Founder &amp; Editor/g, "Fondatrice &amp; rédactrice")
      .replace(/Hagia Sophia Ticket &amp; Visitor Guide/g, "Billets et guide de visite de Sainte-Sophie")
      .replace(/Hagia Sophia Ticket & Visitor Guide/g, "Billets et guide de visite de Sainte-Sophie")
      .replace(/Redige et verifie/g, "Rédigé et vérifié")
      .replace(/Billets combines/g, "Billets combinés")
      .replace(/Mentions legales/g, "Mentions légales");
  }
  if (urlPath.startsWith("/es/")) {
    return source
      .replace(/aria-label="Open menu"/g, 'aria-label="Abrir menú"')
      .replace(/aria-label="Language"/g, 'aria-label="Idioma"')
      .replace(/>Home</g, ">Inicio<")
      .replace(/Founder &amp; Editor/g, "Fundadora y editora")
      .replace(/Hagia Sophia Ticket &amp; Visitor Guide/g, "Entradas y guía de visita de Santa Sofía")
      .replace(/Hagia Sophia Ticket & Visitor Guide/g, "Entradas y guía de visita de Santa Sofía")
      .replace(/Politica/g, "Política")
      .replace(/Divulgacion/g, "Divulgación");
  }
  return source;
}

function versionRuntimeAsset(source) {
  return source.replace(/src=("|')\/site-runtime\.js(?:\?v=[^"']+)?\1/g, 'src="/site-runtime.js?v=20260827-2"');
}

function addFooterLanguageLinks(source, urlPath) {
  if (!/<footer\b/i.test(source) || source.includes("footer-languages")) return source;
  const language = urlPath.startsWith("/de/") ? "de" : urlPath.startsWith("/fr/") ? "fr" : urlPath.startsWith("/es/") ? "es" : "en";
  const labels = { en: "Languages", de: "Sprachen", fr: "Langues", es: "Idiomas" };
  const markup = `<nav class="footer-languages" aria-label="${labels[language]}"><span>${labels[language]}</span><a href="/" lang="en" hreflang="en">English</a><a href="/de/" lang="de" hreflang="de">Deutsch</a><a href="/fr/" lang="fr" hreflang="fr">Français</a><a href="/es/" lang="es" hreflang="es">Español</a></nav>`;
  return source.replace(/<\/footer>/i, `${markup}</footer>`);
}

function simplifyThingsToDoHub(source) {
  let output = source.replace(/<script type="application\/ld\+json">(\[[\s\S]*?\])<\/script>/, (script, json) => {
    const graph = JSON.parse(json);
    const simplifiedGraph = graph.filter((item) => item?.["@type"] !== "ItemList");
    return `<script type="application/ld+json">${JSON.stringify(simplifiedGraph)}</script>`;
  });
  const start = output.indexOf('<h2 id="ticket-options">');
  if (start < 0) throw new Error("Things-to-do ticket-options section not found");
  const tableEnd = output.indexOf("</table>", start);
  if (tableEnd < 0) throw new Error("Things-to-do ticket-options table is incomplete");
  const replacement = `<h2 id="ticket-options">Planning Guides For This Area</h2>
  <p>Use one focused guide for the decision you are making instead of opening several booking pages at once.</p>
  <table><tr><th>What you need</th><th>Open this guide</th><th>Best for</th></tr><tr><td>Hagia Sophia entry</td><td><a class="link" href="/best-hagia-sophia-ticket/">Best Hagia Sophia ticket</a></td><td>Main upper-gallery visit</td></tr><tr><td>Hagia Sophia and Blue Mosque</td><td><a class="link" href="/hagia-sophia-vs-blue-mosque/">Two-landmark planning guide</a></td><td>Choosing the order and timing</td></tr><tr><td>Basilica Cistern</td><td><a class="link" href="/basilica-cistern-ticket-price/">Ticket price and entry guide</a></td><td>Venue price versus third-party options</td></tr><tr><td>Several paid attractions</td><td><a class="link" href="/combo-tickets/">Combo ticket guide</a></td><td>Checking inclusions before booking</td></tr><tr><td>Full Old City route</td><td><a class="link" href="#one-day-route">One-day route below</a></td><td>Sequencing the nearby landmarks</td></tr></table>`;
  return output.slice(0, start) + replacement + output.slice(tableEnd + "</table>".length);
}

function enhanceGuidesDirectory(source) {
  const seenTargets = new Set();
  let output = source.replace(/<a\s+class="card"\s+href="([^"]+)">[\s\S]*?<\/a>/g, (card, href) => {
    const path = href.split(/[?#]/, 1)[0];
    if (noindexPaths.has(path) || seenTargets.has(href)) return "";
    seenTargets.add(href);
    return card.replace('<a class="card"', '<a class="card" data-guide-card');
  });
  if (!output.includes("data-guide-tools")) {
    const controls = `<div class="guide-directory-tools" data-guide-tools>
<label for="guide-search">Find a guide</label>
<input class="guide-search" id="guide-search" type="search" inputmode="search" autocomplete="off" placeholder="Search tickets, dress code, mosaics…" data-guide-search>
<div class="guide-filter-list" aria-label="Guide categories"><button type="button" data-guide-filter="all" aria-pressed="true">All</button><button type="button" data-guide-filter="tickets" aria-pressed="false">Tickets</button><button type="button" data-guide-filter="visit" aria-pressed="false">Visit planning</button><button type="button" data-guide-filter="inside" aria-pressed="false">Inside</button><button type="button" data-guide-filter="nearby" aria-pressed="false">Nearby</button></div>
<p class="guide-result-count" role="status" aria-live="polite" data-guide-count></p>
</div>`;
    output = output.replace('<div class="grid-3">', `${controls}\n<div class="grid-3" data-guide-grid>`);
  } else {
    output = output.replace('<div class="grid-3">', '<div class="grid-3" data-guide-grid>');
  }
  return output;
}

function simplifyLocaleRootClusters(source, urlPath) {
  const routeCards = {
    "/de/": '<a class="cluster-card" href="/de/hagia-sophia-eingang-besucherroute/"><span>Besucherroute</span><h3>Eingang und Besucherroute der Hagia Sophia</h3><p>Finde den Besuchereingang und plane den Weg durch die obere Galerie vor deinem Besuch.</p></a>',
    "/fr/": '<a class="cluster-card" href="/fr/entree-parcours-visiteur-sainte-sophie/"><span>Parcours</span><h3>Entrée et parcours de visite de Sainte-Sophie</h3><p>Repérez l’entrée des visiteurs et préparez le parcours de la galerie supérieure.</p></a>',
    "/es/": '<a class="cluster-card" href="/es/entrada-recorrido-visitantes-santa-sofia/"><span>Recorrido</span><h3>Entrada y recorrido de visitantes de Santa Sofía</h3><p>Localiza la entrada de visitantes y prepara el recorrido por la galería superior.</p></a>'
  };
  const routeCard = routeCards[urlPath];
  if (!routeCard) return source;
  return source.replace(/<div class="cluster-grid">([\s\S]*?)<\/div><\/div><\/section>/, (section, cardsMarkup) => {
    const seenTargets = new Set();
    const cards = [];
    for (const match of cardsMarkup.matchAll(/<a\s+class="cluster-card"\s+href="([^"]+)">[\s\S]*?<\/a>/g)) {
      const href = match[1];
      const path = href.split(/[?#]/, 1)[0];
      if (noindexPaths.has(path) || seenTargets.has(href)) continue;
      seenTargets.add(href);
      cards.push(match[0]);
    }
    const routeHref = routeCard.match(/href="([^"]+)"/)[1];
    if (!seenTargets.has(routeHref)) cards.push(routeCard);
    return `<div class="cluster-grid">${cards.join("")}</div></div></section>`;
  });
}

const htmlFiles = collectHtmlFiles(repositoryRoot);
const seenPaths = new Set(htmlFiles.map(urlPathFor));
for (const urlPath of noindexPaths) {
  if (!seenPaths.has(urlPath)) throw new Error(`Policy URL has no HTML file: ${urlPath}`);
}

let changedFiles = 0;
let removedRails = 0;
let authorIdentities = 0;
for (const filePath of htmlFiles) {
  const urlPath = urlPathFor(filePath);
  const original = readFileSync(filePath, "utf8");
  if (consolidations.has(urlPath) && !policy.deferredConsolidations?.includes(urlPath)) continue;
  const railCount = (original.match(/\brail-cta\b/g) || []).length;
  const authorCount = (original.match(/"author":\{"@type":"Person","name":"Melike","jobTitle":"Founder & Editor"\}/g) || []).length;
  let source = replaceInternalConsolidationLinks(original);
  source = normalizeHeaderAction(source, urlPath);
  source = removeBalancedDivsByClass(source, "rail-cta");
  source = applyHreflang(source, urlPath);
  source = applyRobots(source, urlPath);
  source = addAuthorIdentity(source);
  source = addSkipLink(source, urlPath);
  source = localizeSharedInterface(source, urlPath);
  source = versionRuntimeAsset(source);
  source = addFooterLanguageLinks(source, urlPath);
  if (urlPath === "/things-to-do-near-hagia-sophia/") source = simplifyThingsToDoHub(source);
  if (urlPath === "/guides/") source = enhanceGuidesDirectory(source);
  if (urlPath === "/de/" || urlPath === "/fr/" || urlPath === "/es/") source = simplifyLocaleRootClusters(source, urlPath);
  source = source.replace(/^[ \t]+$/gm, "");
  if (source !== original) {
    writeFileSync(filePath, source);
    changedFiles += 1;
    removedRails += railCount;
    authorIdentities += authorCount;
  }
}

const sitemapPath = resolve(repositoryRoot, "sitemap.xml");
const originalSitemap = readFileSync(sitemapPath, "utf8");
let keptSitemapUrls = 0;
let removedSitemapUrls = 0;
let sitemap = originalSitemap.replace(/\s*<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g, (entry, loc) => {
  const url = new URL(loc);
  if (noindexPaths.has(url.pathname)) {
    removedSitemapUrls += 1;
    return "";
  }
  keptSitemapUrls += 1;
  return `\n  ${entry.trim()}`;
});

const sitemapDates = new Map();
for (const match of sitemap.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)) {
  const urlPath = new URL(match[1]).pathname;
  const filePath = urlPath === "/" ? resolve(repositoryRoot, "index.html") : resolve(repositoryRoot, urlPath.slice(1), "index.html");
  let source = readFileSync(filePath, "utf8");
  const schemaDates = [...source.matchAll(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/g)].map((dateMatch) => dateMatch[1]);
  const desiredDate = [match[2], ...schemaDates, ...(materiallyUpdated.has(urlPath) ? [recoveryDate] : [])].sort().at(-1);
  if (schemaDates.length) {
    source = source.replace(/("dateModified"\s*:\s*")\d{4}-\d{2}-\d{2}("?)/g, `$1${desiredDate}$2`);
    writeFileSync(filePath, source);
  }
  sitemapDates.set(urlPath, desiredDate);
}
sitemap = sitemap.replace(/(<url><loc>)([^<]+)(<\/loc><lastmod>)\d{4}-\d{2}-\d{2}(<\/lastmod><\/url>)/g, (entry, before, loc, middle, after) => {
  const urlPath = new URL(loc).pathname;
  return `${before}${loc}${middle}${sitemapDates.get(urlPath)}${after}`;
});
writeFileSync(sitemapPath, sitemap.endsWith("\n") ? sitemap : `${sitemap}\n`);

if (!keptSitemapUrls) throw new Error("Recovery policy must not produce an empty sitemap");
const consolidationResult = syncConsolidations(repositoryRoot);

console.log(`Recovery policy applied to ${changedFiles} HTML files.`);
console.log(`Index scope: ${keptSitemapUrls} sitemap URLs; ${consolidationResult.redirects} redirects; ${temporaryNoindex.size + consolidationResult.deferred} policy noindex URLs (${removedSitemapUrls} removed from this sitemap run).`);
console.log(`Template cleanup: ${removedRails} duplicate rail CTAs removed; ${authorIdentities} author identities linked.`);
