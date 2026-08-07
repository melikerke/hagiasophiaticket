#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const registryPath = resolve(repositoryRoot, "offers.json");
const redirectsOnly = process.argv.includes("--redirects-only");
const supportedArguments = new Set(["--redirects-only"]);
const unknownArguments = process.argv.slice(2).filter((argument) => !supportedArguments.has(argument));

if (unknownArguments.length) {
  console.error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
  process.exit(2);
}

const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function decodeAttribute(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&")
    .replace(/&#x0*26;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .trim();
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function relativePath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    addError(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

const registry = readJson(registryPath, "offers.json");
if (!registry) finish();

const partnerId = registry?.affiliate?.partnerId;
const referralRedirect = registry?.affiliate?.referralRedirect;
const offerEntries = Object.entries(registry?.offers || {});
const offersByActivityId = new Map();
const offersByShortCode = new Map();

if (registry?.schemaVersion !== 1) addError("offers.json: schemaVersion must be 1.");
if (!partnerId) addError("offers.json: affiliate.partnerId is required.");
if (referralRedirect !== "1") addError('offers.json: affiliate.referralRedirect must be the string "1".');
if (!offerEntries.length) addError("offers.json: at least one offer is required.");

function activityIdFromUrl(url) {
  const match = url.pathname.match(/-t(\d+)(?:\/|$)/i);
  return match ? match[1] : null;
}

function isGetYourGuideHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "getyourguide.com" || host.endsWith(".getyourguide.com");
}

for (const [offerId, offer] of offerEntries) {
  const prefix = `offers.json: offers.${offerId}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(offerId)) {
    addError(`${prefix}: offer ID must be lowercase kebab-case.`);
  }
  if (!offer || typeof offer !== "object" || Array.isArray(offer)) {
    addError(`${prefix}: offer must be an object.`);
    continue;
  }
  if (!offer.name || typeof offer.name !== "string") addError(`${prefix}.name is required.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(offer.checkedAt || "")) {
    addError(`${prefix}.checkedAt must use YYYY-MM-DD.`);
  } else if (Number.isNaN(Date.parse(`${offer.checkedAt}T00:00:00Z`))) {
    addError(`${prefix}.checkedAt is not a real calendar date.`);
  }
  if (!/^\d+$/.test(String(offer.expectedActivityId || ""))) {
    addError(`${prefix}.expectedActivityId must contain digits only.`);
  } else if (offersByActivityId.has(String(offer.expectedActivityId))) {
    addError(`${prefix}: duplicate activity ID ${offer.expectedActivityId}.`);
  } else {
    offersByActivityId.set(String(offer.expectedActivityId), offerId);
  }

  const shortMatch = String(offer.shortUrl || "").match(/^https:\/\/gyg\.me\/([A-Za-z0-9]+)$/);
  if (!shortMatch) {
    addError(`${prefix}.shortUrl must be a canonical https://gyg.me/<code> URL.`);
  } else if (offersByShortCode.has(shortMatch[1])) {
    addError(`${prefix}: duplicate short-link code ${shortMatch[1]}.`);
  } else {
    offersByShortCode.set(shortMatch[1], offerId);
  }

  let destination;
  try {
    destination = new URL(offer.destinationUrl);
  } catch {
    addError(`${prefix}.destinationUrl is not a valid absolute URL.`);
  }
  if (destination) {
    if (destination.protocol !== "https:" || !isGetYourGuideHost(destination.hostname)) {
      addError(`${prefix}.destinationUrl must use HTTPS on getyourguide.com.`);
    }
    const destinationActivityId = activityIdFromUrl(destination);
    if (destinationActivityId !== String(offer.expectedActivityId)) {
      addError(`${prefix}.destinationUrl must contain -t${offer.expectedActivityId}.`);
    }
    if (destination.searchParams.get("partner_id") !== partnerId) {
      addError(`${prefix}.destinationUrl must preserve partner_id=${partnerId}.`);
    }
    if (destination.searchParams.get("referral_redirect") !== referralRedirect) {
      addError(`${prefix}.destinationUrl must preserve referral_redirect=${referralRedirect}.`);
    }
  }

  const terms = offer.terms;
  if (!terms || typeof terms !== "object" || Array.isArray(terms)) {
    addError(`${prefix}.terms must be an object.`);
  } else {
    for (const field of ["cancellation", "fulfillment", "security", "validity"]) {
      if (!terms[field] || typeof terms[field] !== "string") addError(`${prefix}.terms.${field} is required.`);
    }
    if (!Array.isArray(terms.notes)) addError(`${prefix}.terms.notes must be an array.`);
  }
}

if (redirectsOnly) {
  await validateRemoteRedirects();
  finish("Affiliate redirect validation passed.");
}

const excludedDirectories = new Set([".git", "node_modules"]);

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(path);
  }
  return files;
}

