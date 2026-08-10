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
  var interfaceCopy = {
    en: { openMenu: "Open menu", closeMenu: "Close menu", languageMenu: "Choose language" },
    de: { openMenu: "Menue oeffnen", closeMenu: "Menue schliessen", languageMenu: "Sprache waehlen" },
    fr: { openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", languageMenu: "Choisir la langue" },
    es: { openMenu: "Abrir el menu", closeMenu: "Cerrar el menu", languageMenu: "Elegir idioma" }
  }[language] || { openMenu: "Open menu", closeMenu: "Close menu", languageMenu: "Choose language" };
  var analyticsId = "G-2YB8YFXEVD";
  var analyticsConsent = null;
  var analyticsLoading = false;
  var offers = {
    "9TxDoMwH": { id: "t709111", product: "Hagia Sophia Entry Ticket", price: 28 },
    "Y5QliR06": { id: "t597339", product: "Hagia Sophia Ticket and Blue Mosque Audio Guide", price: 30.49 },
    "x9grgdpi": { id: "t523484", product: "Basilica Cistern Fast-Track Entry and Audio Guide", price: 57.47 },
    "wn0Aj9s6": { id: "t1231414", product: "Topkapi Palace Entry Self-Guided Experience", price: 69.95 },
    "aumuVrOk": { id: "t713788", product: "Hagia Sophia and Basilica Cistern Combo", price: 85 },
    "fI4B3R9A": { id: "t948206", product: "Hagia Sophia, Basilica Cistern and Topkapi Palace Combo", price: 142 },
    "n4qq65P8": { id: "t794467", product: "Hagia Sophia and Blue Mosque Small-Group Guided Tour", price: 54.28 },
    "SmBh7lVw": { id: "t127010", product: "Topkapi Palace and Harem Guided Tour", price: 107.10 },
    "k8iuljcs": { id: "t1051517", product: "Hagia Sophia, Blue Mosque and Basilica Cistern Tour", price: 122.55 },
    "IDOlO7yX": { id: "t176826", product: "Small-Group Topkapi Palace and Hagia Sophia Tour", price: 234 }
  };

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== "function") {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
  }

  function consentSettings(value) {
    return {
      analytics_storage: value === "granted" ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    };
  }

  function loadAnalytics() {
    var existing = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    if (analyticsLoading || existing || analyticsConsent !== "granted") return;
    analyticsLoading = true;
    ensureGtag();
    window.gtag("js", new Date());
    window.gtag("config", analyticsId);
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(analyticsId);
    script.setAttribute("data-hst-analytics", "true");
    script.addEventListener("error", function () {
      analyticsLoading = false;
      script.remove();
    });
    document.head.appendChild(script);
  }

  function setupAnalytics() {
    analyticsConsent = readConsent();
    if (analyticsConsent !== "granted" && analyticsConsent !== "denied") analyticsConsent = null;
    ensureGtag();
    var defaults = consentSettings(analyticsConsent);
    defaults.wait_for_update = 500;
    window.gtag("consent", "default", defaults);
    window.gtag("set", "ads_data_redaction", true);
    if (analyticsConsent === "granted") loadAnalytics();
  }

  function updateConsent(value) {
    try { localStorage.setItem("hst_consent", value); } catch (e) {}
    analyticsConsent = value;
    ensureGtag();
    window.gtag("consent", "update", consentSettings(value));
    if (value === "granted") loadAnalytics();
  }

  function safeFocus(element) {
    if (!element || !document.documentElement.contains(element) || typeof element.focus !== "function") return;
    if (element.disabled || element.getAttribute("aria-hidden") === "true" || element.closest("[inert]")) return;
    var style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(element) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return;
    try {
      element.focus({ preventScroll: true });
    } catch (e) {
      element.focus();
    }
  }

  function banner(options) {
    options = options || {};
    var opener = options.opener || null;
    var old = document.getElementById("cookie-consent");
    if (old) old.remove();
    var node = document.createElement("section");
    node.id = "cookie-consent";
    node.className = "cookie-consent";
    node.tabIndex = -1;
    node.setAttribute("role", "dialog");
    node.setAttribute("aria-modal", "false");
    node.setAttribute("aria-labelledby", "cookie-consent-title");
    node.setAttribute("aria-describedby", "cookie-consent-description");
    node.setAttribute("aria-live", "polite");
    node.setAttribute("aria-atomic", "true");
    node.innerHTML = '<div class="cookie-copy"><strong id="cookie-consent-title">' + copy.title + '</strong><p id="cookie-consent-description">' + copy.text + ' <a href="' + (cookieRoutes[language] || cookieRoutes.en) + '">' + copy.policy + '</a></p></div><div class="cookie-actions"><button type="button" class="cookie-reject">' + copy.reject + '</button><button type="button" class="cookie-accept">' + copy.accept + '</button></div>';
    document.body.appendChild(node);

    function closeBanner(returnFocus) {
      node.remove();
      if (returnFocus && opener) {
        window.setTimeout(function () { safeFocus(opener); }, 0);
      }
    }

    node.querySelector(".cookie-accept").addEventListener("click", function () {
      updateConsent("granted");
      closeBanner(true);
    });
    node.querySelector(".cookie-reject").addEventListener("click", function () {
      updateConsent("denied");
      closeBanner(true);
    });
    node.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !opener) return;
      event.preventDefault();
      closeBanner(true);
    });
    if (options.focus && opener) {
      window.setTimeout(function () { safeFocus(node); }, 0);
    }
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

  function affiliateOffer(link) {
    var offerNode = link.closest("[data-offer-id],[data-offer]");
    var productNode = link.closest("[data-product],[data-offer-label]");
    var priceNode = link.closest("[data-price]");
    var href = link.href || "";
    var dataOffer = offerNode ? offerNode.getAttribute("data-offer-id") || offerNode.getAttribute("data-offer") || "" : "";
    var dataProduct = productNode ? productNode.getAttribute("data-product") || productNode.getAttribute("data-offer-label") || "" : "";
    var rawPrice = priceNode ? String(priceNode.getAttribute("data-price") || "").replace(/[^0-9.,-]/g, "").replace(",", ".") : "";
    var dataPrice = parseFloat(rawPrice);
    var keys = Object.keys(offers);
    var token = "";
    var offer = null;
    var index;
    for (index = 0; index < keys.length; index += 1) {
      var candidate = offers[keys[index]];
      if (dataOffer === keys[index] || dataOffer === candidate.id || href.indexOf(keys[index]) !== -1 || href.indexOf(candidate.id) !== -1) {
        token = keys[index];
        offer = candidate;
        break;
      }
    }
    return {
      code: token || dataOffer || "unknown",
      id: offer ? offer.id : dataOffer || "unknown",
      product: dataProduct || (offer ? offer.product : dataOffer || "Affiliate ticket"),
      price: !isNaN(dataPrice) ? dataPrice : offer ? offer.price : 0
    };
  }

  function normalizeEnglishHeader() {
    if (document.documentElement.lang !== "en") return;
    var navigation = document.querySelector("header .nav nav");
    var destinations = [
      { label: "Tickets", href: "/#tickets" },
      { label: "Combo Tickets", href: "/combo-tickets/" },
      { label: "Visitor Info", href: "/#visitor-info" },
      { label: "Visitor Guides", href: "/guides/" }
    ];
    if (navigation) {
      var links = navigation.querySelectorAll("a");
      Array.prototype.forEach.call(destinations, function (destination, index) {
        if (!links[index]) return;
        links[index].textContent = destination.label;
        links[index].setAttribute("href", destination.href);
      });
    }

    if (document.body.classList.contains("home-v2")) return;
    var headerCta = document.querySelector("header .nav-actions a.btn, header .nav-actions a");
    if (!headerCta) return;
    headerCta.textContent = "Compare tickets";
    headerCta.setAttribute("href", "/#tickets");
    headerCta.removeAttribute("target");
    headerCta.removeAttribute("rel");
    headerCta.removeAttribute("aria-label");
    headerCta.removeAttribute("data-offer-id");
    headerCta.removeAttribute("data-offer");
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
    button.type = "button";
    if (!menu.id) menu.id = "site-navigation";
    button.setAttribute("aria-controls", menu.id);
    button.setAttribute("aria-label", interfaceCopy.openMenu);
    button.setAttribute("aria-expanded", "false");
    navShell.setAttribute("data-menu-ready", "true");

    function setMenu(open, returnFocus) {
      if (open) {
        navShell.classList.add("menu-open");
      } else {
        navShell.classList.remove("menu-open");
      }
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.setAttribute("aria-label", open ? interfaceCopy.closeMenu : interfaceCopy.openMenu);
      if (open) {
        var firstLink = menu.querySelector("a[href]");
        if (firstLink) window.setTimeout(function () { firstLink.focus(); }, 0);
      } else if (returnFocus) {
        button.focus();
      }
    }

    button.addEventListener("click", function () {
      setMenu(!navShell.classList.contains("menu-open"), false);
    });
    document.addEventListener("click", function (event) {
      if (!navShell.classList.contains("menu-open") || navShell.contains(event.target)) return;
      setMenu(false, false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !navShell.classList.contains("menu-open")) return;
      event.preventDefault();
      setMenu(false, true);
    });
    menu.addEventListener("click", function (event) {
      if (!event.target.closest("a")) return;
      setMenu(false, false);
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
    button.id = "language-menu-trigger";
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", interfaceCopy.languageMenu + ": " + selected.textContent.trim());
    button.innerHTML = '<span class="lang-current">' + selected.textContent.trim() + '</span><span aria-hidden="true">▾</span>';
    var list = document.createElement("div");
    list.id = "language-menu";
    list.className = "lang-list";
    list.setAttribute("role", "menu");
    list.setAttribute("aria-labelledby", button.id);
    list.hidden = true;
    button.setAttribute("aria-controls", list.id);
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

    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    function menuItems() {
      return Array.prototype.slice.call(list.querySelectorAll('[role="menuitem"]'));
    }

    function setLanguageMenu(open, returnFocus, focusPosition) {
      if (open) {
        control.classList.add("open");
      } else {
        control.classList.remove("open");
      }
      list.hidden = !open;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        window.setTimeout(function () {
          var items = menuItems();
          var target = list.querySelector('[aria-current="true"]') || items[0];
          if (focusPosition === "first") target = items[0];
          if (focusPosition === "last") target = items[items.length - 1];
          if (target) target.focus();
        }, 0);
      } else if (returnFocus) {
        button.focus();
      }
    }

    button.addEventListener("click", function () {
      setLanguageMenu(!control.classList.contains("open"), false);
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && control.classList.contains("open")) {
        event.preventDefault();
        setLanguageMenu(false, true);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      setLanguageMenu(true, false, event.key === "ArrowUp" ? "last" : "first");
    });
    list.addEventListener("keydown", function (event) {
      var items = menuItems();
      var current = items.indexOf(document.activeElement);
      var next = current;
      if (event.key === "Escape") {
        event.preventDefault();
        setLanguageMenu(false, true);
        return;
      }
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = items.length - 1;
      if (event.key === "ArrowDown") next = (current + 1 + items.length) % items.length;
      if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
      if (next === current || !items[next]) return;
      event.preventDefault();
      items[next].focus();
    });
    list.addEventListener("click", function (event) {
      if (!event.target.closest('a[role="menuitem"]')) return;
      setLanguageMenu(false, false);
    });
    document.addEventListener("click", function (event) {
      if (!control.classList.contains("open") || control.contains(event.target)) return;
      setLanguageMenu(false, false);
    });
    control.addEventListener("focusout", function (event) {
      if (!control.classList.contains("open") || control.contains(event.relatedTarget)) return;
      setLanguageMenu(false, false);
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

  function setupConditionalBuybar() {
    var buybar = document.querySelector("[data-sticky-buybar], .buybar");
    if (!buybar || buybar.getAttribute("data-conditional-ready") === "true") return;
    var ctaSelector = [
      "[data-primary-booking-cta]",
      "[data-primary-ticket-cta]",
      "[data-booking-cta]",
      ".v2-final-cta a.btn",
      ".final-cta a.btn",
      "main a[rel~=\"sponsored\"]",
      "main a[data-offer-id]",
      "main a[data-offer]"
    ].join(",");
    var bookingCtas = Array.prototype.filter.call(document.querySelectorAll(ctaSelector), function (cta) {
      return !cta.closest("[data-sticky-buybar], .buybar, header, footer");
    });
    var mobileQuery = window.matchMedia("(max-width: 900px)");
    var bookingCtaVisible = false;
    buybar.setAttribute("data-conditional-ready", "true");

    function inViewport(cta) {
      if (!cta || !document.documentElement.contains(cta) || cta.hidden || cta.closest('[hidden], [aria-hidden="true"]')) return false;
      var style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(cta) : null;
      if (style && (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || parseFloat(style.opacity) === 0)) return false;
      var rect = cta.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    }

    function renderBuybar() {
      var visible = mobileQuery.matches && !bookingCtaVisible;
      if (visible) {
        buybar.classList.add("is-visible");
        buybar.setAttribute("aria-hidden", "false");
        buybar.removeAttribute("inert");
      } else {
        buybar.classList.remove("is-visible");
        buybar.setAttribute("aria-hidden", "true");
        buybar.setAttribute("inert", "");
      }
    }

    function updateBookingCtaVisibility() {
      bookingCtaVisible = bookingCtas.some(inViewport);
      renderBuybar();
    }

    updateBookingCtaVisibility();
    if (bookingCtas.length && "IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function () {
        updateBookingCtaVisibility();
      }, { threshold: [0, 0.01] });
      bookingCtas.forEach(function (cta) { observer.observe(cta); });
    } else if (bookingCtas.length) {
      window.addEventListener("scroll", function () {
        updateBookingCtaVisibility();
      }, { passive: true });
    }
    window.addEventListener("resize", function () {
      updateBookingCtaVisibility();
    });
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", function () {
        updateBookingCtaVisibility();
      });
    } else if (typeof mobileQuery.addListener === "function") {
      mobileQuery.addListener(function () {
        updateBookingCtaVisibility();
      });
    }
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[rel~="sponsored"], a[data-offer-id], a[data-offer], [data-offer-id] a, [data-offer] a');
    if (!link) return;
    var offer = affiliateOffer(link);
    if (analyticsConsent === "granted" && typeof window.gtag === "function") {
      window.gtag("event", "affiliate_click", {
        product: offer.product,
        price: offer.price,
        value: offer.price,
        offer_code: offer.code,
        offer_id: offer.id,
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
    if (!link || analyticsConsent !== "granted" || typeof window.gtag !== "function") return;
    window.gtag("event", "social_click", {
      platform: link.getAttribute("data-social-platform"),
      language: language,
      page: location.pathname,
      button_position: "footer",
      transport_type: "beacon"
    });
  });

  document.addEventListener("click", function (event) {
    var settingsTrigger = event.target.closest("[data-cookie-settings]");
    if (!settingsTrigger) return;
    event.preventDefault();
    banner({ opener: settingsTrigger, focus: true });
  });

  document.addEventListener("change", function (event) {
    var select = event.target.closest(".language-switcher");
    if (!select || !select.value) return;
    window.location.assign(select.value);
  });

  setupAnalytics();
  if (!analyticsConsent) banner();
  normalizeEnglishHeader();
  setupMobileMenu();
  setupLanguageMenu();
  setupMobileToc();
  setupConditionalBuybar();
})();
