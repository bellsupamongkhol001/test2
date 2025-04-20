// 📁 inventoryController.js
import { InventoryModel } from "../Models/inventoryModel.js";
import { InventoryView } from "../Views/inventoryView.js";
import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const db = getFirestore();
const InventoryDB = collection(db, "InventoryDB");

let allInventory = [];
let allUniforms  = [];
let selectedUniform = null;

export async function initInventoryPage() {
  try {
    InventoryView.setFormLoading?.(true);
    watchInventory();
    await loadUniforms();
    InventoryView.renderUniformBaseCards(allUniforms);
    setupEvents();
  } catch (err) {
    console.error("❌ InventoryPage Error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถโหลดหน้า Inventory ได้",
    });
  } finally {
    InventoryView.setFormLoading?.(false);
  }
}

// เริ่มต้นเมื่อโหลดหน้า
window.addEventListener("DOMContentLoaded", async () => {
  watchInventory();
  await loadUniforms();
  InventoryView.renderUniformBaseCards(allUniforms);
  setupEvents();
});

/** สังเกตข้อมูล InventoryDB เพื่ออัพเดต Dashboard ทันที */
function watchInventory() {
  onSnapshot(InventoryDB, async snapshot => {
    allInventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const stats = await InventoryModel.getInventorySummary();
    InventoryView.updateDashboard(stats);
  });
}

/** โหลด Uniform Base ทั้งหมด */
async function loadUniforms() {
  allUniforms = await InventoryModel.fetchUniforms();
}

/** ผูกอีเวนต์ทั้งหมด */
function setupEvents() {
  bindSearchEvent();
  bindExportEvent();
  bindImportEvent();
  bindAssignSubmit();
  bindAddCodeSubmit();
  bindAutoFillEmployee();
  bindInlineUpdateCode();
  bindAssignFromAvailableCode();
  window.addEventListener("addCodeClick",    handleAddCodeClick);
  window.addEventListener("detailClick",     handleDetailClick);
}

/** ค้นหา Inventory แบบ real‑time */
function bindSearchEvent() {
  document.getElementById("searchByUniformAndEmployee")?.addEventListener("input", e => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allInventory.filter(item =>
      item.UniformID?.toLowerCase().includes(keyword) ||
      item.UniformCode?.toLowerCase().includes(keyword) ||
      item.EmployeeName?.toLowerCase().includes(keyword)
    );
    InventoryView.renderInventoryCards(filtered);
  });
}

/** ส่งออก CSV */
function bindExportEvent() {
  document.getElementById("btnExportReport")?.addEventListener("click", async () => {
    const data = await InventoryModel.fetchAllForExport();
    const url = InventoryModel.exportCSV(data, [
      "UniformID","UniformCode","UniformType","UniformSize","UniformColor",
      "UniformQty","EmployeeID","EmployeeName","EmployeDepartment","Status","RewashCount"
    ]);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

/** นำเข้า CSV */
function bindImportEvent() {
  document.getElementById("btnImportReport")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type   = "file";
    input.accept = ".csv";
    input.addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      const text    = await file.text();
      const records = InventoryModel.parseCSV(text);

      // ตรวจสอบข้อมูลก่อน import
      const valid = [];
      for (const r of records) {
        const emp     = await InventoryModel.fetchEmployeeById(r.EmployeeID);
        const uniform = await InventoryModel.fetchUniformById(r.UniformID);
        if (emp && uniform) {
          valid.push({
            UniformID:        uniform.uniformID || uniform.id || "",
            UniformCode:      r.UniformCode,
            UniformType:      uniform.uniformType || "",
            UniformSize:      uniform.uniformSize || "",
            UniformColor:     uniform.uniformColor || "",
            UniformQty:       1,
            img:              uniform.img || "",
            EmployeeID:       emp.employeeId,
            EmployeeName:     emp.employeeName,
            EmployeDepartment: emp.employeeDept,
            Status:           "assigned",
            RewashCount:      0
          });
        }
      }

      InventoryView.previewImportData(valid, async () => {
        for (const v of valid) {
          await InventoryModel.assignUniformToEmployee(v);
        }
        await reload();
        Swal.fire({ icon: "success", title: "Import สำเร็จ", timer: 1500, showConfirmButton: false });
      });
    });
    input.click();
  });
}