const htmlFiles = collectHtmlFiles(repositoryRoot).sort();
const siteHosts = new Set(["hagiasophiaticket.com", "www.hagiasophiaticket.com"]);
const fileContentCache = new Map();
const idCache = new Map();
const seenActivityIds = new Set();
let affiliateUrlCount = 0;
let jsonLdCount = 0;

function contentFor(path) {
  if (!fileContentCache.has(path)) fileContentCache.set(path, readFileSync(path, "utf8"));
  return fileContentCache.get(path);
}

function idsFor(path) {
  if (idCache.has(path)) return idCache.get(path);
  const ids = new Set();
  if (extname(path).toLowerCase() === ".html") {
    const source = contentFor(path);
    const pattern = /\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    for (const match of source.matchAll(pattern)) ids.add(decodeAttribute(match[1] ?? match[2] ?? match[3]));
  }
  idCache.set(path, ids);
  return ids;
}

function attributeFromTag(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return match ? decodeAttribute(match[1] ?? match[2] ?? match[3]) : null;
}

function validateAffiliateUrl(rawUrl, context) {
  const decoded = decodeAttribute(rawUrl);
  let url;
  try {
    url = new URL(decoded);
  } catch {
    addError(`${context}: malformed GetYourGuide URL: ${rawUrl}`);
    return null;
  }
  if (url.protocol !== "https:" || !isGetYourGuideHost(url.hostname)) {
    addError(`${context}: affiliate URL must use HTTPS on getyourguide.com.`);
    return null;
  }
  const activityId = activityIdFromUrl(url);
  if (!activityId) {
    addError(`${context}: affiliate URL must be a direct activity URL containing -t<ID>, not a search or listing page.`);
    return null;
  }
  const offerId = offersByActivityId.get(activityId);
  if (!offerId) {
    addError(`${context}: unknown affiliate activity ID ${activityId}; add it to offers.json first.`);
  } else {
    seenActivityIds.add(activityId);
  }
  if (url.searchParams.get("partner_id") !== partnerId) {
    addError(`${context}: affiliate URL must preserve partner_id=${partnerId}.`);
  }
  if (url.searchParams.get("referral_redirect") !== referralRedirect) {
    addError(`${context}: affiliate URL must preserve referral_redirect=${referralRedirect}.`);
  }
  affiliateUrlCount += 1;
  return offerId || null;
}

function internalTargetFor(rawReference, sourceFile) {
  const reference = decodeAttribute(rawReference);
  if (!reference || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(reference)) return null;

  let pathname;
  let fragment = "";
  if (/^(?:https?:)?\/\//i.test(reference)) {
    let url;
    try {
      url = new URL(reference, "https://hagiasophiaticket.com/");
    } catch {
      return { error: `malformed URL ${reference}` };
    }
    if (!siteHosts.has(url.hostname.toLowerCase())) return null;
    pathname = url.pathname;
    fragment = url.hash.slice(1);
  } else {
    const hashIndex = reference.indexOf("#");
    const beforeHash = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
    fragment = hashIndex >= 0 ? reference.slice(hashIndex + 1) : "";
    pathname = beforeHash.split("?", 1)[0];
  }

  try {
    pathname = decodeURIComponent(pathname);
    fragment = decodeURIComponent(fragment);
  } catch {
    return { error: `invalid percent-encoding in ${reference}` };
  }

  let target = pathname.startsWith("/")
    ? resolve(repositoryRoot, `.${pathname}`)
    : pathname
      ? resolve(dirname(sourceFile), pathname)
      : sourceFile;

  const outsidePath = relative(repositoryRoot, target);
  if (outsidePath === ".." || outsidePath.startsWith(`..${sep}`)) {
    return { error: `reference escapes the repository root: ${reference}` };
  }

  try {
    if (statSync(target).isDirectory()) target = resolve(target, "index.html");
  } catch {
    if (pathname.endsWith("/")) target = resolve(target, "index.html");
  }
  return { target, fragment, reference };
}

