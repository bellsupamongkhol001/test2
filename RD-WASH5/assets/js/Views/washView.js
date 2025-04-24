// ============================ 📦 IMPORT ============================
import { getAllWashes, getAllWashHistory } from "../Models/washModel.js";
import {
  openEditWashModal,
  confirmDeleteWash,
  shiftWashDate,
  checkAndUpdateWashStatus,
  handleESDRequest,
  markAsESDPass,
  markAsESDFail,
  handleESDTestFail,
} from "../Controllers/washController.js";
import {formatDate} from "../Utils/washUtils.js";
import {safeGet} from "../Utils/globalUtils.js";

// ============================ 📋 RENDER MAIN TABLE ============================
/**
 * แสดงรายการงานซักทั้งหมดในตาราง
 * - กรองตามคำค้นและสถานะ
 * - อัปเดตสถานะล่าสุดก่อนแสดง
 * - รองรับการแบ่งหน้า
 * - ผูกปุ่มต่าง ๆ เช่น Delete, ESD, Shift Date
 */
export async function renderWashTable(allWashes = [], page = 1, rowsPerPage = 10) {
  // 🔍 ค่าจากช่องค้นหาและ filter
  const searchInput = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";

  // 🧹 กรองข้อมูลด้วยเงื่อนไขค้นหา + สถานะ
  const filtered = allWashes.filter((w) => {
    const matchesSearch =
      w.washId?.toLowerCase().includes(searchInput) ||
      w.empId?.toLowerCase().includes(searchInput) ||
      w.empName?.toLowerCase().includes(searchInput);
    const matchesStatus = statusFilter ? w.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // 📄 แบ่งหน้า
  const startIndex = (page - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  const tableBody = document.getElementById("washTableBody");
  tableBody.innerHTML = "";

  // 🚫 ไม่มีข้อมูล
  if (paginated.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">🚫 No data found</td></tr>`;
    return;
  }

  // 🔁 อัปเดตสถานะล่าสุดของรายการแต่ละแถว
  const updatedWashes = await Promise.all(paginated.map(checkAndUpdateWashStatus));

  // 🖨️ สร้างแถวในตาราง
  updatedWashes.forEach((w) => {
    const isCompleted = w.status === "Completed";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${w.washId || "-"}</td>
      <td>${w.empName || "-"}<br><small>${w.empId || ""}</small></td>
      <td>${w.uniformCode || "-"}</td>
      <td>${w.color || "-"}</td>
      <td><span class="status ${getStatusClass(w)}">${getStatusLabel(w)}</span></td>
      <td class="actions">
        ${isCompleted ? `<button class="esd-btn" data-id="${w.id}">🧪 ESD</button>` : ""}
        <button class="delete" data-id="${w.id}">🗑️</button>
        <button class="shift-date" data-id="${w.washId}">🕒</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // 🗑️ ผูกปุ่มลบ
  tableBody.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      confirmDeleteWash(e.target.dataset.id);
    });
  });

  // 📅 ผูกปุ่ม Shift Date
  tableBody.querySelectorAll(".shift-date").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const washId = e.target.dataset.id;
      const days = parseInt(prompt("📅 ขยับกี่วัน? เช่น 1 หรือ -2"));
      if (!isNaN(days)) await shiftWashDate(washId, days);
    });
  });

  // 🧪 ผูกปุ่ม ESD
  tableBody.querySelectorAll(".esd-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      handleESDRequest(e.target.dataset.id);
    });
  });

  // 📄 แสดง Pagination
  renderPagination(filtered.length, page, rowsPerPage, (newPage) => {
    renderWashTable(allWashes, newPage, rowsPerPage);
  });
}

// ============================ 🎨 STATUS CLASS MAPPER ============================

/**
 * คืนค่า CSS class ของสถานะ (สำหรับแสดงสีของ badge)
 * - พิจารณาจาก status และจำนวน rewash
 * @param {Object} wash - ข้อมูลงานซัก
 * @returns {string} - ชื่อคลาส CSS ของสถานะ
 */
export function getStatusClass(wash) {
  const count = wash.rewashCount || 0;
  const status = wash.status;

  // 📦 รอส่งซัก (รอบแรก หรือ Rewash)
  if (status === "Waiting to Send") {
    return count === 0 ? "status-waiting" : "status-waiting-rewash";
  }

  // 🧺 กำลังซัก (รอบแรก หรือ Rewash)
  if (status === "Washing") {
    return count === 0 ? "status-washing" : "status-rewashing";
  }

  // ✅ ซักเสร็จแล้ว
  if (status === "Completed") return "status-completed";

  // 🧪 ทดสอบ ESD
  if (status === "ESD Passed") return "status-passed";
  if (status === "ESD Failed") return "status-failed";

  // 🗑️ ทิ้งชุด
  if (status === "Scrap") return "status-scrap";

  // ❔ ไม่ตรงกับสถานะใดเลย
  return "";
}

