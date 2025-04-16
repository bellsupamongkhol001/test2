import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "./firebaseConfig.js";

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
} from "./washModel.js";

import {
  renderWashTable,
  renderWashHistory,
  renderWashSummary,
  renderPagination,
  openESDModal,
} from "./washView.js";

import {
  debounce,
  showToast,
  formatDate,
  generateWashId,
  showLoading,
  hideLoading,
  confirmDeleteModal,
  getStatusFromDate,
} from "./washUtils.js";

// 📦 เก็บค่าหน้าปัจจุบัน
let currentPage = 1;
const rowsPerPage = 10;

export async function initWashPage() {
  try {
    showLoading("🔄 กำลังโหลดข้อมูลหน้า Wash...");

    setupEventListeners();

    const washData = await getAllWashes();
    const historyData = await getAllWashHistory();

    await renderWashTable(washData);
    await renderWashHistory(historyData);
    await renderWashSummary(washData);
  } catch (error) {
    console.error("❌ Error loading Wash page:", error);
    alert("เกิดข้อผิดพลาดในการโหลดข้อมูล Wash");
  } finally {
    hideLoading();
  }
}

// ✅ ติดตั้ง Event ทั้งหมด
function setupEventListeners() {
  document
    .getElementById("search")
    ?.addEventListener("input", debounce(renderWashTable, 300));

  document
    .getElementById("filterStatus")
    ?.addEventListener("change", renderWashTable);

  document
    .getElementById("btnSaveWash")
    ?.addEventListener("click", saveWashJob);

  document.getElementById("uniformCode")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      autofillUniformInfo();
    }
  });

  document
    .getElementById("color")
    ?.addEventListener("change", autofillEmployeeInfo);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleModal(false);
  });

  document
    .getElementById("btnAddWash")
    .addEventListener("click", openAddWashModal);

  document.getElementById("btnCloseModal")?.addEventListener("click", () => {
    toggleModal(false);
  });

  document.querySelectorAll(".btn-esd-fail").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const washId = e.target.dataset.id;
      await handleESDTestFail(washId);
    });
  });

  //ทดสอบ
}

// ✅ บันทึก
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

    // ✅ ดึงค่า rewashCount จาก InventoryDB
    const rewashCount = await getRewashCount(uniformCode, color);

    let status = "Waiting to Send";
    if (rewashCount > 0) {
      status = `Waiting Rewash #${rewashCount}`;
    }

    const washId = `WASH-${Date.now()}`;
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

