// ============================ 📦 IMPORT MODULE ============================
import {
  doc,
  updateDoc,
  query,            
  where,
  collection,
  getDocs
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

import { debounce, safeGet } from "../Utils/globalUtils.js";

let currentPage = 1;
const rowsPerPage = 10;

let currentWashes = [];

export async function initWashPage() {
  try {
    showLoading("🔄 กำลังโหลดข้อมูลหน้า Wash...");

    setupEventListeners();

    const [rawWashes, historyData] = await Promise.all([
      getAllWashes(),
      getAllWashHistory(),
    ]);

    currentWashes = await Promise.all(
      rawWashes.map(checkAndUpdateWashStatus)
    );

    renderWashTable(currentWashes);
    renderWashSummary(currentWashes);
    renderWashHistory(historyData);
  } catch (error) {
    console.error("❌ Error loading Wash page:", error);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "❌ ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
    });
  } finally {
    hideLoading();
  }
}


function setupEventListeners() {
  safeGet("searchInput")?.addEventListener("input", debounce(renderWashTable, 300));
  safeGet("filterStatus")?.addEventListener("change", renderWashTable);

  safeGet("btnSaveWash")?.addEventListener("click", saveWashJob);
  safeGet("btnAddWash")?.addEventListener("click", openAddWashModal);

  safeGet("uniformCode")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      autofillUniformInfo();
    }
  });
  safeGet("color")?.addEventListener("change", autofillEmployeeInfo);

  safeGet("btnCloseModal")?.addEventListener("click", () => toggleModal(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleModal(false);
  });

  safeGet("btnExportWashHistoryCSV")?.addEventListener(
    "click",
    exportWashHistoryToCSV
  );
  safeGet("btnExportCSV")?.addEventListener("click", exportWashToCSV);
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-esd-fail")) {
      const id = e.target.dataset.id;
      handleESDTestFail(id);
    }
  });
  
}

function toggleModal(show) {
  const modal = document.getElementById("washModal");
  if (!modal) return;
  modal.style.display = show ? "flex" : "none";

  if (!show) clearWashForm();
}

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

export function openAddWashModal() {
  clearWashForm();
  const modal = document.getElementById("washModal");
  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Add Wash Job";
  if (modal) modal.style.display = "flex";
}

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

async function saveWashJob() {
  const saveBtn = document.getElementById("btnSaveWash");
  if (saveBtn) saveBtn.disabled = true;

  const uniformCode = document.getElementById("uniformCode")?.value.trim();
  const color = document.getElementById("color")?.value;
  const empIdRaw = document.getElementById("empId")?.value.trim();
  const empNameRaw = document.getElementById("empName")?.value.trim();
  const size = document.getElementById("size")?.value.trim() || "";

  const empId = empIdRaw || "-";
  const empName = empNameRaw || "-";

  if (!uniformCode || !color) {
    Swal.fire({
      icon: "warning",
      title: "ข้อมูลไม่ครบ",
      text: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
    });
    if (saveBtn) saveBtn.disabled = false;
    return;
  }

  try {
    showLoading("🔄 ตรวจสอบและบันทึก...");

    const q = query(
      collection(db, "WashJobs"),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const snap = await getDocs(q);
    const duplicate = snap.docs.find(doc => {
      const d = doc.data();
      return !["ESD Passed", "Scrap"].includes(d.status);
    });
    if (duplicate) {
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถเพิ่มได้",
        text: "ยูนิฟอร์มรหัสนี้กำลังอยู่ระหว่างการซัก",
      });
      return;
    }

    const washId = await generateWashId();
    const rewashCount = await getRewashCount(uniformCode, color);

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
      Swal.fire({
        icon: "warning",
        title: "ทำลายชุดแล้ว",
        text: "ซักเกิน 3 ครั้ง - ชุดนี้ถูกทำลายเรียบร้อยแล้ว",
      });
      return;
    }

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

    const updatedWashes = await getAllWashes();
    renderWashTable(updatedWashes);
    renderWashSummary(updatedWashes);

    Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: "บันทึกงานซักเรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("❌ saveWashJob error:", error);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่",
    });
  } finally {
    hideLoading();
    if (saveBtn) saveBtn.disabled = false;
  }
}

