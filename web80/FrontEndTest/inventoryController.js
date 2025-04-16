import { InventoryModel } from "./inventoryModel.js";
import { InventoryView } from "./inventoryView.js";
import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const db = getFirestore();
const InventoryDB = collection(db, "InventoryDB");

let allInventory = [];
let allUniforms = [];
let selectedUniform = null;

window.addEventListener("DOMContentLoaded", async () => {
  watchInventory();
  await loadUniforms();
  InventoryView.renderUniformBaseCards(allUniforms);
  setupEvents();
});

function watchInventory() {
  onSnapshot(InventoryDB, async snapshot => {
    allInventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    InventoryView.renderInventoryCards(allInventory);
    const stats = await InventoryModel.getInventorySummary();
    InventoryView.updateDashboard(stats);
  });
}

async function loadUniforms() {
  allUniforms = await InventoryModel.fetchUniforms();
}

function setupEvents() {
  bindSearchEvent();
  bindExportEvent();
  bindImportEvent();
  bindCardActions();
  bindAssignSubmit();
  bindAddCodeSubmit();
  bindAutoFillEmployee();
  bindInlineUpdateCode();
  bindAssignFromAvailableCode();
  window.addEventListener("addCodeClick", handleAddCodeClick);
  window.addEventListener("detailClick", handleDetailClick);
}

function bindSearchEvent() {
  document.getElementById("searchByUniformAndEmployee")?.addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allInventory.filter(item =>
      item.UniformID?.toLowerCase().includes(keyword) ||
      item.UniformCode?.toLowerCase().includes(keyword) ||
      item.EmployeeName?.toLowerCase().includes(keyword)
    );
    InventoryView.renderInventoryCards(filtered);
  });
}

function bindExportEvent() {
  document.getElementById("btnExportReport")?.addEventListener("click", async () => {
    const data = await InventoryModel.fetchAllForExport();
    const url = InventoryModel.exportCSV(data, [
      "UniformID", "UniformName", "UniformCode", "UniformType", "UniformSize", "UniformColor",
      "UniformQty", "EmployeeID", "EmployeeName", "EmployeDepartment", "Status", "RewashCount"
    ]);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function bindImportEvent() {
  document.getElementById("btnImportReport")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const records = InventoryModel.parseCSV(text);

      const valid = [];
      for (const r of records) {
        const emp = await InventoryModel.fetchEmployeeById(r.EmployeeID);
        const uniform = await InventoryModel.fetchUniformById(r.UniformID);
        if (emp && uniform) {
          valid.push({
            UniformID: uniform.uniformID || uniform.id || "",
            UniformName: uniform.uniformName || "",
            UniformCode: r.UniformCode,
            UniformType: uniform.uniformType || "",
            UniformSize: uniform.uniformSize || "",
            UniformColor: uniform.uniformColor || "",
            UniformQty: 1,
            img: uniform.img || "",
            EmployeeID: emp.employeeId,
            EmployeeName: emp.employeeName,
            EmployeDepartment: emp.employeeDept,
            Status: "assigned",
            RewashCount: 0
          });
        }
      }

      InventoryView.previewImportData(valid, async () => {
        for (const v of valid) await InventoryModel.assignUniformToEmployee(v);
        Swal.fire({ icon: "success", title: "Import สำเร็จ", timer: 1500, showConfirmButton: false });
      });
    });
    input.click();
  });
}

function bindCardActions() {
  document.getElementById("inventoryList")?.addEventListener("click", async (e) => {
    const detailBtn = e.target.closest(".btn-detail");
    const deleteBtn = e.target.closest(".btn-delete");

    if (detailBtn) {
      const code = detailBtn.dataset.code;
      const item = allInventory.find(i => i.UniformCode === code);
      if (item) {
        InventoryView.fillDetailModal([item]);
        InventoryView.toggleModal("codeListModal", true);
      }
    }

    if (deleteBtn) {
      const code = deleteBtn.dataset.code;
      const confirm = await Swal.fire({
        title: "ลบรายการนี้?", text: `ลบ Uniform Code: ${code}`,
        icon: "warning", showCancelButton: true, confirmButtonText: "ยืนยัน", cancelButtonText: "ยกเลิก"
      });
      if (!confirm.isConfirmed) return;
      await InventoryModel.deleteUniformEntry(code);
    }
  });
}

