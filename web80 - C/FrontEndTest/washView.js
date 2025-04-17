// ============================ 📦 IMPORT ============================
import { getAllWashes, getAllWashHistory } from "./washModel.js";
import {
  openEditWash,
  confirmDeleteWash,
  shiftWashDate,
  checkAndUpdateWashStatus,
  handleESDRequest,
  markAsESDPass,
  markAsESDFail,
  handleESDTestFail,
} from "./washController.js";


// ============================ 📋 RENDER MAIN TABLE ============================
// ✅ ฟังก์ชัน renderWashTable แบบรับข้อมูลจากภายนอก
export async function renderWashTable(
  allWashes = [],
  page = 1,
  rowsPerPage = 10
) {
  const searchInput =
    document.getElementById("search")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";

  // กรองข้อมูลจาก search + filter
  const filtered = allWashes.filter((w) => {
    const searchMatch =
      w.washId?.toLowerCase().includes(searchInput) ||
      w.empId?.toLowerCase().includes(searchInput) ||
      w.empName?.toLowerCase().includes(searchInput);
    const statusMatch = statusFilter ? w.status === statusFilter : true;
    return searchMatch && statusMatch;
  });

  // แบ่งหน้า
  const startIndex = (page - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  const tableBody = document.getElementById("washTableBody");
  tableBody.innerHTML = "";

  if (paginated.length === 0) {
    tableBody.innerHTML = `<tr><td colspan=\"6\" style=\"text-align:center;\">🚫 No data found</td></tr>`;
    return;
  }

  // อัปเดตสถานะก่อนแสดง
  const updatedWashes = await Promise.all(
    paginated.map((wash) => checkAndUpdateWashStatus(wash))
  );

  updatedWashes.forEach((w) => {
    const showESD = w.status === "Completed";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${w.washId || "-"}</td>
      <td>${w.empName || "-"}<br><small>${w.empId || ""}</small></td>
      <td>${w.uniformCode || "-"}</td>
      <td>${w.color || "-"}</td>
      <td><span class=\"status ${getStatusClass(w)}\">${getStatusLabel(w)}</span></td>
      <td class=\"actions\">
        <button class=\"delete\" data-id=\"${w.id}\">🗑️</button>
        <button class=\"shift-date\" data-id=\"${w.id}\">🕒</button>
        ${
          showESD
            ? `<button class=\"esd-btn\" data-id=\"${w.id}\">🧪 ESD</button>`
            : ""
        }
      </td>
    `;
    tableBody.appendChild(row);
  });

  // ผูกอีเวนต์ Delete
  tableBody
    .querySelectorAll(".delete")
    .forEach((btn) =>
      btn.addEventListener("click", (e) =>
        confirmDeleteWash(e.target.dataset.id)
      )
    );

  // ผูกอีเวนต์ Shift Date
  tableBody.querySelectorAll(".shift-date").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      const washId = e.target.dataset.id;
      const days = parseInt(prompt("📅 ขยับกี่วัน? เช่น 1 หรือ -2"));
      if (isNaN(days)) return;
      await shiftWashDate(washId, days);
    })
  );

  // ผูกอีเวนต์ ESD
  tableBody.querySelectorAll(".esd-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      handleESDRequest(id);
    })
  );

  // Pagination
  renderPagination(filtered.length, page, rowsPerPage, (newPage) => {
    renderWashTable(allWashes, newPage, rowsPerPage);
  });
}


// ============================ 🎨 STATUS ============================
// ฟังก์ชันสำหรับ mapping สถานะ → CSS class
export function getStatusClass(wash) {
  const count = wash.rewashCount || 0;
  const status = wash.status;

  if (status === "Waiting to Send") {
    return count === 0 ? "waiting" : "waiting-rewash";
  }

  if (status === "Washing") {
    return count === 0 ? "washing" : "rewashing";
  }

  if (status === "Completed") return "completed";
  if (status === "ESD Passed") return "passed";
  if (status === "Scrap") return "scrap";
  if (status === "ESD Failed") return "failed";

  return "";
}

export function getStatusLabel(wash) {
  const count = wash.rewashCount || 0;
  const status = wash.status;

  if (status === "Waiting to Send") {
    return count === 0 ? "Waiting to Send" : `Waiting Rewash #${count}`;
  }

  if (status === "Washing") {
    return count === 0 ? "Washing" : `Re-Washing #${count}`;
  }

  if (status === "Completed") return "Completed";
  if (status === "ESD Passed") return "ESD Passed";

  if (status === "ESD Failed") return `ESD Failed (${count} times)`;
  if (status === "Scrap") return "Scrap (Over limit)";

  return status || "-";
}



// ============================ 🔢 PAGINATION ============================
// สร้างปุ่ม pagination สำหรับตารางหลัก
export function renderPagination(
  totalItems,
  currentPage,
  rowsPerPage,
  onPageChange
) {
  const pagination = document.getElementById("pagination");
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");

    btn.addEventListener("click", () => onPageChange(i));
    pagination.appendChild(btn);
  }
}


// ============================ 🧾 HISTORY TABLE ============================
// ✅ แสดงข้อมูลในตารางประวัติการซัก
export function renderWashHistory(data, currentPage = 1, rowsPerPage = 5) {
  const tbody = document.getElementById("historyTableBody");
  const pag = document.getElementById("historyPagination");

  tbody.innerHTML = "";
  pag.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const pageData = data.slice(start, start + rowsPerPage);

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan='6' style='text-align:center'>🚫 No history found</td></tr>`;
    return;
  }

  pageData.forEach((entry) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${entry.washId}</td>
        <td>${entry.uniformCode}</td>
        <td>${entry.empName} (${entry.empId})</td>
        <td>${entry.testResult}</td>
        <td>${entry.testDate}</td>
        <td>${entry.status}</td>
      `;
    tbody.appendChild(tr);
  });

  const totalPages = Math.ceil(data.length / rowsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.onclick = () => renderWashHistory(data, i, rowsPerPage);
    pag.appendChild(btn);
  }
}