// ✅ ลบงานซัก
export function confirmDeleteWash(id) {
  confirmDeleteModal(id, async (confirmedId) => {
    try {
      showLoading("🗑️ กำลังลบข้อมูล...");

      // ✅ ดึงข้อมูล wash ก่อนลบ
      const wash = await getWashJobById(confirmedId);

      // ✅ ถ้ายังไม่ได้ซัก → คืน status เป็น in-use
      if (wash && wash.status?.includes("Waiting")) {
        const snap = await getUniformByCode(wash.uniformCode, wash.color);
        if (snap.length > 0) {
          const docId = snap[0].id;
          await updateDoc(doc(db, "InventoryDB", docId), {
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

// ✅ เปิดฟอร์มแก้ไขข้อมูล
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

// ✅ แสดง/ซ่อน Modal ฟอร์ม
function toggleModal(show) {
  const modal = document.getElementById("washModal"); // ✅ ตรงกันแล้ว
  modal.style.display = show ? "flex" : "none";
  if (!show) clearForm();
}

function clearForm() {
  const fieldsToClear = [
    "empId",
    "empName",
    "uniformCode",
    "editIndex",
    "size",
  ];
  fieldsToClear.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const colorSelect = document.getElementById("color");
  if (colorSelect) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colorSelect.disabled = true;
  }
}

// ✅ autofill สีจากโค้ด
async function autofillUniformInfo() {
  const code = document.getElementById("uniformCode").value.trim();
  const sizeInput = document.getElementById("size");
  const colorSelect = document.getElementById("color");

  if (!code) return;

  const uniforms = await getUniformByCode(code);

  if (!uniforms.length) {
    sizeInput.value = "";
    colorSelect.innerHTML = '<option value="">No Color Available</option>';
    colorSelect.disabled = true;
    return;
  }

  // ✅ ใส่ Size
  sizeInput.value = uniforms[0].size || "";

  // ✅ โหลดสีที่มี
  const uniqueColors = [...new Set(uniforms.map((u) => u.color))];
  colorSelect.innerHTML = '<option value="">Select Color</option>';
  uniqueColors.forEach((color) => {
    const opt = document.createElement("option");
    opt.value = color;
    opt.textContent = color;
    colorSelect.appendChild(opt);
  });

  colorSelect.disabled = false;
}

// ✅ autofill ข้อมูลพนักงาน
async function autofillEmployeeInfo() {
  const code = document.getElementById("uniformCode").value.trim();
  const color = document.getElementById("color").value;
  const matches = await getUniformByCode(code, color);

  if (matches.length > 0) {
    const u = matches[0];
    document.getElementById("empId").value = u.employeeId || "";
    document.getElementById("empName").value = u.employeeName || "";
    document.getElementById("size").value = u.size || ""; // ✅ เพิ่ม Size ด้วย
  } else {
    console.warn("🟡 ไม่พบข้อมูล Employee จาก UniformCode + Color");
  }
}

export function openAddWashModal() {
  clearForm();
  const modal = document.getElementById("washModal");
  document.getElementById("modalTitle").textContent = "Add Wash Job";
  modal.style.display = "flex";
}

export async function markAsESDPass(washData) {
  try {
    showLoading("✅ บันทึกผล ESD ผ่าน...");

    await addToWashHistory({
      ...washData,
      testResult: "PASS",
      testDate: new Date().toISOString(),
      status: "ESD Passed",
    });

    await setRewashCount(washData.uniformCode, washData.color, 0);

    await returnToStockAfterESD(washData);

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

// ฟังก์ชันขยับวันที่ของ Wash Job// ฟังก์ชันขยับวันที่ของ Wash Job
export async function shiftWashDate(washId, days) {
  try {
    // หาข้อมูลงานซักจากฐานข้อมูล
    const washJob = await getWashJobById(washId);
    if (!washJob) {
      console.error(`❌ ไม่พบข้อมูลงานซัก: ${washId}`);
      showToast("❌ ไม่พบข้อมูลงานซัก", "error");
      return;
    }

    // คำนวณวันที่ใหม่จากการเพิ่มหรือลดวัน
    const newDate = new Date(washJob.createdAt);
    newDate.setDate(newDate.getDate() + days);

    // อัพเดตวันใหม่ใน Firestore
    await updateWashJob(washId, { createdAt: newDate.toISOString() });

    // รีเฟรชตารางและสรุปข้อมูล
    await renderWashTable(await getAllWashes());
    await renderWashSummary();
    showToast(
      `✅ วันที่ของงานซักได้ถูกขยับเป็น ${newDate.toLocaleDateString()}`,
      "success"
    );
  } catch (err) {
    console.error("❌ shiftWashDate error:", err);
    showToast("❌ เกิดข้อผิดพลาดในการขยับวันที่", "error");
  }
}

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

  if (diffInDays >= 3) {
    newStatus = "Completed";
  } else if (diffInDays >= 1) {
    newStatus = count === 0 ? "Washing" : `Re-Washing #${count}`;
  } else {
    newStatus = count === 0 ? "Waiting to Send" : `Waiting Rewash #${count}`;
  }

  if (newStatus !== wash.status) {
    wash.status = newStatus;
    await updateWashJob(wash.id, { status: newStatus });
  }

  return wash;
}

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
    markAsESDFail;
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

initWashPage();
