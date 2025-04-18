// ============================ 🔧 DOM SELECTORS ============================
const mainContent = document.getElementById("main-content");
const navLinks = document.querySelectorAll(".nav-link");
const loader = document.getElementById("globalLoader");
const loaderMessage = document.getElementById("loaderMessage");

// ============================ 🔄 LOADER CONTROL ============================
function showLoader(message = "Loading...") {
  loader.style.display = "flex";
  loaderMessage.textContent = message;
}

function hideLoader() {
  loader.style.display = "none";
}

// ============================ 📦 PAGE LOADER ============================
// 📁 assets/js/main.js

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

    // ✅ Dynamic import Controller ของแต่ละเพจ
    switch (page) {
      case "wash":
        const { initWashPage } = await import("/assets/js/Controllers/washController.js");
        initWashPage();
        break;
      // case "dashboard":
      //   const { initDashboard } = await import("./dashboardController.js");
      //   initDashboard();
      //   break;
      // เพิ่ม case อื่นได้ตามต้องการ
    }

  } catch (err) {
    mainContent.innerHTML = `<div style="padding: 2rem; color: red;"><strong>Error:</strong> ${err.message}</div>`;
    console.error(err);
  } finally {
    hideLoader();
  }
}


// ============================ 🧭 ACTIVE MENU ============================
function updateActiveLink(page) {
  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

// ============================ 🚀 INIT ============================
window.addEventListener("DOMContentLoaded", () => {
  const initialPage = location.hash.replace("#", "") || "dashboard";
  loadPage(initialPage);
});

// ============================ 📌 NAV EVENT ============================
navLinks.forEach(link => {
  link.addEventListener("click", e => {
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