export function confirmDeleteWash(id) {
  confirmDeleteModal(id, async (confirmedId) => {
    try {
      showLoading("🗑️ กำลังลบข้อมูล...");

      const wash = await getWashJobById(confirmedId);

      if (wash?.status?.includes("Waiting")) {
        const matched = await getUniformByCode(wash.uniformCode, wash.color);
        if (matched.length > 0) {
          await updateDoc(doc(db, "InventoryDB", matched[0].id), {
            status: "in-use",
            rewashCount: wash.rewashCount || 0,
          });
        }
      }

      await deleteWashJob(confirmedId);

      const rowEl = document.querySelector(`button.delete[data-id="${confirmedId}"]`)?.closest("tr");
      if (rowEl) rowEl.remove();

      await Swal.fire({
        icon: "success",
        title: "ลบข้อมูลเรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("❌ ลบข้อมูลล้มเหลว:", error);
      await Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่",
      });
    } finally {
      hideLoading();
    }
  });
}


const uniformCache = {};

async function autofillUniformInfo() {
  const code = document.getElementById("uniformCode")?.value.trim();
  const sizeInput = document.getElementById("size");
  const colorSelect = document.getElementById("color");

  if (!code) return;

  try {
    let uniforms = uniformCache[code];

    if (!uniforms) {
      uniforms = await getUniformByCode(code);
      uniformCache[code] = uniforms; 
    }

    if (!uniforms || uniforms.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "ไม่พบยูนิฟอร์ม",
        text: "ไม่พบยูนิฟอร์มรหัสนี้ในระบบ",
      });

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
  } catch (error) {
    console.error("❌ Error in autofillUniformInfo:", error);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "โหลดข้อมูลยูนิฟอร์มล้มเหลว กรุณาลองใหม่",
    });
  }
}

const employeeCache = {};

async function autofillEmployeeInfo() {
  const code = document.getElementById("uniformCode")?.value.trim();
  const color = document.getElementById("color")?.value;

  if (!code || !color) return;

  try {
    const matches = await getUniformByCode(code, color);

    if (matches.length > 0) {
      const u = matches[0];
      document.getElementById("empId").value = u.EmployeeID || "-";
      document.getElementById("empName").value = u.EmployeeName || "-";
      document.getElementById("size").value = u.UniformSize || "";
    } else {
      document.getElementById("empId").value = "-";
      document.getElementById("empName").value = "-";
      document.getElementById("size").value = "";
    }
  } catch (error) {
    console.error("❌ Error in autofillEmployeeInfo:", error);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถกรอกข้อมูลพนักงานได้ กรุณาลองใหม่",
    });
  }
}


const washJobCache = {};

export async function handleESDRequest(id) {
  try {
    showLoading("🔍 ตรวจสอบ ESD...");

    let data = washJobCache[id];

    // 📦 ถ้ายังไม่เคยโหลด
    if (!data) {
      data = await getWashJobById(id);
      washJobCache[id] = data;
    }

    if (!data || data.status !== "Completed") {
      await Swal.fire({
        icon: "warning",
        title: "แจ้งเตือน",
        text: "ไม่พบข้อมูล หรือสถานะยังไม่เป็น Completed",
      });
      return;
    }

    openESDModal(data);
  } catch (err) {
    console.error("❌ handleESDRequest error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถโหลดข้อมูล ESD ได้",
    });
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

    if ((washData.rewashCount ?? 0) > 0) {
      await setRewashCount(washData.uniformCode, washData.color, 0);
    }

    await addToWashHistory(updatedData);
    await returnToStockAfterESD(updatedData);

    renderWashTableRow?.(updatedData); 
    updateWashSummaryCache?.(updatedData);

    await Swal.fire({
      icon: "success",
      title: "ESD ผ่านเรียบร้อย",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ markAsESDPass error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถบันทึกผล ESD ได้",
    });
  } finally {
    hideLoading();
  }
}

export async function markAsESDFail(washData) {
  try {
    showLoading("⛔ บันทึกผล ESD ไม่ผ่าน...");

    const currentCount = washData.rewashCount ?? 0;
    const newCount = currentCount + 1;

    const failData = {
      ...washData,
      testResult: "FAIL",
      testDate: new Date().toISOString(),
      status: "ESD Failed",
    };

    await addToWashHistory(failData);
    await deleteWashJob(washData.washId);

    if (newCount <= 3) {
      await setRewashCount(washData.uniformCode, washData.color, newCount);
    }

    if (newCount > 3) {
      await scrapUniform(washData.uniformCode, washData.color);
    }

    removeWashRowFromTable?.(washData.washId);
    updateWashSummaryCache?.();

    await Swal.fire({
      icon: "warning",
      title: "ESD ไม่ผ่าน",
      text: "ดำเนินการเรียบร้อยแล้ว",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ markAsESDFail error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถบันทึกผล ESD ไม่ผ่านได้",
    });
  } finally {
    hideLoading();
  }
}