/** ส่งฟอร์ม Assign ชุด */
function bindAssignSubmit() {
  document.getElementById("assignForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const empId = document.getElementById("assignEmployeeId")?.value.trim();
    const code  = document.getElementById("assignUniformCode")?.value.trim();
    if (!empId || !code) return;

    const emp = await InventoryModel.fetchEmployeeById(empId);
    if (!emp) return Swal.fire({ icon: "error", title: "ไม่พบพนักงาน" });

    const allCodes = await InventoryModel.fetchInventoryItems();
    const target   = allCodes.find(i => i.UniformCode === code);
    if (!target)                return Swal.fire({ icon: "error",   title: "ไม่พบโค้ดนี้ในระบบ" });
    if (target.Status !== "available")
                                return Swal.fire({ icon: "warning", title: "โค้ดนี้ถูกใช้ไปแล้ว" });

    await InventoryModel.assignFromAvailableCode(code, {
      employeeId:   emp.employeeId,
      employeeName: emp.employeeName,
      employeeDept: emp.employeeDept
    });

    Swal.fire({ icon: "success", title: "Assign สำเร็จ!", timer: 1500, showConfirmButton: false });
    InventoryView.toggleModal("assignModal", false);
    await InventoryView.reloadDetailModal(target.UniformID);
    await InventoryView.refreshAll();
  });
}

/** ส่งฟอร์ม Add Code */
function bindAddCodeSubmit() {
  document.getElementById("codeForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const uniformId = document.getElementById("addCodeUniformId")?.value;
    const code      = document.getElementById("addUniformCode")?.value.trim();
    if (!uniformId || !code) return;

    const exists = await InventoryModel.validateUniformCode(code);
    if (exists) return Swal.fire({ icon: "warning", title: "โค้ดซ้ำ", text: "กรุณาใช้โค้ดอื่น" });

    const base = await InventoryModel.fetchUniformById(uniformId);
    if (!base) return;

    await InventoryModel.assignUniformToEmployee({
      UniformID:        base.uniformID || base.id || "",
      UniformType:      base.uniformType || "",
      UniformSize:      base.uniformSize || "",
      UniformColor:     base.uniformColor || "",
      UniformCode:      code,
      UniformQty:       base.qty || 1,
      img:              base.img || "",
      EmployeeID:       "",
      EmployeeName:     "",
      EmployeDepartment:"",
      Status:           "available",
      RewashCount:      0
    });

    Swal.fire({ icon: "success", title: "เพิ่มโค้ดเรียบร้อย", timer: 1500, showConfirmButton: false });
    InventoryView.toggleModal("codeModal", false);
    await InventoryView.reloadDetailModal(base.uniformID);
    await InventoryView.refreshAll();
  });
}

/** Autofill ชื่อพนักงานเมื่อกรอก ID */
function bindAutoFillEmployee() {
  const input = document.getElementById("assignEmployeeId");
  if (!input) return;
  input.addEventListener("blur", async () => {
    const empId = input.value.trim();
    const emp   = await InventoryModel.fetchEmployeeById(empId);
    const nameEl = document.getElementById("assignEmployeeName");
    if (emp && nameEl) nameEl.value = emp.employeeName || "";
  });
}

/** inline edit โค้ด */
function bindInlineUpdateCode() {
  window.updateCodeInline = async (el, oldCode) => {
    const newCode = el.textContent.trim();
    if (!newCode || newCode === oldCode) return;

    const confirm = await Swal.fire({
      title: "ยืนยันการเปลี่ยนรหัส?",
      text:    `${oldCode} → ${newCode}`,
      icon:    "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน"
    });
    if (!confirm.isConfirmed) {
      el.textContent = oldCode;
      return;
    }

    await InventoryModel.updateUniformCode(oldCode, { UniformCode: newCode });
    Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1200, showConfirmButton: false });
    await reload();
  };
}

