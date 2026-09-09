# Search recovery maintenance

## Primary offer replaced with emailed entry QR, September 9, 2026

The owner subsequently supplied the Istanbul Welcome Card ITI5 product link and
chose its EUR 28.45 emailed entry QR as the primary recommendation. This supersedes
the EUR 28 homepage positioning below. EUR 28 remains an explicitly described
kiosk-collection alternative on its original GetYourGuide product ID. See
OFFER-MAINTENANCE.md for the browser review and referral-price conditions.
Homepage, English decision/price/arrival guides, the planner and the pocket PDF
now distinguish the two delivery methods. No market-wide lowest-price claim or
live inventory schema was added.


## Owner-supplied starting price, September 9, 2026

The owner subsequently instructed us to display the €28 entry starting price.
It is restored in the homepage entry CTA, entry card, comparison, closing CTA
and mobile bar, with a matching entry in the English price guide. This is an
owner-supplied starting price, not a newly verified checkout quote. The full
review dates in `offers.json` remain unchanged. No new Offer price schema or
claim of being the cheapest seller on the internet is added. Other packages'
previous starting prices remain removed. The final price depends on the date
and option selected on GetYourGuide.

## Homepage review, September 9, 2026

The homepage now separates the date of a complete offer review (August 7) from
current page edits. Historical review information is available under the ticket
comparison. The August 7 review badge and unverified reseller starting prices
were removed from the main page; `offers.json` review dates were not advanced.
The provider listing was readable through web retrieval, but date-specific
options could not be checked in the browser. No new price or complete offer
verification is claimed.

The first screen offers both provider availability and an on-page comparison.
Repeated guide cards were consolidated into the existing visitor section; distinct
guide links remain available. Ticket images and the mobile hero were shortened.

The DOSIM `142675` PDF is for the separate History and Experience Museum, not the
mosque gallery. Nineteen gallery-tariff citations now point to
https://agency.demmuseums.com/Faq/Index, which identifies the mosque visitor-area
tariff and child eligibility. The English gallery-price guide was revised to
separate the two attractions and remove its stale reseller Offer price. The
operator FAQ's wholesale agency conditions must not be applied to retail
reseller tickets. Other page dates remain unchanged for this citation correction.

## Consolidated URLs

`recovery-index-policy.json` is the source of truth. The September 9, 2026
implementation turns 50 previously noindexed consolidation sources into immediate
meta-refresh redirects with the destination canonical and a visible fallback link.
GitHub Pages does not offer per-path server redirect configuration; these are HTML
redirects, not HTTP 301 responses. Google documents instant meta refresh as a
permanent redirect: https://developers.google.com/search/docs/crawling-indexing/301-redirects.

Run `node scripts/sync-consolidations.mjs` after changing the mapping. The entire
plan is validated before writes. Targets must exist, be self-canonical and indexable,
appear in the sitemap, and not redirect elsewhere. Keep existing redirect URLs
available; removing their files would turn old incoming links into 404s.

Four explicitly deferred sources point to the temporarily excluded Topkapi and
Sultanahmet tour pages. They retain their existing noindex content until their
destination content is reviewed. Do not redirect them to a noindex destination.
The sitemap still contains 62 destination pages; this release does not broaden the
indexing scope. Temporary exclusions are not a claim that Google penalized a page.

## Content dates and sources

The English Basilica Cistern price and hours guides and Hagia Sophia / Blue Mosque
comparison were materially revised September 9, 2026. Their visible update dates,
Article dateModified and sitemap lastmod agree. Do not update dates sitewide just
because a deployment or policy script ran.

Sources checked for this revision:

- https://kultur.istanbul/yerebatan-sarnici-muzesi/ — operator hours, tariff,
  venue audio option and accepted entrance payment methods.
- https://www.tursab.org.tr/announcements/announcement-on-current-ticket-prices-for-the-basilica-cistern
  — February 3, 2026 admission announcement; this publication date is stated in the guide.
- https://www.sultanahmetcami.org/sayfa.php?s=ziyaretci-rehberi — Blue Mosque
  visitor hours, seasonal and Friday access, prayer closures and free visits.
