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
    cleanupOverlayAndModal();
    InventoryView.setFormLoading?.(true);
    watchInventory();
    await loadUniforms();
    InventoryView.renderUniformBaseCards(allUniforms);
    setupEvents();
  } catch (err) {
    console.error("❌ InventoryPage Error:", err);
    Swal.fire({
      icon: "error",
      title: "An error occurred",
      text: err.message || "Failed to load inventory data",
    });
  } finally {
    InventoryView.setFormLoading?.(false);
  }
}


function cleanupOverlayAndModal() {
  document.querySelectorAll(".modal, .overlay, .modal-backdrop").forEach(el => {
    el.classList.add("hidden");
    el.style.display = "none";
  });
}

function watchInventory() {
  onSnapshot(InventoryDB, async (snapshot) => {
    try {
      allInventory = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const summary = await InventoryModel.getInventorySummary();
      InventoryView.updateDashboard(summary);
    } catch (err) {
      console.error("Error loading inventory data: ", err);
    }
  });
}

async function loadUniforms() {
  allUniforms = await InventoryModel.fetchUniforms();
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
      "UniformID", "UniformCode", "UniformType", "UniformSize", "UniformColor",
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
            RewashCount: 0,
          });
        }
      }

      InventoryView.previewImportData(valid, async () => {
        for (const v of valid) {
          await InventoryModel.assignUniformToEmployee(v);
        }
        await reload();
        Swal.fire({
          icon: "success",
          title: "Import successful",
          timer: 1500,
          showConfirmButton: false,
        });
      });
    });

    input.click();
  });
}

function bindAssignSubmit() {
  document.getElementById("assignForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const empId = document.getElementById("assignEmployeeId")?.value.trim();
    const code = document.getElementById("assignUniformCode")?.value.trim();
    if (!empId || !code) return;

    const emp = await InventoryModel.fetchEmployeeById(empId);
    if (!emp)
      return Swal.fire({ icon: "error", title: "Employee not found" });

    const allCodes = await InventoryModel.fetchInventoryItems();
    const target = allCodes.find((i) => i.UniformCode === code);
    if (!target)
      return Swal.fire({ icon: "error", title: "Code not found in the system" });
    if (target.Status !== "available")
      return Swal.fire({ icon: "warning", title: "This code is already assigned" });

    await InventoryModel.assignFromAvailableCode(code, {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      employeeDept: emp.employeeDept,
    });

    Swal.fire({
      icon: "success",
      title: "Assigned successfully!",
      timer: 1500,
      showConfirmButton: false,
    });

    InventoryView.toggleModal("assignModal", false);
    await InventoryView.reloadDetailModal(target.UniformID);
    await InventoryView.refreshAll();
  });
}

function bindAddCodeSubmit() {
  document.getElementById("codeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const uniformId = document.getElementById("addCodeUniformId")?.value;
    const code = document.getElementById("addUniformCode")?.value.trim();
    if (!uniformId || !code) return;

    const exists = await InventoryModel.validateUniformCode(code);
    if (exists) {
      return Swal.fire({
        icon: "warning",
        title: "Duplicate Code",
        text: "Please use a different code",
      });
    }

    const base = await InventoryModel.fetchUniformById(uniformId);
    if (!base) return;

    await InventoryModel.assignUniformToEmployee({
      UniformID: base.uniformID || base.id || "",
      UniformType: base.uniformType || "",
      UniformSize: base.uniformSize || "",
      UniformColor: base.uniformColor || "",
      UniformCode: code,
      UniformQty: base.qty || 1,
      img: base.img || "",
      EmployeeID: "",
      EmployeeName: "",
      EmployeDepartment: "",
      Status: "available",
      RewashCount: 0,
    });

    Swal.fire({
      icon: "success",
      title: "Code added successfully",
      timer: 1500,
      showConfirmButton: false,
    });

    InventoryView.toggleModal("codeModal", false);
    await InventoryView.reloadDetailModal(base.uniformID);
    await InventoryView.refreshAll();
  });
}

function bindAutoFillEmployee() {
  const input = document.getElementById("assignEmployeeId");
  if (!input) return;

  input.addEventListener("blur", async () => {
    const empId = input.value.trim();
    const emp = await InventoryModel.fetchEmployeeById(empId);
    const nameEl = document.getElementById("assignEmployeeName");
    if (emp && nameEl) nameEl.value = emp.employeeName || "";
  });
}