// ============================ 📊 DASHBOARD SUMMARY ============================
// ✅ แสดงยอดรวมใน dashboard
export async function renderWashSummary() {
  const summaryData = await getWashSummaryData();

  const { total, waiting, washing, completed, rewash, scrap, history } =
    summaryData;

  document.getElementById("sumTotal").textContent = total;
  document.getElementById("sumWaiting").textContent = waiting;
  document.getElementById("sumWashing").textContent = washing;
  document.getElementById("sumCompleted").textContent = completed;
  document.getElementById("sumRewash").textContent = rewash;
  document.getElementById("sumScrap").textContent = scrap;
  document.getElementById("sumHistory").textContent = history;
}

async function getWashSummaryData() {
  const allWashes = await getAllWashes();
  const total = allWashes.length;
  const waiting = allWashes.filter(
    (w) => w.status === "Waiting to Send"
  ).length;
  const washing = allWashes.filter((w) => w.status === "Washing").length;
  const completed = allWashes.filter((w) => w.status === "Completed").length;
  const rewash = allWashes.filter((w) => w.status.includes("Rewash")).length;
  const scrap = allWashes.filter((w) => w.status === "Scrap").length;
  const history = await getAllWashHistory();

  return {
    total,
    waiting,
    washing,
    completed,
    rewash,
    scrap,
    history: history.length,
  };
}


// ============================ 🧪 ESD MODAL ============================
export function openESDModal(washData) {
  const modal = document.getElementById("esdModal");
  modal.style.display = "flex";

  document.getElementById("esdUniformCode").textContent =
    washData.uniformCode || "-";
  document.getElementById("esdEmpId").textContent = washData.empId || "-";
  document.getElementById("esdEmpName").textContent = washData.empName || "-";
  document.getElementById("btnPassESD").onclick = () => {
    markAsESDPass(washData).catch(console.error);
    modal.style.display = "none";
  };
  document.getElementById("btnFailESD").onclick = () => {
    handleESDTestFail(washData).catch(console.error);
    modal.style.display = "none";
  };

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modal.style.display = "none";
  });
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}