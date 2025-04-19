// 📁 assets/js/controllers/employeeController.js
import { EmployeeModel } from "../Models/employeeModel.js";
import { EmployeeView } from "../Views/employeeView.js";

// ============================== 🔧 CONFIG ==============================
const DEFAULT_PROFILE = "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";
let selectedEmployeeId = null;

// ============================ 🔄 INITIALIZATION ============================
export async function initEmployeePage() {
  try {
    EmployeeView.showLoading();

    // 🧩 Bind Events
    setupEvents();

    // 📥 ดึงข้อมูลพนักงาน
    const employees = await EmployeeModel.fetchAllEmployees();

    // 🎯 แสดงข้อมูลในตาราง
    EmployeeView.renderTable(employees);
  } catch (error) {
    console.error("❌ Error loading Employee page:", error);
    Swal.fire({
      icon: "error",
      title: "❌ โหลดข้อมูลล้มเหลว",
      text: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล",
    });
  } finally {
    EmployeeView.hideLoading();
  }
}

// ============================== 🚀 INITIALIZE ==============================
window.addEventListener("DOMContentLoaded", async () => {
  await reloadTable();
  setupEvents();
});

// ============================== 📥 LOAD DATA ==============================
async function reloadTable() {
  const employees = await EmployeeModel.fetchAllEmployees();
  EmployeeView.renderTable(employees);
}

// ============================== 🎯 EVENT HANDLERS ==============================
function setupEvents() {
  // ➕ Add
  document.querySelector(".btn-add")?.addEventListener("click", () => {
    selectedEmployeeId = null;
    EmployeeView.resetForm();
    EmployeeView.setModalTitle("Add Employee", "fas fa-user-plus");
    EmployeeView.toggleModal("employeeFormModal", true);
    EmployeeView.initDropzone();
  });

  // ❌ Cancel Modal
  document.querySelector("#cancelBtn")?.addEventListener("click", () => {
    EmployeeView.toggleModal("employeeFormModal", false);
  });

  // 📥 Import CSV
  document.querySelector(".btn-import")?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      EmployeeView.showLoading();

      try {
        const text = await file.text();
        const records = EmployeeModel.parseCSV(text);
        let count = 0;

        for (const emp of records) {
          if (EmployeeModel.isValidEmployee(emp)) {
            emp.photoURL = DEFAULT_PROFILE;
            await EmployeeModel.createEmployee(emp);
            count++;
          }
        }

        Swal.fire({
          icon: "success",
          title: `\u{1F4E5} นำเข้า ${count} รายการสำเร็จ`,
          timer: 2000,
          showConfirmButton: false,
        });

        await reloadTable();
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: err.message,
        });
      } finally {
        EmployeeView.hideLoading();
      }
    });

    input.click();
  });

  // 📤 Export CSV
  document.querySelector(".btn-export")?.addEventListener("click", async () => {
    EmployeeView.showLoading();
    const employees = await EmployeeModel.fetchAllEmployees();
    EmployeeView.exportEmployeesToCSV(employees);
    EmployeeView.hideLoading();
  });

  // 🔍 Search
  document.querySelector("#searchEmployee")?.addEventListener("input", async (e) => {
    const keyword = e.target.value.toLowerCase();
    const employees = await EmployeeModel.fetchAllEmployees();
    const filtered = employees.filter(
      (emp) =>
        emp.employeeId.toLowerCase().includes(keyword) ||
        emp.employeeName.toLowerCase().includes(keyword)
    );
    EmployeeView.renderTable(filtered);
  });

  // 💾 Submit Form
  document.querySelector("#employeeForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const file = document.getElementById("employeePhoto")?.files[0];

    const employeeData = {
      employeeId: form.employeeId.value.trim(),
      employeeName: form.employeeName.value.trim(),
      employeeDept: form.employeeDept.value.trim(),
      photoURL: "",
    };

    if (!EmployeeModel.isValidEmployee(employeeData)) {
      return Swal.fire({
        icon: "warning",
        title: "\u26A0\uFE0F กรุณากรอกข้อมูลให้ครบ",
        timer: 2000,
        showConfirmButton: false,
      });
    }

    EmployeeView.setFormLoading(true);

    try {
      employeeData.photoURL = file
        ? await EmployeeModel.convertImageToBase64(file)
        : DEFAULT_PROFILE;

      if (selectedEmployeeId) {
        await EmployeeModel.updateEmployee(selectedEmployeeId, employeeData);
      } else {
        await EmployeeModel.createEmployee(employeeData);
      }

      await reloadTable();
      EmployeeView.toggleModal("employeeFormModal", false);

      Swal.fire({
        icon: "success",
        title: "\u2705 บันทึกสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "\u274C เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      EmployeeView.setFormLoading(false);
    }
  });
}

// ============================== ✏️ EDIT EMPLOYEE ==============================
window.handleEditById = async (employeeId) => {
  const employee = await EmployeeModel.fetchEmployeeById(employeeId);
  if (!employee) return;

  selectedEmployeeId = employeeId;

  const form = document.querySelector("#employeeForm");
  form.employeeId.value = employee.employeeId;
  form.employeeName.value = employee.employeeName;
  form.employeeDept.value = employee.employeeDept;
  form.employeeId.disabled = true;

  const preview = document.getElementById("previewPhoto");
  if (employee.photoURL) {
    preview.src = employee.photoURL;
    preview.style.display = "block";
  }

  EmployeeView.setModalTitle("Edit Employee", "fas fa-user-edit");
  EmployeeView.toggleModal("employeeFormModal", true);
  EmployeeView.initDropzone();
};

// ============================== 🗑️ DELETE EMPLOYEE ==============================
window.promptDeleteEmployee = async (employeeId) => {
  const result = await Swal.fire({
    title: "ลบพนักงาน?",
    text: "คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ใช่, ลบเลย",
    cancelButtonText: "ยกเลิก",
  });

  if (result.isConfirmed) {
    await EmployeeModel.deleteEmployee(employeeId);
    await reloadTable();

    Swal.fire({
      icon: "success",
      title: "ลบเรียบร้อยแล้ว",
      timer: 1500,
      showConfirmButton: false,
    });
  }
};

// ============================== 🌐 GLOBAL TRIGGER ==============================
window.reloadEmployeeTable = reloadTable;