// ============================ 🏷️ STATUS LABEL MAPPER ============================

/**
 * คืนข้อความสถานะที่อ่านเข้าใจง่าย สำหรับแสดงบน UI
 * - พิจารณาจากสถานะ และจำนวน Rewash
 * @param {Object} wash - ข้อมูลรายการซัก
 * @returns {string} - ข้อความแสดงสถานะ
 */
export function getStatusLabel(wash) {
  const count = wash.rewashCount || 0;
  const status = wash.status;

  // 🔶 รอส่งซัก (ครั้งแรกหรือรอบ Rewash)
  if (status === "Waiting to Send") {
    return count === 0 ? "Waiting to Send" : `Waiting-Rewash #${count}`;
  }

  // 🔵 กำลังซัก (ครั้งแรกหรือรอบ Rewash)
  if (status === "Washing") {
    return count === 0 ? "Washing" : `Re-Washing #${count}`;
  }

  // ✅ ซักเสร็จ
  if (status === "Completed") return "Completed";

  // 🧪 ผลการทดสอบ ESD
  if (status === "ESD Passed") return "ESD Passed";
  if (status === "ESD Failed") return `ESD Failed (${count} times)`;

  // 🗑️ ถูกทำลายเนื่องจากเกินขีดจำกัด
  if (status === "Scrap") return "Scrap (Over limit)";

  // ❓ ไม่รู้สถานะ
  return status || "-";
}


// ============================ 🔢 PAGINATION ============================

/**
 * แสดงปุ่มแบ่งหน้า (Pagination) สำหรับข้อมูลในตาราง
 * @param {number} totalItems - จำนวนรายการทั้งหมด
 * @param {number} currentPage - หน้าปัจจุบัน
 * @param {number} rowsPerPage - จำนวนแถวต่อหน้า
 * @param {Function} onPageChange - ฟังก์ชันที่เรียกเมื่อมีการเปลี่ยนหน้า
 */
export function renderPagination(totalItems, currentPage, rowsPerPage, onPageChange) {
  const container = document.getElementById("pagination");
  if (!container) return;

  const totalPages = Math.ceil(totalItems / rowsPerPage);
  container.innerHTML = "";

  // ⏪ ปุ่มย้อนกลับ
  if (currentPage > 1) {
    const prevBtn = createPageButton("«", currentPage - 1, false, onPageChange);
    container.appendChild(prevBtn);
  }

  // 🔢 ปุ่มเลขหน้า
  for (let i = 1; i <= totalPages; i++) {
    const isActive = i === currentPage;
    const btn = createPageButton(i, i, isActive, onPageChange);
    container.appendChild(btn);
  }

  // ⏩ ปุ่มถัดไป
  if (currentPage < totalPages) {
    const nextBtn = createPageButton("»", currentPage + 1, false, onPageChange);
    container.appendChild(nextBtn);
  }
}

/**
 * สร้างปุ่มหน้าสำหรับ Pagination
 * @param {string|number} label - ข้อความบนปุ่ม
 * @param {number} pageNumber - เลขหน้าที่จะไป
 * @param {boolean} isActive - เป็นหน้าปัจจุบันหรือไม่
 * @param {Function} onClick - ฟังก์ชันเรียกเมื่อคลิก
 * @returns {HTMLButtonElement}
 */
function createPageButton(label, pageNumber, isActive, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = isActive ? "active" : "";
  btn.addEventListener("click", () => onClick(pageNumber));
  return btn;
}

// ============================ 🧾 HISTORY TABLE ============================
/**
 * แสดงข้อมูลประวัติการซัก (Wash History) พร้อม Pagination
 * @param {Array} data - ข้อมูลทั้งหมด
 * @param {number} currentPage - หน้าปัจจุบัน (default = 1)
 * @param {number} rowsPerPage - จำนวนรายการต่อหน้า (default = 5)
 */
