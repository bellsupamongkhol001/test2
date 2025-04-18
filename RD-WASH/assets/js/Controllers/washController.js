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

import {
 showToast
} from "../Utils/toast.js";

import {

} from "../Utils/globalUtils.js";
// ============================ 🔄 INITIALIZATION ============================
let currentPage = 1;
const rowsPerPage = 10;

export async function initWashPage() {
  try {
    showLoading("🔄 กำลังโหลดข้อมูลหน้า Wash...");
    setupEventListeners();

    const rawWashes = await getAllWashes();
    const historyData = await getAllWashHistory();

    const updatedWashes = await Promise.all(rawWashes.map(checkAndUpdateWashStatus));

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
  safeGet("search")?.addEventListener("input", debounce(renderWashTable, 300));
  safeGet("filterStatus")?.addEventListener("change", renderWashTable);
  safeGet("btnSaveWash")?.addEventListener("click", saveWashJob);
  safeGet("uniformCode")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      autofillUniformInfo();
    }
  });
  safeGet("color")?.addEventListener("change", autofillEmployeeInfo);
  safeGet("btnAddWash")?.addEventListener("click", openAddWashModal);
  safeGet("btnCloseModal")?.addEventListener("click", () => toggleModal(false));
  safeGet("btnExportWashHistoryCSV")?.addEventListener("click", exportWashHistoryToCSV);
  safeGet("btnExportCSV")?.addEventListener("click", exportWashToCSV);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleModal(false);
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-esd-fail")) {
      const id = e.target.dataset.id;
      handleESDTestFail(id);
    }
  });
}


// ============================ 🧼 FORM & MODAL ============================
function toggleModal(show) {
  const modal = document.getElementById("washModal");
  modal.style.display = show ? "flex" : "none";
  if (!show) clearForm();
}

function clearForm() {
  const fields = ["empId", "empName", "uniformCode", "editIndex", "size"];
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const colorSelect = document.getElementById("color");
  if (colorSelect) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colorSelect.disabled = true;
  }
}

// ============================ 🆕 ADD / EDIT WASH ============================
export function openAddWashModal() {
  clearForm();
  const modal = document.getElementById("washModal");
  document.getElementById("modalTitle").textContent = "Add Wash Job";
  modal.style.display = "flex";
}

export async function openEditWash(id) {
  const data = await getWashJobById(id);
  if (!data) return alert("❌ ไม่พบข้อมูล");

  document.getElementById("editIndex").value = id;
  document.getElementById("uniformCode").value = data.uniformCode;
  document.getElementById("color").value = data.color;
  document.getElementById("empId").value = data.empId;
  document.getElementById("empName").value = data.empName;

  toggleModal(true);
}

