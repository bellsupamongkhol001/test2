const mainContent     = document.getElementById("main-content");
const navLinks        = document.querySelectorAll(".nav-link");
const loader          = document.getElementById("globalLoader");
const loaderMessage   = document.getElementById("loaderMessage");
const loadingOverlay  = document.getElementById("loadingOverlay");

function showOverlay(msg = "Loading...") {
  loadingOverlay.querySelector(".loading-text").textContent = msg;
  loadingOverlay.classList.remove("hidden");
}
function hideOverlay() {
  loadingOverlay.classList.add("hidden");
}

async function loadPage(page = "wash") {
  showOverlay(`Loading ${page}...`);
  loader.style.display = "block";
  loaderMessage.textContent = `Loading ${page}...`;
  try {
    const res = await fetch(`./pages/${page}.html`);
    if (!res.ok) throw new Error(`Page not found: ${page}`);
    const html = await res.text();
    mainContent.innerHTML = html;
    window.scrollTo(0, 0);
    updateActiveLink(page);
    window.history.pushState({}, "", `#${page}`);
    loadPageStyle(page);
    await initController(page);
  } catch (err) {
    mainContent.innerHTML = `
      <div style="padding:2rem;color:red">
        <strong>Error:</strong> ${err.message}
      </div>`;
  } finally {
    loader.style.display = "none";
    hideOverlay();
  }
}

function loadPageStyle(page) {
  document.querySelectorAll("link[data-page-style]").forEach(el => el.remove());
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `/assets/css/${page}.css`;
  link.setAttribute("data-page-style", page);
  document.head.appendChild(link);
}

async function initController(page) {
  switch (page) {
    case "wash": {
      const { initWashPage } = await import("./Controllers/washController.js");
      return initWashPage();
    }
    case "employee": {
      const { initEmployeePage } = await import("./Controllers/employeeController.js");
      return initEmployeePage();
    }
    case "uniform": {
      const { initUniformPage } = await import("./Controllers/uniformController.js");
      return initUniformPage();
    }
    case "inventory": {
      const { initInventoryPage } = await import("./Controllers/inventoryController.js");
      return initInventoryPage();
    }
    default:
      console.warn(`No controller for page: ${page}`);
  }
}

function updateActiveLink(page) {
  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  const initial = location.hash.replace("#", "") || "wash";
  loadPage(initial);
});

navLinks.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    loadPage(link.dataset.page);
  });
});

window.addEventListener("popstate", () => {
  const page = location.hash.replace("#", "") || "wash";
  loadPage(page);
});
