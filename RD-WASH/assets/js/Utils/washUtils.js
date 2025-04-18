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
    const now = new Date();
  
    const y = now.getFullYear().toString().slice(2); // YY
    const m = (now.getMonth() + 1).toString().padStart(2, "0"); // MM
    const d = now.getDate().toString().padStart(2, "0"); // DD
  
    const datePart = `${y}${m}${d}`;
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
  
    return `${prefix}-${datePart}-${randomPart}`;
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

  