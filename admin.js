(function(){
  const storageKey = "hagiasophiaticket.adminDraft";
  let state = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function getPath(obj, path) {
    return path.split(".").reduce((acc, key) => acc && acc[key], obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split(".");
    const last = parts.pop();
    const target = parts.reduce((acc, key) => acc[key], obj);
    target[last] = value;
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  async function loadInitialData() {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
    const response = await fetch("site-data.json", { cache: "no-store" });
    return response.json();
  }

  function saveDraft() {
    localStorage.setItem(storageKey, JSON.stringify(state));
    localStorage.setItem(storageKey + ".time", new Date().toLocaleString());
    render();
  }

  function bindFields() {
    $$("[data-path]").forEach((field) => {
      field.value = getPath(state, field.dataset.path) || "";
      field.oninput = () => {
        setPath(state, field.dataset.path, field.value);
        renderStats();
        renderSeoPreview();
        renderJson();
      };
    });
  }

  function renderStats() {
    $("#statGuides").textContent = state.guides.filter((guide) => guide.status === "Published").length;
    $("#statPrice").textContent = `${state.site.currency} ${state.ticket.price}`;
    $("#statCombos").textContent = (state.combos || []).filter((combo) => combo.status !== "Draft").length;
    $("#statSaved").textContent = localStorage.getItem(storageKey + ".time") || "Not saved";
  }

  function renderSeoPreview() {
    $("#seoTitle").textContent = state.seo.metaTitle;
    $("#seoUrl").textContent = state.site.baseUrl;
    $("#seoDesc").textContent = state.seo.metaDescription;
  }

  function renderBadges() {
    const list = $("#badgeList");
    list.innerHTML = "";
    state.ticket.badges.forEach((badge, index) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      row.innerHTML = `<input value="${escapeAttr(badge)}"><button type="button" aria-label="Remove badge">Remove</button>`;
      $("input", row).oninput = (event) => {
        state.ticket.badges[index] = event.target.value;
        renderJson();
      };
      $("button", row).onclick = () => {
        state.ticket.badges.splice(index, 1);
        renderBadges();
        renderJson();
      };
      list.appendChild(row);
    });
  }

  function renderGuides() {
    const list = $("#guideList");
    list.innerHTML = "";
    state.guides.forEach((guide, index) => {
      const item = document.createElement("article");
      item.className = "guide-admin-card";
      item.innerHTML = `<div class="guide-admin-head"><span>${escapeHtml(guide.category || "Guide")}</span><button type="button">Remove</button></div>
      <label>Title<input value="${escapeAttr(guide.title)}"></label>
      <label>Description<textarea rows="3">${escapeHtml(guide.description)}</textarea></label>
      <div class="form-grid compact"><label>File<input value="${escapeAttr(guide.file)}"></label><label>Status<select><option>Published</option><option>Draft</option></select></label><label>Category<input value="${escapeAttr(guide.category)}"></label></div>`;
      const inputs = $$("input, textarea, select", item);
      inputs[0].oninput = (event) => guide.title = event.target.value;
      inputs[1].oninput = (event) => guide.description = event.target.value;
      inputs[2].oninput = (event) => guide.file = event.target.value;
      inputs[3].value = guide.status;
      inputs[3].onchange = (event) => {
        guide.status = event.target.value;
        renderStats();
        renderJson();
      };
      inputs[4].oninput = (event) => {
        guide.category = event.target.value;
        $(".guide-admin-head span", item).textContent = event.target.value || "Guide";
        renderJson();
      };
      inputs.forEach((input) => input.addEventListener("input", renderJson));
      $("button", item).onclick = () => {
        state.guides.splice(index, 1);
        render();
      };
      list.appendChild(item);
    });
  }

  function renderCombos() {
    const list = $("#comboList");
    if (!list) return;
    list.innerHTML = "";
    state.combos = state.combos || [];
    state.combos.forEach((combo, index) => {
      combo.inclusions = combo.inclusions || [];
      const item = document.createElement("article");
      item.className = "guide-admin-card combo-admin-card";
      item.innerHTML = `<div class="guide-admin-head"><span>${escapeHtml(combo.badge || "Combo")}</span><button type="button">Remove</button></div>
      <div class="form-grid">
        <label class="wide">Title<input data-field="title" value="${escapeAttr(combo.title)}"></label>
        <label>Badge<input data-field="badge" value="${escapeAttr(combo.badge)}"></label>
        <label>Price<input data-field="price" value="${escapeAttr(combo.price)}"></label>
        <label class="wide">Affiliate URL<input data-field="url" value="${escapeAttr(combo.url)}"></label>
        <label class="wide">Image<input data-field="image" value="${escapeAttr(combo.image)}"></label>
        <label class="wide">Description<textarea data-field="description" rows="3">${escapeHtml(combo.description)}</textarea></label>
        <label class="wide">Inclusions, one per line<textarea data-field="inclusions" rows="4">${escapeHtml(combo.inclusions.join("\n"))}</textarea></label>
        <label>Status<select data-field="status"><option>Published</option><option>Draft</option></select></label>
      </div>`;
      $("[data-field='status']", item).value = combo.status || "Published";
      $$("[data-field]", item).forEach((field) => {
        field.oninput = field.onchange = (event) => {
          const key = event.target.dataset.field;
          if (key === "inclusions") {
            combo.inclusions = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean);
          } else {
            combo[key] = event.target.value;
          }
          if (key === "badge") $(".guide-admin-head span", item).textContent = event.target.value || "Combo";
          renderStats();
          renderJson();
        };
      });
      $("button", item).onclick = () => {
        state.combos.splice(index, 1);
        render();
      };
      list.appendChild(item);
    });
  }

  function renderJson() {
    $("#jsonOutput").value = JSON.stringify(state, null, 2);
  }

  function render() {
    bindFields();
    renderStats();
    renderSeoPreview();
    renderBadges();
    renderCombos();
    renderGuides();
    renderJson();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "site-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    $("#copyJson").textContent = "Copied";
    setTimeout(() => $("#copyJson").textContent = "Copy JSON", 1400);
  }

  $$(".admin-menu button").forEach((button) => {
    button.onclick = () => {
      $$(".admin-menu button").forEach((item) => item.classList.remove("active"));
      $$(".admin-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#panel-${button.dataset.panel}`).classList.add("active");
    };
  });

  $("#saveBtn").onclick = saveDraft;
  $("#downloadJson").onclick = downloadJson;
  $("#addBadge").onclick = () => {
    state.ticket.badges.push("New Badge");
    render();
  };
  $("#addGuide").onclick = () => {
    state.guides.unshift({ file: "guides/new-guide.html", title: "New Hagia Sophia Guide", category: "Draft", description: "Short guide description.", status: "Draft" });
    render();
  };
  $("#addCombo").onclick = () => {
    state.combos = state.combos || [];
    state.combos.unshift({
      title: "New Hagia Sophia Combo Ticket",
      badge: "New offer",
      price: "0.00",
      url: "https://gyg.me/",
      image: "assets/hagia-sophia-guide.webp",
      description: "Short combo description.",
      inclusions: ["Hagia Sophia ticket", "Audio guide"],
      status: "Draft"
    });
    render();
  };
  $("#copyJson").onclick = copyJson;
  $("#resetDraft").onclick = async () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey + ".time");
    state = await loadInitialData();
    render();
  };
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state = JSON.parse(reader.result);
      saveDraft();
    };
    reader.readAsText(file);
  };

  loadInitialData().then((data) => {
    state = clone(data);
    render();
  }).catch((error) => {
    document.body.innerHTML = `<main class="admin-shell"><section class="admin-main"><div class="admin-card"><h1>Admin could not load</h1><p>${escapeHtml(error.message)}</p></div></section></main>`;
  });
})();