// ============================ 💾 SAVE WASH ============================
async function saveWashJob() {
  const uniformCode = document.getElementById("uniformCode").value.trim();
  const color = document.getElementById("color").value;
  const empId = document.getElementById("empId").value.trim();
  const empName = document.getElementById("empName").value.trim();
  const size = document.getElementById("size")?.value.trim() || "";

  if (!uniformCode || !color || !empId) {
    showToast("⚠️ กรุณากรอกข้อมูลให้ครบ", "warning");
    return;
  }

  try {
    showLoading("🔄 ตรวจสอบและบันทึก...");

    const allWashes = await getAllWashes();
    const duplicate = allWashes.find(
      (w) =>
        w.uniformCode === uniformCode &&
        w.color === color &&
        w.status !== "ESD Passed" &&
        w.status !== "Scrap"
    );

    if (duplicate) {
      showToast("❌ ยูนิฟอร์มรหัสนี้กำลังอยู่ระหว่างการซัก", "error");
      hideLoading();
      return;
    }

    const rewashCount = await getRewashCount(uniformCode, color);
    const washId = generateWashId();

    if (rewashCount > 3) {
      const scrapData = {
        washId,
        empId,
        empName,
        uniformCode,
        color,
        size,
        createdAt: new Date().toISOString(),
        status: "Scrap",
        rewashCount,
        testResult: "FAIL",
        testDate: new Date().toISOString(),
      };
      await addToWashHistory(scrapData);
      await scrapUniform(uniformCode, color);
      showToast("⛔ ชุดนี้ถูกซักเกิน 3 ครั้ง - ถูกทำลายแล้ว", "warning");
      hideLoading();
      return;
    }

    const status =
      rewashCount > 0 ? `Waiting-Rewash #${rewashCount}` : "Waiting to Send";
    if (rewashCount > 0) await setRewashCount(uniformCode, color, rewashCount);

    const newWash = {
      washId,
      empId,
      empName,
      uniformCode,
      color,
      size,
      createdAt: new Date().toISOString(),
      status,
      rewashCount,
    };

    await addWashJob(newWash, washId);
    toggleModal(false);

    const updatedWashes = await getAllWashes();
    await renderWashTable(updatedWashes);
    await renderWashSummary(updatedWashes);

    showToast("✅ บันทึกงานซักเรียบร้อย", "success");
  } catch (err) {
    console.error("saveWashJob error:", err);
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
      if (wash?.status?.includes("Waiting")) {
        const snap = await getUniformByCode(wash.uniformCode, wash.color);
        if (snap.length > 0) {
          await updateDoc(doc(db, "InventoryDB", snap[0].id), {
            status: "in-use",
            rewashCount: wash.rewashCount || 0,
          });
        }
      }
      await deleteWashJob(confirmedId);
      const washes = await getAllWashes();
      await renderWashTable(washes);
      await renderWashSummary(washes);
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

  const uniforms = await getUniformByCode(code);
  if (!uniforms.length) {
    showToast("❌ ไม่พบยูนิฟอร์มรหัสนี้ในระบบ", "error");
    sizeInput.value = "";
    colorSelect.innerHTML = '<option value="">No Color Available</option>';
    colorSelect.disabled = true;
    return;
  }

  sizeInput.value = uniforms[0].UniformSize || "";

  const uniqueColors = [...new Set(uniforms.map((u) => u.UniformColor))];
  colorSelect.innerHTML = '<option value="">Select Color</option>';
  uniqueColors.forEach((color) => {
    const opt = document.createElement("option");
    opt.value = color;
    opt.textContent = color;
    colorSelect.appendChild(opt);
  });
  colorSelect.disabled = false;
}

async function autofillEmployeeInfo() {
  const code = document.getElementById("uniformCode").value.trim();
  const color = document.getElementById("color").value;
  const matches = await getUniformByCode(code, color);

  if (matches.length > 0) {
    const u = matches[0];
    document.getElementById("empId").value = u.EmployeeID || "";
    document.getElementById("empName").value = u.EmployeeName || "";
    document.getElementById("size").value = u.UniformSize || "";
  }
}

// ============================ ✅ ESD RESULT ============================
export async function handleESDRequest(id) {
  try {
    showLoading("🔍 ตรวจสอบ ESD...");
    const data = await getWashJobById(id);
    if (!data || data.status !== "Completed") {
      showToast("❌ ไม่พบข้อมูลหรือยังไม่อยู่ในสถานะ Completed", "warning");
      return;
    }
    openESDModal(data);
  } catch (err) {
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล ESD", "error");
  } finally {
    hideLoading();
  }
}

export async function markAsESDPass(washData) {
  try {
    showLoading("✅ บันทึกผล ESD ผ่าน...");
    await setRewashCount(washData.uniformCode, washData.color, 0);
    await addToWashHistory({
      ...washData,
      testResult: "PASS",
      testDate: new Date().toISOString(),
      status: "ESD Passed",
    });
    await returnToStockAfterESD({
      ...washData,
      rewashCount: 0,
      status: "ESD Passed",
    });

    const washes = await getAllWashes();
    await renderWashTable(washes);
    await renderWashSummary(washes);

    showToast("✅ ESD ผ่านเรียบร้อย", "success");
  } catch (err) {
    console.error("markAsESDPass error:", err);
    showToast("เกิดข้อผิดพลาด", "error");
  } finally {
    hideLoading();
  }
}

export async function markAsESDFail(washData) {
  try {
    showLoading("⛔ กำลังบันทึกผล ESD ไม่ผ่าน...");
    await addToWashHistory({
      ...washData,
      testResult: "FAIL",
      testDate: new Date().toISOString(),
      status: "ESD Failed",
    });
    await deleteWashJob(washData.washId);

    const currentCount = await getRewashCount(
      washData.uniformCode,
      washData.color
    );
    const newCount = currentCount + 1;
    await setRewashCount(washData.uniformCode, washData.color, newCount);
    if (newCount > 3) {
      await scrapUniform(washData.uniformCode, washData.color);
    }
  } catch (err) {
    console.error("markAsESDFail error:", err);
    showToast("เกิดข้อผิดพลาดในการประมวลผล ESD ไม่ผ่าน", "error");
  } finally {
    hideLoading();
  }
}

export async function handleESDTestFail(washData) {
  try {
    showLoading("⛔ กำลังประมวลผล ESD ไม่ผ่าน...");
    await markAsESDFail(washData);
    const washes = await getAllWashes();
    await renderWashTable(washes);
    await renderWashSummary(washes);
    showToast("❌ ESD ไม่ผ่าน - ดำเนินการเรียบร้อย", "warning");
  } catch (err) {
    console.error("❌ handleESDTestFail error:", err);
    showToast("เกิดข้อผิดพลาดในการประมวลผล ESD ไม่ผ่าน", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 🔁 AUTO UPDATE STATUS ============================
export async function checkAndUpdateWashStatus(wash) {
  if (
    !wash.createdAt ||
    wash.status === "Scrap" ||
    wash.status === "ESD Passed"
  )
    return wash;

  const created = new Date(wash.createdAt);
  const now = new Date();
  const diffInDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const count = wash.rewashCount || 0;

  let newStatus = "";
  if (diffInDays >= 3) newStatus = "Completed";
  else if (diffInDays >= 1)
    newStatus = count === 0 ? "Washing" : `Re-Washing #${count}`;
  else newStatus = count === 0 ? "Waiting to Send" : `Waiting-Rewash #${count}`;

  if (newStatus !== wash.status) {
    wash.status = newStatus;
    await updateWashJob(wash.id, { status: newStatus });
  }

  return wash;
}

// ============================ 📅 SHIFT WASH DATE ============================
export async function shiftWashDate(washId, days) {
  try {
    const washJob = await getWashJobById(washId);
    if (!washJob) {
      console.error(`❌ ไม่พบข้อมูลงานซัก: ${washId}`);
      showToast("❌ ไม่พบข้อมูลงานซัก", "error");
      return;
    }

    const newDate = new Date(washJob.createdAt);
    newDate.setDate(newDate.getDate() + days);

    await updateWashJob(washId, { createdAt: newDate.toISOString() });
    const updated = await getAllWashes();
    await renderWashTable(updated);
    await renderWashSummary(updated);

    showToast(
      `✅ วันที่ของงานซักได้ถูกขยับเป็น ${newDate.toLocaleDateString()}`,
      "success"
    );
  } catch (err) {
    console.error("❌ shiftWashDate error:", err);
    showToast("❌ เกิดข้อผิดพลาดในการขยับวันที่", "error");
  }
}

// ============================ 📤 EXPORT CSV ============================
async function exportWashToCSV() {
  try {
    showLoading("📤 กำลังส่งออก CSV...");

    const washes = await getAllWashes();
    if (!washes || washes.length === 0) {
      showToast("⚠️ ไม่มีข้อมูลให้ส่งออก", "warning");
      hideLoading();
      return;
    }

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

    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-jobs-${Date.now()}.csv`;
    link.click();

    showToast("✅ ส่งออก CSV เรียบร้อย", "success");
  } catch (err) {
    console.error("❌ Export CSV error:", err);
    showToast("เกิดข้อผิดพลาดในการส่งออก", "error");
  } finally {
    hideLoading();
  }
}

// ============================ 📤 EXPORT WASH HISTORY CSV ============================
document
  .getElementById("btnExportWashHistoryCSV")
  ?.addEventListener("click", exportWashHistoryToCSV);

async function exportWashHistoryToCSV() {
  try {
    showLoading("📤 กำลังส่งออกประวัติการซัก...");

    const history = await getAllWashHistory();
    if (!history || history.length === 0) {
      showToast("⚠️ ไม่มีประวัติการซักให้ส่งออก", "warning");
      hideLoading();
      return;
    }

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

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-history-${Date.now()}.csv`;
    link.click();

    showToast("✅ ส่งออกประวัติการซักเรียบร้อย", "success");
  } catch (err) {
    console.error("❌ Export Wash History error:", err);
    showToast("เกิดข้อผิดพลาดในการส่งออก", "error");
  } finally {
    hideLoading();
  }
}

function safeGet(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Element #${id} not found`);
  return el;
}

// ============================ 🚀 AUTO RUN ============================
//initWashPage();
