// ============================ 📦 IMPORT MODULE ============================
import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "../firebase/firebaseConfig.js";

import {
  getAllWashes,
  getWashJobById,
  addWashJob,
  updateWashJob,
  deleteWashJob,
  addToWashHistory,
  getUniformByCode,
  incrementRewashCount,
  scrapUniform,
  setRewashCount,
  returnToStockAfterESD,
  getAllWashHistory,
  getRewashCount,
} from "../Models/washModel.js";

import {
  renderWashTable,
  renderWashHistory,
  renderWashSummary,
  renderPagination,
  openESDModal,
} from "../Views/washView.js";

import {
  formatDate,
  generateWashId,
  showLoading,
  hideLoading,
  confirmDeleteModal,
  getStatusFromDate,
} from "../Utils/washUtils.js";

import { showToast } from "../Utils/toast.js";

import { debounce, safeGet } from "../Utils/globalUtils.js";
// ============================ 🔄 INITIALIZATION ============================

let currentPage = 1;
const rowsPerPage = 10;

/**
 * โหลดข้อมูลและเริ่มต้นหน้า Wash Page
 * - ดึงข้อมูล Wash และ History
 * - ตรวจสอบสถานะล่าสุดของแต่ละรายการ
 * - แสดงผล Table, Dashboard, และ History
 */
export async function initWashPage() {
  try {
    showLoading("🔄 กำลังโหลดข้อมูลหน้า Wash...");

    // 🧩 Bind Events
    setupEventListeners();

    // 📥 ดึงข้อมูลทั้งหมด
    const [rawWashes, historyData] = await Promise.all([
      getAllWashes(),
      getAllWashHistory(),
    ]);

    // 🔍 ตรวจสอบสถานะล่าสุดของแต่ละงานซัก
    const updatedWashes = await Promise.all(
      rawWashes.map(checkAndUpdateWashStatus)
    );

    // 🎯 แสดงผลบนหน้าจอ
    renderWashTable(updatedWashes);
    renderWashSummary(updatedWashes);
    renderWashHistory(historyData);
  } catch (error) {
    console.error("❌ Error loading Wash page:", error);
    showToast("❌ เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 🎯 EVENT LISTENERS ============================

function setupEventListeners() {
  // 🔍 Search & Filter
  safeGet("searchInput")?.addEventListener("input", debounce(renderWashTable, 300));
  safeGet("filterStatus")?.addEventListener("change", renderWashTable);

  // 💾 Save & Add
  safeGet("btnSaveWash")?.addEventListener("click", saveWashJob);
  safeGet("btnAddWash")?.addEventListener("click", openAddWashModal);

  // 🔁 Autofill
  safeGet("uniformCode")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      autofillUniformInfo();
    }
  });
  safeGet("color")?.addEventListener("change", autofillEmployeeInfo);

  // ❌ Close Modal
  safeGet("btnCloseModal")?.addEventListener("click", () => toggleModal(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleModal(false);
  });

  // 📤 Export CSV
  safeGet("btnExportWashHistoryCSV")?.addEventListener(
    "click",
    exportWashHistoryToCSV
  );
  safeGet("btnExportCSV")?.addEventListener("click", exportWashToCSV);

  // 🧪 Handle ESD Fail (Delegated)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-esd-fail")) {
      const id = e.target.dataset.id;
      handleESDTestFail(id);
    }
  });
  
}

// ============================ 🧼 FORM & MODAL ============================

/**
 * เปิดหรือปิด Modal การเพิ่ม/แก้ไขงานซัก
 * @param {boolean} show - true = เปิด, false = ปิด
 */
function toggleModal(show) {
  const modal = document.getElementById("washModal");
  if (!modal) return;
  modal.style.display = show ? "flex" : "none";

  if (!show) clearWashForm();
}

/**
 * เคลียร์ข้อมูลในฟอร์มทั้งหมดเมื่อปิด Modal
 */
function clearWashForm() {
  const inputIds = ["empId", "empName", "uniformCode", "editIndex", "size"];

  inputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  const colorSelect = document.getElementById("color");
  if (colorSelect) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colorSelect.disabled = true;
  }
}

// ============================ 🆕 ADD / EDIT WASH ============================

/**
 * เปิด Modal เพิ่มงานซักใหม่ พร้อมตั้งค่าชื่อหัวข้อ
 */
export function openAddWashModal() {
  clearWashForm(); // ✅ เคลียร์ข้อมูลก่อน
  const modal = document.getElementById("washModal");
  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Add Wash Job";
  if (modal) modal.style.display = "flex";
}

/**
 * เปิด Modal แก้ไขงานซัก พร้อมโหลดข้อมูลเดิม
 * @param {string} id - รหัสเอกสารที่ต้องการแก้ไข
 */
