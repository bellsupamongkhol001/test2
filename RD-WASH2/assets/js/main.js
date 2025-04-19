// ============================ 🔧 DOM SELECTORS ============================
const mainContent = document.getElementById("main-content");
const navLinks = document.querySelectorAll(".nav-link");
const loader = document.getElementById("globalLoader");
const loaderMessage = document.getElementById("loaderMessage");

// ============================ 🔄 LOADER CONTROL ============================
function showLoader(msg = "Loading...") {
  const el = document.getElementById("loadingOverlay");
  if (el) {
    el.style.display = "flex";
    el.querySelector("p").textContent = msg;
  }
}

function hideLoader() {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = "none";
}

// ============================ 📦 PAGE LOADER ============================
async function loadPage(page = "dashboard") {
  try {
    showLoader(`Loading ${page}...`);

    const res = await fetch(`./pages/${page}.html`);
    if (!res.ok) throw new Error(`Page not found: ${page}`);
    const html = await res.text();
    mainContent.innerHTML = html;

    window.scrollTo(0, 0);
    updateActiveLink(page);
    window.history.pushState({}, "", `#${page}`);

    // ✅ Load controller dynamically
    switch (page) {
      case "wash":
        const { initWashPage } = await import("./Controllers/washController.js");
        loadPageStyle(page)
        initWashPage();
        break;
      case "employee":
        const { initEmployeePage } = await import("./Controllers/employeeController.js");
        loadPageStyle(page)
        initEmployeePage();
        break;
      case "uniform":
        const { initUniformPage } = await import("./Controllers/uniformController.js");
        loadPageStyle(page)
        initUniformPage();
        break;
      case "inventory":
        const { initInventoryPage } = await import("/assets/js/Controllers/inventoryController.js");
        loadPageStyle(page)
        initInventoryPage();
        break;
      case "dashboard":
        const { initDashboardPage } = await import("/assets/js/Controllers/dashboardController.js");
        loadPageStyle(page)
        initDashboardPage();
        break;
      default:
        console.warn(`📛 No controller assigned for page: ${page}`);
    }
  } catch (err) {
    mainContent.innerHTML = `<div style="padding: 2rem; color: red;"><strong>Error:</strong> ${err.message}</div>`;
    console.error("❌ loadPage error:", err);
  } finally {
    hideLoader();
  }
}

function loadPageStyle(page) {
  document.querySelectorAll("link[data-page-style]").forEach(link => link.remove());
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `/assets/css/${page}.css`;
  css.setAttribute("data-page-style", page);
  document.head.appendChild(css);
}

// ============================ 🧭 ACTIVE MENU ============================
function updateActiveLink(page) {
  document.querySelectorAll(".sidebar a").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

// ============================ 🚀 INIT ============================
window.addEventListener("DOMContentLoaded", () => {
  const initialPage = location.hash.replace("#", "") || "dashboard";
  loadPage(initialPage);
});

// ============================ 📌 NAV EVENT ============================
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    loadPage(page);
  });
});

// ============================ 🔁 BACK/FORWARD HISTORY ============================
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "dashboard";
  loadPage(page);
});
