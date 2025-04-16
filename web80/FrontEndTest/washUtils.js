// ✅ debounce: หน่วงเวลาในการเรียกฟังก์ชัน (ป้องกันเรียกซ้ำบ่อยเกิน)
export function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  // ✅ แสดง Modal แจ้งเตือนข้อความ
// 📁 utils/toast.js
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

  // 📦 หา toast container (หรือสร้างใหม่)
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  // ⏱ Auto-close
  const timeout = setTimeout(() => closeToast(), 3000);

  // ❌ ปิดเอง
  toast.querySelector(".toast-close").addEventListener("click", () => closeToast());

  function closeToast() {
    toast.classList.add("hide");
    toast.addEventListener("transitionend", () => toast.remove());
    clearTimeout(timeout); // กัน auto-close ซ้ำ
  }
}
  
  // ✅ แปลงวันที่ ISO ให้เป็นรูปแบบ dd/mm/yyyy
  export function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  
  // ✅ สร้าง ID อัตโนมัติ เช่น WASH-20250407-001
  export function generateWashId(prefix = "WASH") {
    const date = new Date();
    const yymmdd = date
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${yymmdd}-${random}`;
  }
  
  // ✅ แสดง Modal แบบ confirm (callback)
  export function showConfirmModal(message, onConfirm) {
    const modal = document.createElement("div");
    modal.className = "overlay";
  
    modal.innerHTML = `
      <div class="confirm-box">
        <p>${message}</p>
        <div style="text-align:center;margin-top:10px;">
          <button class="btn-yes">Yes</button>
          <button class="btn-no">Cancel</button>
        </div>
      </div>
    `;
  
    document.body.appendChild(modal);
  
    modal.querySelector(".btn-yes").addEventListener("click", () => {
      modal.remove();
      if (onConfirm) onConfirm();
    });
  
    modal.querySelector(".btn-no").addEventListener("click", () => {
      modal.remove();
    });
  
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  export function showLoading(message = "Processing...") {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.querySelector("p").textContent = message;
  }
  
  export function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "none";
  }

  export function confirmDeleteModal(id, onConfirmCallback) {
    const modal = document.getElementById("confirmModal");
    modal.style.display = "flex";
  
    const yesBtn = document.getElementById("btnConfirmYes");
    const noBtn = document.getElementById("btnConfirmNo");
  
    const cleanup = () => {
      modal.style.display = "none";
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };
  
    yesBtn.onclick = async () => {
      cleanup();
      await onConfirmCallback(id);
    };
  
    noBtn.onclick = cleanup;
  
    // ปิดเมื่อคลิกพื้นหลัง
    modal.onclick = (e) => {
      if (e.target === modal) cleanup();
    };
  }

  // washUtils.js
export function getStatusFromDate(wash) {
  if (!wash.createdAt || wash.status === "Scrap" || wash.status === "ESD Passed") {
    return wash.status; // ไม่เปลี่ยน
  }

  const created = new Date(wash.createdAt);
  const now = new Date();
  const diffInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  if (diffInDays >= 3) return "Completed";
  if (diffInDays >= 1) return "Washing";
  return "Waiting to Send";
}

  