export async function openEditWashModal(id) {
  const data = await getWashJobById(id);
  if (!data) return alert("❌ ไม่พบข้อมูล");

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("editIndex", id);
  setValue("uniformCode", data.uniformCode);
  setValue("color", data.color);
  setValue("empId", data.empId);
  setValue("empName", data.empName);

  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Edit Wash Job";

  toggleModal(true);
}

// ============================ 💾 SAVE WASH ============================
async function saveWashJob() {
  const uniformCode = document.getElementById("uniformCode")?.value.trim();
  const color = document.getElementById("color")?.value;
  const empId = document.getElementById("empId")?.value.trim();
  const empName = document.getElementById("empName")?.value.trim();
  const size = document.getElementById("size")?.value.trim() || "";

  if (!uniformCode || !color || !empId) {
    showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
    return;
  }

  try {
    showLoading("🔄 ตรวจสอบและบันทึก...");

    // 🔁 ตรวจสอบ Duplicate
    const allWashes = await getAllWashes();
    const duplicate = allWashes.find(
      (w) =>
        w.uniformCode === uniformCode &&
        w.color === color &&
        !["ESD Passed", "Scrap"].includes(w.status)
    );
    if (duplicate) {
      showToast("ยูนิฟอร์มรหัสนี้กำลังอยู่ระหว่างการซัก", "error");
      return;
    }

    const washId = await generateWashId();
    const rewashCount = await getRewashCount(uniformCode, color);

    // 🛑 ถ้าซักเกิน 3 ครั้ง → ทำลาย
    if (rewashCount > 3) {
      const scrapData = {
        washId,
        empId,
        empName,
        uniformCode,
        color,
        size,
        rewashCount,
        status: "Scrap",
        testResult: "FAIL",
        createdAt: new Date().toISOString(),
        testDate: new Date().toISOString(),
      };
      await addToWashHistory(scrapData);
      await scrapUniform(uniformCode, color);
      showToast("ซักเกิน 3 ครั้ง - ทำลายชุดแล้ว", "warning");
      return;
    }

    // ✅ เตรียมข้อมูล + สถานะ
    const status =
      rewashCount > 0 ? `Waiting-Rewash #${rewashCount}` : "Waiting to Send";

    const washData = {
      washId,
      empId,
      empName,
      uniformCode,
      color,
      size,
      status,
      rewashCount,
      createdAt: new Date().toISOString(),
    };

    if (rewashCount > 0) {
      await setRewashCount(uniformCode, color, rewashCount);
    }

    await addWashJob(washData, washId);
    toggleModal(false);

    // 🔄 อัปเดตข้อมูลใหม่
    const updatedWashes = await getAllWashes();
    renderWashTable(updatedWashes);
    renderWashSummary(updatedWashes);

    showToast("บันทึกงานซักเรียบร้อย", "success");
  } catch (error) {
    console.error("❌ saveWashJob error:", error);
    showToast("เกิดข้อผิดพลาดในการบันทึก", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 🗑️ DELETE WASH ============================
export function confirmDeleteWash(id) {
  confirmDeleteModal(id, async (confirmedId) => {
    try {
      showLoading("🗑️ กำลังลบข้อมูล...");

      const wash = await getWashJobById(confirmedId);

      // 🟡 หากสถานะเป็น Waiting → ปรับสถานะยูนิฟอร์มกลับไป in-use
      if (wash?.status?.includes("Waiting")) {
        const matched = await getUniformByCode(wash.uniformCode, wash.color);
        if (matched.length > 0) {
          await updateDoc(doc(db, "InventoryDB", matched[0].id), {
            status: "in-use",
            rewashCount: wash.rewashCount || 0,
          });
        }
      }

      // 🧼 ลบงานซัก และอัปเดตตาราง
      await deleteWashJob(confirmedId);
      const updated = await getAllWashes();
      renderWashTable(updated);
      renderWashSummary(updated);

      showToast("ลบข้อมูลเรียบร้อยแล้ว", "success");
    } catch (error) {
      console.error("❌ ลบข้อมูลล้มเหลว:", error);
      showToast("ลบข้อมูลไม่สำเร็จ", "error");
    } finally {
      hideLoading();
    }
  });
}

// ============================ 🧠 AUTO-FILL ============================

async function autofillUniformInfo() {
  const code = document.getElementById("uniformCode").value.trim();
  const sizeInput = document.getElementById("size");
  const colorSelect = document.getElementById("color");

  if (!code) return;

  try {
    const uniforms = await getUniformByCode(code);

    // ❌ ถ้าไม่พบยูนิฟอร์ม
    if (!uniforms.length) {
      showToast("ไม่พบยูนิฟอร์มรหัสนี้ในระบบ", "error");
      sizeInput.value = "";
      colorSelect.innerHTML = '<option value="">No Color Available</option>';
      colorSelect.disabled = true;
      return;
    }

    // ✅ กรอกขนาดอัตโนมัติ
    sizeInput.value = uniforms[0].UniformSize || "";

    // 🎨 สร้างรายการสีแบบไม่ซ้ำ
    const uniqueColors = [...new Set(uniforms.map((u) => u.UniformColor))];
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    uniqueColors.forEach((color) => {
      const opt = document.createElement("option");
      opt.value = color;
      opt.textContent = color;
      colorSelect.appendChild(opt);
    });

    colorSelect.disabled = false;
  } catch (error) {
    console.error("❌ Error in autofillUniformInfo:", error);
    showToast("เกิดข้อผิดพลาดขณะโหลดข้อมูลยูนิฟอร์ม", "error");
  }
}

async function autofillEmployeeInfo() {
  const code = document.getElementById("uniformCode").value.trim();
  const color = document.getElementById("color").value;

  try {
    const matches = await getUniformByCode(code, color);

    if (matches.length > 0) {
      const u = matches[0];
      document.getElementById("empId").value = u.EmployeeID || "";
      document.getElementById("empName").value = u.EmployeeName || "";
      document.getElementById("size").value = u.UniformSize || "";
    }
  } catch (error) {
    console.error("❌ Error in autofillEmployeeInfo:", error);
    showToast("เกิดข้อผิดพลาดขณะกรอกข้อมูลพนักงาน", "error");
  }
}

// ============================ ✅ ESD RESULT ============================

export async function handleESDRequest(id) {
  try {
    showLoading("🔍 ตรวจสอบ ESD...");
    const data = await getWashJobById(id);

    if (!data || data.status !== "Completed") {
      showToast("ไม่พบข้อมูลหรือยังไม่อยู่ในสถานะ Completed", "warning");
      return;
    }

    openESDModal(data);
  } catch (err) {
    console.error("❌ handleESDRequest error:", err);
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล ESD", "error");
  } finally {
    hideLoading();
  }
}

export async function markAsESDPass(washData) {
  try {
    showLoading("✅ บันทึกผล ESD ผ่าน...");

    const updatedData = {
      ...washData,
      testResult: "PASS",
      testDate: new Date().toISOString(),
      status: "ESD Passed",
    };

    await setRewashCount(washData.uniformCode, washData.color, 0);
    await addToWashHistory(updatedData);
    await returnToStockAfterESD(updatedData);

    const washes = await getAllWashes();
    await renderWashTable(washes);
    await renderWashSummary(washes);

    showToast("ESD ผ่านเรียบร้อย", "success");
  } catch (err) {
    console.error("❌ markAsESDPass error:", err);
    showToast("เกิดข้อผิดพลาด", "error");
  } finally {
    hideLoading();
  }
}

export async function markAsESDFail(washData) {
  try {
    showLoading("⛔ บันทึกผล ESD ไม่ผ่าน...");

    const currentCount = await getRewashCount(
      washData.uniformCode,
      washData.color
    );
    const newCount = currentCount + 1;

    const failData = {
      ...washData,
      testResult: "FAIL",
      testDate: new Date().toISOString(),
      status: "ESD Failed",
    };

    await addToWashHistory(failData);
    await deleteWashJob(washData.washId);
    await setRewashCount(washData.uniformCode, washData.color, newCount);

    if (newCount > 3) {
      await scrapUniform(washData.uniformCode, washData.color);
    }
  } catch (err) {
    console.error("❌ markAsESDFail error:", err);
    showToast("เกิดข้อผิดพลาดในการบันทึก ESD ไม่ผ่าน", "error");
  } finally {
    hideLoading();
  }
}

export async function handleESDTestFail(washData) {
  try {
    showLoading("⛔ ประมวลผล ESD ไม่ผ่าน...");
    await markAsESDFail(washData);

    const washes = await getAllWashes();
    await renderWashTable(washes);
    await renderWashSummary(washes);

    showToast("ESD ไม่ผ่าน - ดำเนินการเรียบร้อย", "warning");
  } catch (err) {
    console.error("❌ handleESDTestFail error:", err);
    showToast("เกิดข้อผิดพลาดในการประมวลผล ESD ไม่ผ่าน", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 🔁 AUTO UPDATE STATUS ============================

export async function checkAndUpdateWashStatus(wash) {
  if (!wash?.createdAt || ["Scrap", "ESD Passed"].includes(wash.status)) {
    return wash;
  }

  const createdAt = new Date(wash.createdAt);
  const now = new Date();
  const daysElapsed = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const rewashCount = wash.rewashCount || 0;

  let updatedStatus = wash.status;

  if (daysElapsed >= 3) {
    updatedStatus = "Completed";
  } else if (daysElapsed >= 1) {
    updatedStatus =
      rewashCount === 0 ? "Washing" : `Re-Washing #${rewashCount}`;
  } else {
    updatedStatus =
      rewashCount === 0 ? "Waiting to Send" : `Waiting-Rewash #${rewashCount}`;
  }

  if (updatedStatus !== wash.status) {
    wash.status = updatedStatus;
    await updateWashJob(wash.id, { status: updatedStatus });
  }

  return wash;
}

// ============================ 📅 SHIFT WASH DATE ============================

export async function shiftWashDate(washId, days) {
  try {
    const washJob = await getWashJobById(washId);
    if (!washJob || !washJob.createdAt) {
      console.error(`❌ ไม่พบข้อมูลงานซักหรือวันที่ไม่ถูกต้อง: ${washId}`);
      showToast("ไม่พบข้อมูลงานซัก หรือวันที่ไม่ถูกต้อง", "error");
      return;
    }

    const originalDate = new Date(washJob.createdAt);
    const shiftedDate = new Date(originalDate);
    shiftedDate.setDate(originalDate.getDate() + days);

    await updateWashJob(washId, {
      createdAt: shiftedDate.toISOString(),
    });

    const updatedList = await getAllWashes();
    await renderWashTable(updatedList);
    await renderWashSummary(updatedList);

    const formatted = shiftedDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    showToast(`ขยับวันที่เรียบร้อย → ${formatted}`, "success");
  } catch (err) {
    console.error("❌ shiftWashDate error:", err);
    showToast("เกิดข้อผิดพลาดในการขยับวันที่", "error");
  }
}

// ============================ 📤 EXPORT CSV ============================
async function exportWashToCSV() {
  try {
    showLoading("📤 กำลังส่งออกข้อมูลงานซัก...");

    const washes = await getAllWashes();
    if (!washes || washes.length === 0) {
      showToast("ไม่มีข้อมูลให้ส่งออก", "warning");
      hideLoading();
      return;
    }

    // 🧾 กำหนดหัวตาราง
    const headers = [
      "Wash ID",
      "Uniform Code",
      "Color",
      "Size",
      "Employee ID",
      "Employee Name",
      "Status",
      "Rewash Count",
      "Created At",
    ];

    // 🧱 แปลงข้อมูลเป็นแถว ๆ สำหรับ CSV
    const rows = washes.map((wash) => [
      wash.washId || "",
      wash.uniformCode || "",
      wash.color || "",
      wash.size || "",
      wash.empId || "",
      wash.empName || "",
      wash.status || "",
      wash.rewashCount ?? 0,
      formatDate(wash.createdAt),
    ]);

    // 🧠 Escape ค่า + แปลงเป็น CSV string
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // 📦 สร้างไฟล์ CSV ด้วย BOM เพื่อให้ Excel รองรับ UTF-8
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // 📤 สร้างลิงก์ดาวน์โหลด
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast("ส่งออก CSV สำเร็จ", "success");
  } catch (err) {
    console.error("❌ exportWashToCSV error:", err);
    showToast("เกิดข้อผิดพลาดในการส่งออก", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 📤 EXPORT WASH HISTORY CSV ============================
safeGet("btnExportWashHistoryCSV")?.addEventListener(
  "click",
  exportWashHistoryToCSV
);

async function exportWashHistoryToCSV() {
  try {
    showLoading("📤 กำลังส่งออกประวัติการซัก...");

    const history = await getAllWashHistory();
    if (!history || history.length === 0) {
      showToast("ไม่มีประวัติการซักให้ส่งออก", "warning");
      hideLoading();
      return;
    }

    // ✅ กำหนดหัวตาราง CSV
    const headers = [
      "Wash ID",
      "Uniform Code",
      "Color",
      "Size",
      "Employee ID",
      "Employee Name",
      "Status",
      "Rewash Count",
      "Test Result",
      "Test Date",
      "Created At",
    ];

    // 🧱 เตรียมข้อมูลในรูปแบบ array
    const rows = history.map((entry) => [
      entry.washId || "",
      entry.uniformCode || "",
      entry.color || "",
      entry.size || "",
      entry.empId || "",
      entry.empName || "",
      entry.status || "",
      entry.rewashCount ?? 0,
      entry.testResult || "-",
      formatDate(entry.testDate),
      formatDate(entry.createdAt),
    ]);

    // 🧠 แปลงข้อมูลเป็น CSV พร้อม escape เครื่องหมาย "
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // 📦 สร้างไฟล์ CSV พร้อม BOM
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    // ⬇️ Trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-history-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast("ส่งออกประวัติการซักเรียบร้อย", "success");
  } catch (err) {
    console.error("❌ Export Wash History error:", err);
    showToast("เกิดข้อผิดพลาดในการส่งออก", "error");
  } finally {
    hideLoading();
  }
}