function validateInternalReference(rawReference, sourceFile, source, index, kind) {
  const resolved = internalTargetFor(rawReference, sourceFile);
  if (!resolved) return;
  const context = `${relativePath(sourceFile)}:${lineNumberAt(source, index)}`;
  if (resolved.error) {
    addError(`${context}: ${resolved.error}`);
    return;
  }
  try {
    if (!statSync(resolved.target).isFile()) throw new Error("not a file");
  } catch {
    addError(`${context}: broken internal ${kind} ${resolved.reference} (expected ${relativePath(resolved.target)}).`);
    return;
  }
  if (resolved.fragment && extname(resolved.target).toLowerCase() === ".html") {
    if (!idsFor(resolved.target).has(resolved.fragment)) {
      addError(`${context}: missing fragment #${resolved.fragment} in ${relativePath(resolved.target)}.`);
    }
  }
}

function walkJsonLd(value, context) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkJsonLd(item, `${context}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.includes("Offer") && typeof value.url === "string") {
    if (value.url.includes("gyg.me/")) {
      addError(`${context}.url: legacy gyg.me URLs are forbidden in JSON-LD.`);
    } else {
      try {
        const url = new URL(decodeAttribute(value.url));
        if (isGetYourGuideHost(url.hostname)) validateAffiliateUrl(value.url, `${context}.url`);
      } catch {
        addError(`${context}.url: malformed Offer URL ${value.url}`);
      }
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "url" && types.includes("Offer")) continue;
    walkJsonLd(child, `${context}.${key}`);
  }
}

for (const htmlFile of htmlFiles) {
  const source = contentFor(htmlFile);
  const fileLabel = relativePath(htmlFile);

  const legacyMatches = [...source.matchAll(/(?:https?:)?\/\/(?:www\.)?gyg\.me\/([A-Za-z0-9]+)/gi)];
  if (legacyMatches.length) {
    const codes = [...new Set(legacyMatches.map((match) => match[1]))].join(", ");
    addError(`${fileLabel}: contains ${legacyMatches.length} legacy gyg.me URL(s) (${codes}); use registered direct destination URLs.`);
  }

  if (/https?:\/\/dosim\.ktb\.gov\.tr\/Eklenti\/127458(?:%2c|,)ayasofyapdf\.pdf(?:\?0=)?/i.test(source)) {
    addError(`${fileLabel}: contains a retired 127458 official tariff PDF URL; use the current DOSIM tariff link.`);
  }

  const directUrls = new Set(source.match(/https:\/\/(?:www\.)?getyourguide\.com\/[^"'<>\\\s]+/gi) || []);
  for (const directUrl of directUrls) validateAffiliateUrl(directUrl, fileLabel);

  const anchorPattern = /<a\b[^>]*>/gi;
  for (const match of source.matchAll(anchorPattern)) {
    const tag = match[0];
    const href = attributeFromTag(tag, "href");
    const dataOfferId = attributeFromTag(tag, "data-offer-id");
    if (dataOfferId && !registry.offers[dataOfferId]) {
      addError(`${fileLabel}:${lineNumberAt(source, match.index)}: unknown data-offer-id="${dataOfferId}".`);
    }
    if (!href || href.includes("gyg.me/")) continue;
    let url;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!isGetYourGuideHost(url.hostname)) continue;
    const context = `${fileLabel}:${lineNumberAt(source, match.index)}`;
    const matchedOfferId = validateAffiliateUrl(href, context);
    if (!dataOfferId) {
      addError(`${context}: direct affiliate anchors require data-offer-id.`);
    } else if (matchedOfferId && dataOfferId !== matchedOfferId) {
      addError(`${context}: data-offer-id="${dataOfferId}" points to ${matchedOfferId}.`);
    }
    if (attributeFromTag(tag, "target") !== "_blank") {
      addError(`${context}: direct affiliate anchors require target="_blank".`);
    }
    const relTokens = new Set((attributeFromTag(tag, "rel") || "").toLowerCase().split(/\s+/).filter(Boolean));
    for (const requiredToken of ["noopener", "sponsored"]) {
      if (!relTokens.has(requiredToken)) addError(`${context}: affiliate anchor rel must include ${requiredToken}.`);
    }
  }

  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of source.matchAll(scriptPattern)) {
    const type = attributeFromTag(`<script ${match[1]}>`, "type");
    if ((type || "").toLowerCase() !== "application/ld+json") continue;
    jsonLdCount += 1;
    try {
      const parsed = JSON.parse(match[2]);
      walkJsonLd(parsed, `${fileLabel}:jsonld#${jsonLdCount}`);
    } catch (error) {
      addError(`${fileLabel}:${lineNumberAt(source, match.index)}: invalid JSON-LD: ${error.message}`);
    }
  }

  const tagPattern = /<[A-Za-z][^>]*>/g;
  for (const tagMatch of source.matchAll(tagPattern)) {
    const tag = tagMatch[0];
    const attributePattern = /(?:^|\s)(href|src|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    for (const match of tag.matchAll(attributePattern)) {
      const reference = match[2] ?? match[3] ?? match[4];
      validateInternalReference(reference, htmlFile, source, tagMatch.index + match.index, match[1].toLowerCase());
    }

    const srcsetPattern = /(?:^|\s)srcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    for (const match of tag.matchAll(srcsetPattern)) {
      const value = match[1] ?? match[2] ?? "";
      for (const candidate of value.split(",")) {
        const reference = candidate.trim().split(/\s+/, 1)[0];
        if (reference) validateInternalReference(reference, htmlFile, source, tagMatch.index + match.index, "srcset resource");
      }
    }
  }
}