function bindAssignSubmit() {
  document.getElementById("assignForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const empId = document.getElementById("assignEmployeeId")?.value.trim();
    const code = document.getElementById("assignUniformCode")?.value.trim();
    if (!empId || !code) return;

    const emp = await InventoryModel.fetchEmployeeById(empId);
    if (!emp) return Swal.fire({ icon: "error", title: "ไม่พบพนักงาน" });

    const allCodes = await InventoryModel.fetchInventoryItems();
    const target = allCodes.find(item => item.UniformCode === code);
    if (!target) return Swal.fire({ icon: "error", title: "ไม่พบโค้ดนี้ในระบบ" });
    if (target.Status !== "available") return Swal.fire({ icon: "warning", title: "โค้ดนี้ถูกใช้ไปแล้ว" });

    await InventoryModel.assignFromAvailableCode(code, {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeDept: emp.employeeDept
    });

    Swal.fire({ icon: "success", title: "Assign สำเร็จ!", timer: 1500, showConfirmButton: false });
    InventoryView.toggleModal("assignModal", false);
  });
}

function bindAddCodeSubmit() {
  document.getElementById("codeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const uniformId = document.getElementById("addCodeUniformId")?.value;
    const code = document.getElementById("addUniformCode")?.value.trim();
    if (!uniformId || !code) return;

    const exists = await InventoryModel.validateUniformCode(code);
    if (exists) return Swal.fire({ icon: "warning", title: "โค้ดซ้ำ", text: "กรุณาใช้โค้ดอื่น" });

    const base = await InventoryModel.fetchUniformById(uniformId);
    if (!base) return;

    await InventoryModel.assignUniformToEmployee({
      UniformID: base.uniformID || base.id || "",
      UniformName: base.uniformName || "",
      UniformCode: code,
      UniformType: base.uniformType || "",
      UniformSize: base.uniformSize || "",
      UniformColor: base.uniformColor || "",
      UniformQty: base.qty || 1,
      img: base.img || "",
      EmployeeID: "",
      EmployeeName: "",
      EmployeDepartment: "",
      Status: "available",
      RewashCount: 0
    });

    Swal.fire({ icon: "success", title: "เพิ่มโค้ดเรียบร้อย", timer: 1500, showConfirmButton: false });
    InventoryView.toggleModal("codeModal", false);
  });
}

function bindAutoFillEmployee() {
  const input = document.getElementById("assignEmployeeId");
  if (!input) return;
  input.addEventListener("blur", async () => {
    const empId = input.value.trim();
    const emp = await InventoryModel.fetchEmployeeById(empId);
    const nameEl = document.getElementById("assignEmployeeName");
    if (emp && nameEl) {
      nameEl.value = emp.employeeName || "";
    }
  });
}

function bindInlineUpdateCode() {
  window.updateCodeInline = async (el, oldCode) => {
    const newCode = el.textContent.trim();
    if (!newCode || newCode === oldCode) return;

    const confirm = await Swal.fire({
      title: "ยืนยันการเปลี่ยนรหัส?",
      text: `${oldCode} → ${newCode}`,
      icon: "question", showCancelButton: true, confirmButtonText: "ยืนยัน"
    });

    if (!confirm.isConfirmed) {
      el.textContent = oldCode;
      return;
    }

    await InventoryModel.updateUniformCode(oldCode, { UniformCode: newCode });
    Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1200, showConfirmButton: false });
  };
}

function bindAssignFromAvailableCode() {
  window.openAssignFromCode = async (code) => {
    const item = allInventory.find(i => i.UniformCode === code && i.Status === "available");
    if (!item) return;
    selectedUniform = item;
    InventoryView.prepareAssignForm(item);
    const codeEl = document.getElementById("assignUniformCode");
    if (codeEl) codeEl.value = item.UniformCode;
    InventoryView.toggleModal("assignModal", true);
  };
}

async function handleAddCodeClick(e) {
  const uniformId = e.detail.id;
  const base = await InventoryModel.fetchUniformById(uniformId);
  if (!base) return;
  selectedUniform = base;
  const codeInput = document.getElementById("addCodeUniformId");
  if (codeInput) codeInput.value = base.uniformID || base.id || "";
  const codeField = document.getElementById("addUniformCode");
  if (codeField) codeField.value = "";
  InventoryView.toggleModal("codeModal", true);
}

async function handleDetailClick(e) {
  const uniformId = e.detail.id;
  const codes = await InventoryModel.getAllCodesByUniformID(uniformId);
  InventoryView.fillDetailModal(codes);
  InventoryView.toggleModal("codeListModal", true);
}

window.returnUniformByCode = async (code) => {
  const confirm = await Swal.fire({
    title: "คืนชุด?", text: "ต้องการคืนชุดนี้?",
    icon: "question", showCancelButton: true, confirmButtonText: "ยืนยัน"
  });
  if (!confirm.isConfirmed) return;
  await InventoryModel.returnUniform(code);
};

window.closeAssignModal = () => InventoryView.toggleModal("assignModal", false);
window.closeCodeListModal = () => InventoryView.toggleModal("codeListModal", false);
window.closeAddCodeModal = () => InventoryView.toggleModal("codeModal", false);
