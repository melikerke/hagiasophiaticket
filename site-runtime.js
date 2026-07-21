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
    "x9grgdpi": { product: "English Basilica Cistern Fast-Track Guided Tour", price: 57.47 },
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

  function setupMobileMenu() {
    var navShell = document.querySelector("header .nav");
    if (!navShell || navShell.getAttribute("data-menu-ready") === "true") return;
    var menu = navShell.querySelector("nav");
    if (!menu) return;
    var button = navShell.querySelector(".mobile-menu-toggle");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "mobile-menu-toggle";
      button.innerHTML = "<span></span><span></span><span></span>";
      navShell.insertBefore(button, menu);
    }
    button.setAttribute("aria-label", "Open menu");
    button.setAttribute("aria-expanded", "false");
    navShell.setAttribute("data-menu-ready", "true");
    button.addEventListener("click", function () {
      var open = navShell.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!navShell.classList.contains("menu-open") || navShell.contains(event.target)) return;
      navShell.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
    });
    menu.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      navShell.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function setupLanguageMenu() {
    var control = document.querySelector(".language-control");
    if (!control || control.classList.contains("enhanced")) return;
    var select = control.querySelector(".language-switcher");
    if (!select) return;
    var selected = select.options[select.selectedIndex] || select.options[0];
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lang-trigger";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<span class="lang-current">' + selected.textContent.trim() + '</span><span aria-hidden="true">▾</span>';
    var list = document.createElement("div");
    list.className = "lang-list";
    list.setAttribute("role", "menu");
    Array.prototype.forEach.call(select.options, function (option) {
      var link = document.createElement("a");
      link.href = option.value;
      link.textContent = option.textContent.trim();
      link.setAttribute("role", "menuitem");
      if (option.selected) link.setAttribute("aria-current", "true");
      list.appendChild(link);
    });
    control.classList.add("enhanced");
    control.appendChild(button);
    control.appendChild(list);
    button.addEventListener("click", function () {
      var open = control.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!control.classList.contains("open") || control.contains(event.target)) return;
      control.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  }

  function setupMobileToc() {
    var article = document.querySelector(".article-wrap .article");
    var toc = document.querySelector(".article-rail .toc ol");
    if (!article || !toc || article.querySelector(".mobile-toc")) return;
    var labels = {
      en: "Contents",
      de: "Inhalt",
      fr: "Sommaire",
      es: "Contenido"
    };
    var details = document.createElement("details");
    details.className = "mobile-toc";
    details.innerHTML = "<summary>" + (labels[language] || labels.en) + "</summary>" + toc.outerHTML;
    var anchor = article.querySelector(".meta-row");
    if (anchor && anchor.nextSibling) {
      article.insertBefore(details, anchor.nextSibling);
    } else {
      article.insertBefore(details, article.firstChild);
    }
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
    var link = event.target.closest("a[data-social-platform]");
    if (!link || typeof window.gtag !== "function") return;
    window.gtag("event", "social_click", {
      platform: link.getAttribute("data-social-platform"),
      language: language,
      page: location.pathname,
      button_position: "footer",
      transport_type: "beacon"
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest("[data-cookie-settings]")) return;
    event.preventDefault();
    banner();
  });

  document.addEventListener("change", function (event) {
    var select = event.target.closest(".language-switcher");
    if (!select || !select.value) return;
    window.location.assign(select.value);
  });

  if (!readConsent()) banner();
  setupMobileMenu();
  setupLanguageMenu();
  setupMobileToc();
})();
