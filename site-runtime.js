(function () {
  "use strict";

  var language = (document.documentElement.lang || "en").slice(0, 2);
  var copy = {
    en: { title: "Your privacy choices", text: "We use optional analytics to understand visits and ticket clicks. Affiliate partners may pay us a commission at no extra cost to you.", accept: "Accept analytics", reject: "Reject", policy: "Cookie Policy" },
    de: { title: "Deine Datenschutzauswahl", text: "Optionale Analytics helfen uns, Besuche und Ticketklicks zu verstehen. Affiliate-Partner koennen uns ohne Mehrkosten fuer dich eine Provision zahlen.", accept: "Analytics akzeptieren", reject: "Ablehnen", policy: "Cookie-Richtlinie" },
    fr: { title: "Vos choix de confidentialite", text: "Les statistiques facultatives nous aident a comprendre les visites et les clics vers les billets. Les partenaires peuvent nous verser une commission sans cout supplementaire.", accept: "Accepter Analytics", reject: "Refuser", policy: "Politique de cookies" },
    es: { title: "Tus opciones de privacidad", text: "Las estadisticas opcionales nos ayudan a entender las visitas y los clics de entradas. Los socios pueden pagarnos una comision sin coste adicional.", accept: "Aceptar Analytics", reject: "Rechazar", policy: "Politica de cookies" }
  }[language] || null;
  if (!copy) copy = { title: "Your privacy choices", text: "We use optional analytics to understand visits and ticket clicks.", accept: "Accept analytics", reject: "Reject", policy: "Cookie Policy" };

  var cookieRoutes = { en: "/cookie-policy/", de: "/de/cookie-richtlinie/", fr: "/fr/politique-cookies/", es: "/es/politica-cookies/" };
  var offers = {
    "9TxDoMwH": { product: "Hagia Sophia Entry Ticket", price: 28 },
    "Y5QliR06": { product: "Hagia Sophia and Blue Mosque Audio Guide", price: 30.49 },
    "aumuVrOk": { product: "Hagia Sophia and Basilica Cistern", price: 85 },
    "fI4B3R9A": { product: "Hagia Sophia, Basilica Cistern and Topkapi Palace", price: 147 }
  };

  function updateConsent(value) {
    try { localStorage.setItem("hst_consent", value); } catch (e) {}
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: value === "granted" ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
  }

  function banner() {
    var old = document.getElementById("cookie-consent");
    if (old) old.remove();
    var node = document.createElement("section");
    node.id = "cookie-consent";
    node.className = "cookie-consent";
    node.setAttribute("aria-label", copy.title);
    node.innerHTML = '<div class="cookie-copy"><strong>' + copy.title + '</strong><p>' + copy.text + ' <a href="' + (cookieRoutes[language] || cookieRoutes.en) + '">' + copy.policy + '</a></p></div><div class="cookie-actions"><button type="button" class="cookie-reject">' + copy.reject + '</button><button type="button" class="cookie-accept">' + copy.accept + '</button></div>';
    document.body.appendChild(node);
    node.querySelector(".cookie-accept").addEventListener("click", function () { updateConsent("granted"); node.remove(); });
    node.querySelector(".cookie-reject").addEventListener("click", function () { updateConsent("denied"); node.remove(); });
  }

  function readConsent() {
    try { return localStorage.getItem("hst_consent"); } catch (e) { return null; }
  }

  function placement(link) {
    if (link.closest("header")) return "header";
    if (link.closest(".buybar")) return "sticky_buy_bar";
    if (link.closest(".combo-card")) return "combo_card";
    if (link.closest("#combo-tickets")) return "homepage_combo";
    if (link.closest(".rail-cta")) return "article_sidebar";
    if (link.closest(".cta-band")) return "article_inline";
    if (link.closest(".booking-card,.book-card")) return "booking_widget";
    if (link.closest("footer")) return "footer";
    return "content";
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[rel~="sponsored"]');
    if (!link) return;
    var token = Object.keys(offers).find(function (key) { return link.href.indexOf(key) !== -1; });
    var offer = token ? offers[token] : { product: "Affiliate ticket", price: 0 };
    if (typeof window.gtag === "function") {
      window.gtag("event", "affiliate_click", {
        product: offer.product,
        price: offer.price,
        value: offer.price,
        currency: "EUR",
        language: language,
        page: location.pathname,
        button_position: placement(link),
        transport_type: "beacon"
      });
    }
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-cookie-settings]")) return;
    event.preventDefault();
    banner();
  });

  if (!readConsent()) banner();
})();
