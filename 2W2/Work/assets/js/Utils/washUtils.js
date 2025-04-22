import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import {db} from "../firebase/firebaseConfig.js";

// ============================ 📅 FORMAT DATE ============================
/**
 * แปลงวันที่จาก ISO string เป็นรูปแบบ dd/mm/yyyy (ไทย)
 * @param {string} isoString - วันที่ในรูปแบบ ISO เช่น "2025-04-18T10:00:00Z"
 * @returns {string} วันที่ในรูปแบบ dd/mm/yyyy หรือ "-" หากไม่พบข้อมูล
 */
export function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
  
  // ============================ 🆔 GENERATE WASH ID ============================
/**
 * สร้างรหัสงานซักอัตโนมัติ เช่น "WASH-250418-007"
 * @param {string} prefix - คำขึ้นต้น (เช่น WASH หรืออื่น ๆ)
 * @returns {string} รหัสงานซักในรูปแบบ PREFIX-YYMMDD-XXX
 */
export async function generateWashId(prefix = "WASH") {
  const now = new Date();
  const y = now.getFullYear().toString().slice(0);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const datePart = `${y}${m}${d}`;
  const counterKey = `${prefix}-${datePart}`;

  const counterRef = doc(db, "WashCounters", counterKey);
  const washCollection = collection(db, "WashDB");

  let currentCounter = 1;

  while (true) {
    const countPart = currentCounter.toString().padStart(3, "0");
    const candidateId = `${prefix}-${datePart}-${countPart}`;

    const candidateRef = doc(washCollection, candidateId);
    const candidateSnap = await getDoc(candidateRef);

    if (!candidateSnap.exists()) {
      // ✅ บันทึกเลขล่าสุดที่ใช้ไปจริง
      await setDoc(counterRef, { last: currentCounter });
      return candidateId;
    }

    currentCounter++;
  }
}


// ============================ ❓ SHOW CONFIRM MODAL ============================
/**
 * แสดง Modal สำหรับยืนยัน (Yes / Cancel)
 * @param {string} message - ข้อความที่จะแสดงใน Modal
 * @param {Function} onConfirm - Callback เมื่อผู้ใช้กด Yes
 */
export function showConfirmModal(message = "คุณแน่ใจหรือไม่?", onConfirm) {
  // ✅ สร้าง element modal
  const modal = document.createElement("div");
  modal.className = "overlay";

  modal.innerHTML = `
    <div class="confirm-box">
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn-yes">Yes</button>
        <button class="btn-no">Cancel</button>
      </div>
    </div>
  `;

  // ✅ เพิ่มเข้าไปใน document
  document.body.appendChild(modal);

  // ☑️ เมื่อกด Yes → callback แล้วปิด modal
  modal.querySelector(".btn-yes").addEventListener("click", () => {
    modal.remove();
    if (typeof onConfirm === "function") onConfirm();
  });

  // ☑️ เมื่อกด Cancel → แค่ปิด modal
  modal.querySelector(".btn-no").addEventListener("click", () => {
    modal.remove();
  });

  // ☑️ คลิกนอก modal → ปิด modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ============================ ⏳ SHOW LOADING ============================
/**
 * แสดง Loading Overlay พร้อมข้อความ
 * @param {string} message - ข้อความที่ต้องการแสดงขณะโหลด
 */
export function showLoading(message = "⏳ Processing...") {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    console.warn("⚠️ loadingOverlay ไม่พบใน DOM");
    return;
  }

  overlay.style.display = "flex";

  const messageEl = overlay.querySelector("p");
  if (messageEl) messageEl.textContent = message;
}

// ============================ ✅ HIDE LOADING ============================
/**
 * ซ่อน Loading Overlay ที่แสดงอยู่
 */
export function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    console.warn("⚠️ loadingOverlay ไม่พบใน DOM");
    return;
  }
  overlay.style.display = "none";
}

// ============================ 🗑️ CONFIRM DELETE MODAL ============================
/**
 * แสดง Modal เพื่อยืนยันการลบข้อมูล
 * @param {string} id - รหัสรายการที่ต้องการลบ
 * @param {function} onConfirmCallback - ฟังก์ชันที่เรียกเมื่อกดปุ่มยืนยัน
 */
export function confirmDeleteModal(id, onConfirmCallback) {
  const modal = document.getElementById("confirmModal");
  if (!modal) return;

  modal.style.display = "flex";

  const yesBtn = document.getElementById("btnConfirmYes");
  const noBtn = document.getElementById("btnConfirmNo");

  if (!yesBtn || !noBtn) return;

  // 🔄 เคลียร์ event เดิมเมื่อ modal ปิด
  const cleanup = () => {
    modal.style.display = "none";
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  // ✅ ตอบตกลง
  yesBtn.onclick = async () => {
    cleanup();
    await onConfirmCallback(id);
  };

  // ❌ ยกเลิก
  noBtn.onclick = cleanup;

  // ✨ ปิดเมื่อคลิกพื้นที่นอกกล่อง
  modal.onclick = (e) => {
    if (e.target === modal) cleanup();
  };
}

// ============================ ⏳ GET STATUS FROM DATE ============================
/**
 * คำนวณสถานะของงานซักจากวันที่เริ่มต้น
 * - หากครบ 3 วัน → "Completed"
 * - หากครบ 1 วัน → "Washing"
 * - หากน้อยกว่า 1 วัน → "Waiting to Send"
 * 
 * กรณีสถานะเป็น "Scrap" หรือ "ESD Passed" → ไม่เปลี่ยนสถานะ
 *
 * @param {object} wash - ข้อมูลงานซัก (ต้องมี createdAt และ status)
 * @returns {string} - สถานะใหม่หรือสถานะเดิม
 */
export function getStatusFromDate(wash) {
  if (!wash.createdAt || wash.status === "Scrap" || wash.status === "ESD Passed") {
    return wash.status; // ❌ ไม่เปลี่ยนแปลง
  }

  const created = new Date(wash.createdAt);
  const now = new Date();
  const diffInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  if (diffInDays >= 3) return "Completed";
  if (diffInDays >= 1) return "Washing";
  return "Waiting to Send";
}

  