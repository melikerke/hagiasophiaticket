# Affiliate offer maintenance

`offers.json` is the source of truth for every GetYourGuide activity used on the site. It records the legacy short link, the direct affiliate destination, the expected GetYourGuide activity ID, the last manual review date, and known booking terms.

## Rules

- Production HTML and JSON-LD must use the registered direct `getyourguide.com` URL, never a `gyg.me` URL.
- Every direct URL must contain `partner_id=UYM3DXX`, `referral_redirect=1`, and the registered `-t<ID>` activity ID.
- Every affiliate anchor must include the matching `data-offer-id`, `target="_blank"`, and `rel="noopener sponsored"`.
- Product names, inclusions, fulfillment instructions, cancellation terms, visible prices, and structured data must describe the same selected activity option.
- Do not describe ticket-line access as skipping mandatory security.
- Do not publish a crossed-out comparison price, `InStock`, cancellation promise, language count, guide type, Harem inclusion, or ticket-delivery claim without a dated source check.
- For the mosque visitor-gallery tariff, use `https://agency.demmuseums.com/Faq/Index`. The DOSIM `142675` PDF covers the separate Hagia Sophia History and Experience Museum; it must not be cited as the mosque-gallery tariff.
- Do not restore either retired `127458` tariff URL form (`127458,ayasofyapdf.pdf` or `127458%2Cayasofyapdf.pdf?0=`); both now return 404.

## Local validation

Run this before committing any HTML, structured-data, offer, or link change:

```sh
node scripts/validate-site.mjs
```

The validator checks:

- internal page, asset, and fragment targets;
- every JSON-LD block parses as JSON;
- no production HTML or JSON-LD contains legacy `gyg.me` URLs;
- direct GetYourGuide URLs retain affiliate parameters and a known activity ID;
- affiliate anchors use the correct `data-offer-id`, `target`, and `rel` values;
- the retired tariff PDF is absent.

To verify the live short links against the expected activity IDs:

```sh
node scripts/validate-site.mjs --redirects-only
```

The GitHub workflow runs local validation on relevant pull requests and runs both checks every Monday. A short link fails even when it still reaches GetYourGuide if it resolves to a search page, listing page, or a different `t<ID>` activity.

## Manual weekly review

Automated requests cannot reliably confirm option-level prices and terms on partner checkout pages. Once a week:

1. Open each `destinationUrl` in `offers.json` in a normal browser.
2. Confirm the target name and activity ID.
3. Select the exact option promoted on the site.
4. Check the displayed EUR price, cancellation policy, validity, ticket delivery or collection method, meeting point, security limitation, guide type, languages, and inclusions.
5. Update product cards, CTA microcopy, JSON-LD, and `offers.json` together.
6. Set `checkedAt` to the review date only after the live option has been checked.
7. Run both validation commands.

If the correct product no longer exists, remove its CTA and Offer schema until a replacement affiliate link has been created and reviewed. Never silently repoint an existing offer ID to a different visitor experience.
