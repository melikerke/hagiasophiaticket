# Affiliate offer maintenance

`offers.json` is the source of truth for ticket products linked on the site. GetYourGuide entries record a legacy short link and expected activity ID. The Istanbul Welcome Card entry uses an explicit provider and the owner-supplied direct product URL. All entries record the destination, last product review date and known booking terms.

## Rules

- GetYourGuide links in production HTML and JSON-LD must use the registered direct `getyourguide.com` URL, never a `gyg.me` URL.
- Every GetYourGuide direct URL must contain `partner_id=UYM3DXX`, `referral_redirect=1`, and the registered `-t<ID>` activity ID.
- Istanbul Welcome Card uses `provider: "istanbul-welcome-card"` and `https://istanbulwelcomecard.com/shop/hagia-sophia-tour?ref=iti5`. Preserve that exact reviewed product and referral. It has no GetYourGuide activity ID or short URL.
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
- Istanbul Welcome Card links retain the reviewed product and exactly one `ref=iti5`;
- registered offer anchors cannot cross providers or point at relative URLs;
- affiliate anchors use the correct `data-offer-id`, `target`, and `rel` values;
- the retired tariff PDF is absent.

To verify the live GetYourGuide short links against the expected activity IDs and check that the direct Istanbul Welcome Card product is reachable:

```sh
node scripts/validate-site.mjs --redirects-only
```

The GitHub workflow runs local validation on relevant pull requests and runs both checks every Monday. A short link fails even when it still reaches GetYourGuide if it resolves to a search page, listing page, or a different `t<ID>` activity.

## Manual weekly review

Automated requests cannot reliably confirm option-level prices and terms on partner checkout pages. Once a week:

1. Open each `destinationUrl` in `offers.json` in a normal browser.
2. Confirm the provider, target name and activity ID or exact product path.
3. Select the exact option promoted on the site.
4. Check the displayed EUR price, cancellation policy, validity, ticket delivery or collection method, meeting point, security limitation, guide type, languages, and inclusions.
5. Update product cards, CTA microcopy, JSON-LD, `offers.json`, arrival guides, planner templates/logic, the downloadable visit card and analytics offer metadata together.
6. Set `checkedAt` to the review date only after the live option has been checked.
7. Run both validation commands.

If the correct product no longer exists, remove its CTA and Offer schema until a replacement affiliate link has been created and reviewed. Never silently repoint an existing offer ID to a different visitor experience.

## Email QR offer review — 9 September 2026

The owner supplied the ITI5 product URL. In separate clean browser contexts, the linked product displayed EUR 28.45 with ITI5 and EUR 29.95 without a referral. Selecting 10 September 2026 retained EUR 28.45. The product description, Includes, How It Works and Cancellation Policy were read in the rendered public page. The listing advertises an entry QR emailed after booking with no pickup, a 10-language smartphone audio app, and free cancellation up to 24 hours before arrival. No purchase was made; the final payment total and actual post-purchase email delivery were not tested.

Display EUR 28.45 as a starting price with a brief prompt to check current price and availability. At the owner’s request, keep ITI5, referral codes and referral-price mechanics out of visitor-facing copy, metadata and FAQ text. Preserve the exact referral destination and the price-check evidence in this maintenance record; do not make a universal lowest-price claim. Discount behavior was verified; commission attribution to the owner was not. Keep `hagia-sophia-entry` on the original GetYourGuide product: it remains the EUR 28 starting-price alternative requiring museum kiosk exchange. Do not inherit its audio/AR, delivery or cancellation terms for the email-QR product.

## 9 September 2026 — Topkapi and content comparison review

Rendered IWC product tabs confirmed:
- `topkapi-palace-tickets`: starting EUR 56.91, short English orientation plus smartphone audio, hosted entry, Harem excluded, cancellation up to 24 hours.
- `istanbul-vip-combo-ticket`: EUR 122.55, three main sights, Harem explicitly excluded, 48-hour cancellation.
- `istanbul-saver-combo-ticket`: EUR 128.25, the three main sights plus 90-minute cruise and 3GB eSIM, Harem excluded, 48-hour cancellation. The reviewed instructions list 12:00 and 15:30 cruise departures; final confirmation controls the pier and sailing.
- `bosphorus-cruise`: EUR 9.45, 90-minute standalone cruise with five-language audio; 24-hour cancellation. Do not assume the same pier, departure or audio as the combo cruise.

The existing reviewed Hagia Sophia EUR 28.45 and Basilica Cistern EUR 47.41 prices give a three-sight standalone sum of EUR 132.77 with Topkapi; Old City Combo is EUR 10.22 below those starting prices. This comparison excludes Harem across both sides. A two-sight standalone sum is EUR 75.86, and a third sight is not silently added to that selection. These are adult starting-price examples, not completed purchase tests or verified live availability.