- https://basin.ktb.gov.tr/TR-364045/ayasofya-i-kebir-camiinde-yeni-duzenleme-15-ocakta-basliyor.html
  — January 12, 2024 gallery-route announcement, not a current-price source.
- https://goturkiye.com/istanbul/blue-mosque — architectural context.

The direct yerebatan.com pages failed to load during this review; the accessible
operator page above was used. Do not claim that every venue page was checked.
No live reseller price or terms were reverified; the changed guides point to the
provider for current checkout details. `offers.json` check dates remain unchanged.
Walking buffers, durations and itinerary order are explicitly planning estimates,
not claims of a recent on-site visit or measured queue times.

## Before publishing

```
node --test scripts/consolidations.test.mjs
node scripts/validate-site.mjs
```

Also check the edited pages on mobile and desktop, and test that old URLs actually
reach their destination. The validator checks local links, fragment identifiers,
affiliate attribution, structured data, sitemap dates, canonical and hreflang
consistency, and the consolidation policy. The unused t713788 registry warning is
expected: its last HTML references were on retired consolidation source pages.
Keep the registry entry for historical offer tracking.

## Assessing results

Compare equal, completed periods in Search Console. The supplied export ends
September 6: August 4–17 had 1,785 impressions / 12 clicks; August 22–September 4
had 7 impressions / 0 clicks. Record this release date before comparing later data.
Track the three edited destination pages, indexing status and impressions before
judging click-through rate at very low volume. Changes cannot guarantee recovery
or establish which Google system caused the original loss. Avoid another broad
URL or noindex migration while these changes are being assessed.

## 9 September 2026: visit-planning tools

- `/plan-your-visit/` combines the ticket selector, a schematic entrance/collection map, time-based itineraries, landmark photographs and a downloadable pocket guide. It is self-canonical; shared preference query strings canonicalize to the same page. Added the page to the sitemap and linked it from the homepage, guide directory, entrance guide and itinerary.
- `visit-planner.mjs` owns preference validation, recommendation rules and route estimates. `visit-tools.js` renders existing offer templates and shareable applied preferences. No account, new tracker, location request or external map script is required. Affiliate links use the existing consent-aware click handler.
- Offer templates in the new HTML use `offers.json` destinations and are tested against the registry. Preserve the owner-supplied entry starting price of EUR 28. It is not a live quote or a lowest-price guarantee. Full option terms retain their actual 7 August review date. Only the main listing's collection instructions and the cited visitor sources were rechecked on 9 September.
- Route durations are editorial estimates. Tuesday removes Topkapi from the full-day route; Friday prompts explain the mosque restrictions. Holiday, temporary and live booking availability checks are not automatic. Routes honor selected paid sights; guided bookings explicitly follow the provider's itinerary.
- The map is an orientation sketch, not surveyed navigation. Museum collection, the Hagia Sophia visitor area and other landmarks are separate; Google Maps links route to named locations, with on-site signage required for the final entrance approach.
- The photo guide uses existing local assets and makes no claim that they depict current entrance arrangements. Three owner-provided Shutterstock downloads were integrated on 9 September: the planner hero, cistern photo and Medusa detail. Exact current entrance/kiosk photographs are still unavailable; no unlicensed Shutterstock preview is deployed.
- `scripts/build-visit-card.py` regenerates `output/pdf/hagia-sophia-visit-card.pdf` with ReportLab. The general pocket PDF is distinct from the browser's personalized print view. Inspect a rendered PDF after changing its content or layout.
- Validation: `node scripts/validate-site.mjs` and `node --test scripts/*.test.mjs`. Browser QA covers 320/390/768/1440 widths, keyboard access, applied preference sharing, JS-disabled fallback, map links, print layout and download. Source restrictions are linked from the page.

## 9 September 2026: photo orientation map

The planner’s arrival map now uses four existing landmark photographs as native linked markers, retaining the five `map-*` fragment IDs. The Ayasofya arrival card appears first; the museum marker stays conditional on kiosk-based tickets. The map remains a schematic, not surveyed navigation, and explicitly distinguishes landmark photos from current entrance doors. No external map scripts or new photo downloads were added. Marker navigation works with a keyboard and with JavaScript disabled.