export function renderWashHistory(data, currentPage = 1, rowsPerPage = 5) {
  const tbody = document.getElementById("historyTableBody");
  const pagination = document.getElementById("historyPagination");
  if (!tbody || !pagination) return;

  // 🔄 เคลียร์ข้อมูลเก่า
  tbody.innerHTML = "";
  pagination.innerHTML = "";

  // 📊 แบ่งข้อมูลตามหน้า
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = data.slice(start, start + rowsPerPage);

  // 🚫 ไม่มีข้อมูล
  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">🚫 No history found</td></tr>`;
    return;
  }

  // ✅ สร้างแถวข้อมูล
  paginated.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.washId || "-"}</td>
      <td>${entry.uniformCode || "-"}</td>
      <td>${entry.empName || "-"}<br><small>${entry.empId || ""}</small></td>
      <td>${entry.testResult || "-"}</td>
      <td>${entry.testDate ? formatDate(entry.testDate) : "-"}</td>
      <td><span class="status ${getStatusClass(entry)}">${getStatusLabel(entry)}</span></td>
    `;
    tbody.appendChild(row);
  });

  // 🔢 Pagination
  const totalPages = Math.ceil(data.length / rowsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => renderWashHistory(data, i, rowsPerPage));
    pagination.appendChild(btn);
  }
}

/**
 * แสดงข้อมูลสรุปยอดบน Dashboard
 * - จำนวนทั้งหมด
 * - รอซัก, กำลังซัก, ซักเสร็จ, ซักซ้ำ, Scrap, ประวัติ
 */
export async function renderWashSummary() {
  const {
    total,
    waiting,
    washing,
    completed,
    rewash,
    scrap,
    history,
  } = await getWashSummaryData();

  setText("sumTotal", total);
  setText("sumWaiting", waiting);
  setText("sumWashing", washing);
  setText("sumCompleted", completed);
  setText("sumRewash", rewash);
  setText("sumScrap", scrap);
  setText("sumHistory", history);
}

/**
 * 🔍 รวมข้อมูลสรุปทั้งหมดสำหรับ Dashboard Summary
 * - นับจำนวนสถานะต่าง ๆ ของงานซัก
 * - ดึงจำนวนประวัติการซัก
 * @returns {Promise<Object>} สรุปจำนวนทั้งหมด
 */
async function getWashSummaryData() {
  const allWashes = await getAllWashes();
  const history = await getAllWashHistory();

  const countByStatus = (statusCheck) =>
    allWashes.filter((w) => statusCheck(w.status)).length;

  return {
    total: allWashes.length,
    waiting: countByStatus((s) => s === "Waiting to Send"),
    washing: countByStatus((s) => s === "Washing"),
    completed: countByStatus((s) => s === "Completed"),
    rewash: countByStatus((s) => (s || "").includes("Rewash")),
    scrap: countByStatus((s) => s === "Scrap"),
    history: history.length,
  };
}


/**
/**
 * 📌 setText
 * เปลี่ยนข้อความใน Element ที่ระบุด้วย ID
 *
 * @param {string} id - ID ของ Element ที่ต้องการเปลี่ยนค่า
 * @param {string|number} value - ค่าที่จะกำหนดให้ textContent (หากเป็น null/undefined จะใช้ "-")
 *
 * ✅ ฟังก์ชันนี้จะ:
 * - ป้องกัน error ถ้าไม่เจอ Element
 * - แสดงข้อความ fallback หาก value เป็น null/undefined
 * - แจ้งเตือนใน console หากหา Element ไม่เจอ
 */
export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value ?? "-";
  } else {
    console.warn(`⚠️ setText: ไม่พบ element ที่มี id = "${id}"`);
  }
}


// ============================ 🧪 ESD MODAL ============================
/**
 * แสดง Modal สำหรับผลการทดสอบ ESD
 * @param {Object} washData - ข้อมูลจากตารางงานซัก
 */
export function openESDModal(washData) {
  const modal = document.getElementById("esdModal");
  if (!modal) return;

  // 📌 ใส่ข้อมูลลงใน Modal
  setText("esdUniformCode", washData.uniformCode);
  setText("esdEmpId", washData.empId);
  setText("esdEmpName", washData.empName);

  // ✅ กดผ่าน ESD
  const passBtn = document.getElementById("btnPassESD");
  if (passBtn)
    passBtn.onclick = () => {
      markAsESDPass(washData).catch(console.error);
      modal.style.display = "none";
    };

  // ❌ กดไม่ผ่าน ESD
  const failBtn = document.getElementById("btnFailESD");
  if (failBtn)
    failBtn.onclick = () => {
      handleESDTestFail(washData).catch(console.error);
      modal.style.display = "none";
    };

  // ⛔ ปิดด้วย ESC หรือคลิกข้างนอก
  const closeByClick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  const closeByEsc = (e) => {
    if (e.key === "Escape") modal.style.display = "none";
  };

  modal.addEventListener("click", closeByClick);
  window.addEventListener("keydown", closeByEsc, { once: true });

  // 🟢 แสดง Modal
  modal.style.display = "flex";
}