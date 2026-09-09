# Search recovery maintenance

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
