// 📁 utils/toast.js
export function showToast(message = "Action completed!", type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
  
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
  
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || "ℹ️"}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close">&times;</button>
    `;
  
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
  
    container.appendChild(toast);
  
    const timeout = setTimeout(() => closeToast(), 3000);
  
    toast.querySelector(".toast-close").addEventListener("click", () => closeToast());
  
    function closeToast() {
      toast.classList.add("hide");
      toast.addEventListener("transitionend", () => toast.remove());
      clearTimeout(timeout);
    }
  }
  