/** เตรียมหน้า Assign เมื่อคลิกจากโค้ดที่ available */
function bindAssignFromAvailableCode() {
  window.openAssignFromCode = async code => {
    const item = allInventory.find(i => i.UniformCode === code && i.Status === "available");
    if (!item) {
      console.warn("⚠️ ไม่พบโค้ด (หรือโค้ดไม่ available):", code);
      return;
    }
    selectedUniform = item;
    InventoryView.prepareAssignForm(item);
    const codeEl = document.getElementById("assignUniformCode");
    if (codeEl) codeEl.value = item.UniformCode;
    InventoryView.toggleModal("assignModal", true);
  };
}

/** อีเวนต์คลิก Add Code จาก Uniform Base Card */
async function handleAddCodeClick(e) {
  const uniformId = e.detail.id;
  const base = await InventoryModel.fetchUniformById(uniformId);
  if (!base) return;
  selectedUniform = base;
  document.getElementById("addCodeUniformId").value = base.uniformID || base.id || "";
  document.getElementById("addUniformCode").value = "";
  InventoryView.toggleModal("codeModal", true);
}

/** อีเวนต์คลิก Detail จาก Uniform Base Card */
async function handleDetailClick(e) {
  const uniformId = e.detail.id;
  await InventoryView.reloadDetailModal(uniformId);
  InventoryView.toggleModal("codeListModal", true);
}

/** คืนชุด */
window.returnUniformByCode = async code => {
  const confirm = await Swal.fire({
    title: "คืนชุด?",
    text:  "ต้องการคืนชุดนี้?",
    icon:  "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน"
  });
  if (!confirm.isConfirmed) return;

  try {
    await InventoryModel.returnUniform(code);
    const uniformId = await InventoryModel.getUniformIdByCode(code);
    if (!uniformId) return Swal.fire({ icon: "error", title: "ไม่พบ UniformID ที่เกี่ยวข้อง" });

    await InventoryView.reloadDetailModal(uniformId);
    await InventoryView.refreshAll();
    Swal.fire({ icon: "success", title: "คืนชุดเรียบร้อย!", timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error("❌ RETURN ERROR:", err);
    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการคืนชุด" });
  }
};

/** ลบโค้ด */
window.confirmDeleteUniform = async code => {
  const confirm = await Swal.fire({
    title: "ลบรายการนี้?",
    text:  `คุณแน่ใจหรือไม่ว่าต้องการลบโค้ด: ${code}`,
    icon:  "warning",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก"
  });
  if (!confirm.isConfirmed) return;

  try {
    const uniformId = await InventoryModel.getUniformIdByCode(code);
    if (!uniformId) return Swal.fire({ icon: "error", title: "ไม่พบ UniformID ที่เกี่ยวข้อง" });

    await InventoryModel.deleteUniformEntry(code);
    await InventoryView.reloadDetailModal(uniformId);
    await InventoryView.refreshAll();
    Swal.fire({ icon: "success", title: "ลบโค้ดสำเร็จ!", timer: 1500, showConfirmButton: false });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการลบโค้ด" });
  }
};

// ปิดโมดอลต่าง ๆ
window.closeAssignModal     = () => InventoryView.toggleModal("assignModal", false);
window.closeCodeListModal   = () => InventoryView.toggleModal("codeListModal", false);
window.closeAddCodeModal    = () => InventoryView.toggleModal("codeModal", false);

/** โหลดข้อมูลใหม่และเรนเดอร์หน้าใหม่ทั้งหมด */
async function reload() {
  await loadUniforms();
  InventoryView.renderUniformBaseCards(allUniforms);
  const inventory = await InventoryModel.fetchInventoryItems();
  InventoryView.renderInventoryCards(inventory);
}