function bindInlineUpdateCode() {
  window.updateCodeInline = async (el, oldCode) => {
    const newCode = el.textContent.trim();
    if (!newCode || newCode === oldCode) return;

    const confirm = await Swal.fire({
      title: "Confirm code change?",
      text: `${oldCode} → ${newCode}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm"
    });

    if (!confirm.isConfirmed) {
      el.textContent = oldCode;
      return;
    }

    await InventoryModel.updateUniformCode(oldCode, { UniformCode: newCode });
    Swal.fire({
      icon: "success",
      title: "Update successful",
      timer: 1200,
      showConfirmButton: false
    });
    await reload();
  };
}

function bindAssignFromAvailableCode() {
  window.openAssignFromCode = async (code) => {
    const item = allInventory.find(i => i.UniformCode === code && i.Status === "available");
    if (!item) {
      console.warn("⚠️ Code not found or not available:", code);
      return;
    }

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

  document.getElementById("addCodeUniformId").value = base.uniformID || base.id || "";
  document.getElementById("addUniformCode").value = "";

  InventoryView.toggleModal("codeModal", true);
}

async function handleDetailClick(e) {
  const uniformId = e.detail.id;
  await InventoryView.reloadDetailModal(uniformId);
  InventoryView.toggleModal("codeListModal", true);
}

window.returnUniformByCode = async code => {
  const confirm = await Swal.fire({
    title: "Return uniform?",
    text:  "Are you sure you want to return this uniform?",
    icon:  "question",
    showCancelButton: true,
    confirmButtonText: "Confirm"
  });
  if (!confirm.isConfirmed) return;

  try {
    await InventoryModel.returnUniform(code);
    const uniformId = await InventoryModel.getUniformIdByCode(code);
    if (!uniformId) {
      return Swal.fire({
        icon: "error",
        title: "Related UniformID not found"
      });
    }

    await InventoryView.reloadDetailModal(uniformId);
    await InventoryView.refreshAll();
    Swal.fire({
      icon: "success",
      title: "Uniform returned successfully!",
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err) {
    console.error("❌ RETURN ERROR:", err);
    Swal.fire({
      icon: "error",
      title: "Error occurred while returning the uniform"
    });
  }
};

window.confirmDeleteUniform = async code => {
  const confirm = await Swal.fire({
    title: "Delete this item?",
    text:  `Are you sure you want to delete code: ${code}?`,
    icon:  "warning",
    showCancelButton: true,
    confirmButtonText: "Confirm",
    cancelButtonText: "Cancel"
  });
  if (!confirm.isConfirmed) return;

  try {
    const uniformId = await InventoryModel.getUniformIdByCode(code);
    if (!uniformId) {
      return Swal.fire({
        icon: "error",
        title: "Related UniformID not found"
      });
    }

    await InventoryModel.deleteUniformEntry(code);
    await InventoryView.reloadDetailModal(uniformId);
    await InventoryView.refreshAll();
    Swal.fire({
      icon: "success",
      title: "Code deleted successfully!",
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err) {
    console.error("❌ DELETE ERROR:", err);
    Swal.fire({
      icon: "error",
      title: "An error occurred while deleting the code"
    });
  }
};

window.closeAssignModal   = () => InventoryView.toggleModal("assignModal", false);
window.closeCodeListModal = () => InventoryView.toggleModal("codeListModal", false);
window.closeAddCodeModal  = () => InventoryView.toggleModal("codeModal", false);


async function reload() {
  try {
    await loadUniforms();
    InventoryView.renderUniformBaseCards(allUniforms);

    const inventory = await InventoryModel.fetchInventoryItems();
    InventoryView.renderInventoryCards(inventory);
  } catch (error) {
    console.error("❌ Failed to reload inventory data:", error);
  }
}

function setupEvents() {
  bindSearchEvent();
  bindExportEvent();
  bindImportEvent();
  bindAssignSubmit();
  bindAddCodeSubmit();
  bindAutoFillEmployee();
  bindInlineUpdateCode();
  bindAssignFromAvailableCode();

  window.addEventListener("addCodeClick", handleAddCodeClick);
  window.addEventListener("detailClick", handleDetailClick);
  window.addEventListener("beforeunload", () => {
    InventoryView.resetModals?.();
  });
}