for (const [activityId, offerId] of offersByActivityId) {
  if (!seenActivityIds.has(activityId)) addWarning(`offers.json: ${offerId} (t${activityId}) is not referenced by a direct URL in production HTML.`);
}

finish(`Validated ${htmlFiles.length} HTML files, ${jsonLdCount} JSON-LD blocks, and ${affiliateUrlCount} direct affiliate URL occurrence(s).`);

async function validateRemoteRedirects() {
  for (const [offerId, offer] of offerEntries) {
    let response;
    try {
      response = await fetch(offer.shortUrl, {
        method: "HEAD",
        redirect: "manual",
        headers: { "user-agent": "HagiaSophiaTicket offer validator/1.0" }
      });
      if (response.status === 405) {
        response = await fetch(offer.shortUrl, {
          method: "GET",
          redirect: "manual",
          headers: { "user-agent": "HagiaSophiaTicket offer validator/1.0" }
        });
      }
    } catch (error) {
      addError(`${offerId}: could not request ${offer.shortUrl}: ${error.message}`);
      continue;
    }

    if (response.status < 300 || response.status >= 400) {
      addError(`${offerId}: expected a redirect from ${offer.shortUrl}, received HTTP ${response.status}.`);
      continue;
    }
    const location = response.headers.get("location");
    if (!location) {
      addError(`${offerId}: HTTP ${response.status} response has no Location header.`);
      continue;
    }
    let destination;
    try {
      destination = new URL(location, offer.shortUrl);
    } catch {
      addError(`${offerId}: invalid redirect destination ${location}.`);
      continue;
    }
    if (!isGetYourGuideHost(destination.hostname)) {
      addError(`${offerId}: short link redirects outside GetYourGuide: ${destination.href}`);
      continue;
    }
    const activityId = activityIdFromUrl(destination);
    if (!activityId) {
      addError(`${offerId}: short link redirects to a search/listing URL without -t<ID>: ${destination.href}`);
    } else if (activityId !== String(offer.expectedActivityId)) {
      addError(`${offerId}: expected t${offer.expectedActivityId}, received t${activityId}: ${destination.href}`);
    } else {
      console.log(`ok ${offerId}: ${offer.shortUrl} -> t${activityId}`);
    }
  }
}

function finish(successMessage = "Validation passed.") {
  warnings.sort().forEach((warning) => console.warn(`warning: ${warning}`));
  if (errors.length) {
    console.error(`\nValidation failed with ${errors.length} error(s):`);
    errors.sort().forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  console.log(successMessage);
  process.exit(0);
}