export async function handleESDTestFail(washData) {
  try {
    showLoading("⛔ ประมวลผล ESD ไม่ผ่าน...");

    await markAsESDFail(washData);

    const row = document.querySelector(`[data-id="${washData.washId}"]`)?.closest("tr");
    if (row) row.remove();

    updateWashSummaryCache?.();

    await Swal.fire({
      icon: "warning",
      title: "ESD ไม่ผ่าน",
      text: "ดำเนินการเรียบร้อยแล้ว",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ handleESDTestFail error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถประมวลผล ESD ไม่ผ่านได้",
    });
  } finally {
    hideLoading();
  }
}

export async function checkAndUpdateWashStatus(wash) {
  if (!wash?.createdAt || ["Scrap", "ESD Passed"].includes(wash.status)) {
    return wash;
  }

  const createdAt = new Date(wash.createdAt);
  const now = new Date();
  const daysElapsed = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const rewashCount = wash.rewashCount || 0;

  let newStatus;

  if (daysElapsed >= 3) {
    newStatus = "Completed";
  } else if (daysElapsed >= 1) {
    newStatus = rewashCount === 0 ? "Washing" : `Re-Washing #${rewashCount}`;
  } else {
    newStatus = rewashCount === 0 ? "Waiting to Send" : `Waiting-Rewash #${rewashCount}`;
  }

  if (newStatus !== wash.status) {
    console.log(`🔁 Status changed: ${wash.status} → ${newStatus}`);
    await updateWashJob(wash.id, { status: newStatus });
    wash.status = newStatus;
  }

  return wash;
}

export async function shiftWashDate(washId, days) {
  try {
    const washJob = await getWashJobById(washId);
    if (!washJob || !washJob.createdAt) {
      console.error(`❌ ไม่พบข้อมูลงานซักหรือวันที่ไม่ถูกต้อง: ${washId}`);
      await Swal.fire({
        icon: "error",
        title: "ไม่พบข้อมูลงานซัก",
        text: "หรือวันที่ไม่ถูกต้อง",
      });
      return;
    }

    const originalDate = new Date(washJob.createdAt);
    const shiftedDate = new Date(originalDate);
    shiftedDate.setDate(originalDate.getDate() + days);

    if (originalDate.toISOString() === shiftedDate.toISOString()) {
      await Swal.fire({
        icon: "info",
        title: "ไม่ได้มีการเปลี่ยนวันที่",
      });
      return;
    }

    await updateWashJob(washId, {
      createdAt: shiftedDate.toISOString(),
    });

    const updatedWash = { ...washJob, createdAt: shiftedDate.toISOString() };
    const updatedWashes = await getAllWashes();

    await renderWashTable(updatedWashes);
    await renderWashSummary(updatedWashes);

    const formatted = shiftedDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    await Swal.fire({
      icon: "success",
      title: `ขยับวันที่เรียบร้อยแล้ว`,
      text: `→ ${formatted}`,
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ shiftWashDate error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถขยับวันที่ได้",
    });
  }
}

async function exportWashToCSV() {
  try {
    showLoading("📤 กำลังส่งออกข้อมูลงานซัก...");

    const washes = await getAllWashes();
    if (!washes || washes.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "ไม่มีข้อมูลให้ส่งออก",
      });
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
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-export-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    await Swal.fire({
      icon: "success",
      title: "ส่งออก CSV สำเร็จ",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ exportWashToCSV error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถส่งออกข้อมูลได้",
    });
  } finally {
    hideLoading();
  }
}

safeGet("btnExportWashHistoryCSV")?.addEventListener(
  "click",
  exportWashHistoryToCSV
);

async function exportWashHistoryToCSV() {
  try {
    showLoading("📤 กำลังส่งออกประวัติการซัก...");

    const history = await getAllWashHistory();
    if (!history || history.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "ไม่มีประวัติการซักให้ส่งออก",
      });
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
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash-history-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    await Swal.fire({
      icon: "success",
      title: "ส่งออกประวัติการซักเรียบร้อย",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("❌ Export Wash History error:", err);
    await Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถส่งออกประวัติการซักได้",
    });
  } finally {
    hideLoading();
  }
}
