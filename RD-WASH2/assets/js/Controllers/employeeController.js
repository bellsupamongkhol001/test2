import { EmployeeModel } from "../Models/employeeModel.js";
import { EmployeeView } from "../Views/employeeView.js";

const DEFAULT_PROFILE = "https://cdn-icons-png.flaticon.com/512/1077/1077114.png";
let selectedEmployeeId = null;

export async function initEmployeePage() {
  try {
    EmployeeView.showLoading();
    setupEvents();
    const employees = await EmployeeModel.fetchAllEmployees();
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

async function reloadTable() {
  try {
    const employees = await EmployeeModel.fetchAllEmployees();
    EmployeeView.renderTable(employees);
  } catch (err) {
    console.error("❌ reloadTable error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถโหลดข้อมูลพนักงานได้",
    });
  }
}
window.reloadEmployeeTable = reloadTable;

function setupEvents() {
  document.querySelector(".btn-add")?.addEventListener("click", () => {
    try {
      selectedEmployeeId = null;
      EmployeeView.resetForm();
      EmployeeView.setModalTitle("Add Employee", "fas fa-user-plus");
      EmployeeView.toggleModal("employeeFormModal", true);
      EmployeeView.initDropzone();
  
      console.log("🧑‍💼 เปิดฟอร์มเพิ่มพนักงานใหม่");
    } catch (err) {
      console.error("❌ เปิดฟอร์ม Add Employee ล้มเหลว:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเปิดฟอร์มเพิ่มพนักงานได้",
        customClass: {
          popup: "swal-on-top"
        }
      });
    }
  });  

  document.querySelector("#cancelBtn")?.addEventListener("click", () => {
    try {
      EmployeeView.toggleModal("employeeFormModal", false);
    } catch (err) {
      console.error("❌ ปิด Modal ล้มเหลว:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถปิดหน้าต่างได้",
      });
    }
  });
  

  document.querySelector("#searchEmployee")?.addEventListener("input", async (e) => {
    try {
      const keyword = e.target.value.toLowerCase().trim();
      if (!keyword) {
        const employees = await EmployeeModel.fetchAllEmployees();
        return EmployeeView.renderTable(employees);
      }
  
      const employees = await EmployeeModel.fetchAllEmployees();
      const filtered = employees.filter(
        (emp) =>
          emp.employeeId.toLowerCase().includes(keyword) ||
          emp.employeeName.toLowerCase().includes(keyword)
      );
  
      EmployeeView.renderTable(filtered);
    } catch (err) {
      console.error("❌ Search error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการค้นหา",
        text: err.message || "ไม่สามารถค้นหาข้อมูลได้",
      });
    }
  });
  

  document.querySelector(".btn-import")?.addEventListener("click", () => {
    try {
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
          let skipped = 0;
  
          for (const emp of records) {
            if (EmployeeModel.isValidEmployee(emp)) {
              emp.photoURL = DEFAULT_PROFILE;
  
              const exists = await EmployeeModel.fetchEmployeeById(emp.employeeId);
              if (!exists) {
                await EmployeeModel.createEmployee(emp);
                count++;
              } else {
                skipped++;
                console.warn(`🚫 Duplicate ID skipped: ${emp.employeeId}`);
              }
            } else {
              console.warn(`⚠️ Invalid employee skipped:`, emp);
            }
          }
  
          Swal.fire({
            icon: "success",
            title: `✅ นำเข้าสำเร็จ`,
            html: `
              <b>เพิ่มใหม่:</b> ${count} รายการ<br>
              <b>ซ้ำ/ข้าม:</b> ${skipped} รายการ
            `,
            timer: 3000,
            showConfirmButton: false,
          });
  
          await reloadTable();
        } catch (err) {
          console.error("❌ CSV Import Error:", err);
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: err.message || "ไม่สามารถนำเข้าข้อมูลได้",
          });
        } finally {
          EmployeeView.hideLoading();
        }
      });
  
      input.click();
    } catch (outerErr) {
      console.error("❌ Import CSV outer error:", outerErr);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: outerErr.message || "ไม่สามารถเปิดฟังก์ชันนำเข้าได้",
      });
    }
  });

  document.querySelector(".btn-export")?.addEventListener("click", async () => {
    try {
      EmployeeView.showLoading();
  
      const employees = await EmployeeModel.fetchAllEmployees();
  
      if (!employees || employees.length === 0) {
        return Swal.fire({
          icon: "info",
          title: "ไม่มีข้อมูลพนักงาน",
          text: "ไม่พบข้อมูลที่สามารถส่งออกได้",
        });
      }

      const result = await Swal.fire({
        title: "ต้องการส่งออกข้อมูลยูนิฟอร์มหรือไม่?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ส่งออก",
        cancelButtonText: "ยกเลิก",
      });

      if (result.isConfirmed) {
        const url = EmployeeView.exportEmployeesToCSV(employees,[
          "employeeId",
          "employeeName",
          "employeeDept",
        ]);
      const link = document.createElement("a");
      link.href = url;
      link.download = "employees.csv";
      link.click();
      URL.revokeObjectURL(url);
  
      Swal.fire({
        icon: "success",
        title: "ส่งออกข้อมูลสำเร็จ",
        text: `รวมทั้งหมด ${employees.length} รายการ`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  
    } catch (err) {
      console.error("❌ Export Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถส่งออกข้อมูลได้",
      });
    } finally {
      EmployeeView.hideLoading();
    }
  });
  

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
        title: "กรุณากรอกข้อมูลให้ครบ",
        timer: 2000,
        showConfirmButton: false,
      });
    }

    EmployeeView.setFormLoading(true);

    try {
      if (!selectedEmployeeId) {
        const exists = await EmployeeModel.fetchEmployeeById(employeeData.employeeId);
        if (exists) {
          EmployeeView.setFormLoading(false);
          return Swal.fire({
            icon: "warning",
            title: "รหัสพนักงานซ้ำ",
            text: `Employee ID "${employeeData.employeeId}" มีอยู่แล้วในระบบ`,
          });
        }
      }

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
        title: "บันทึกสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("❌ Save Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      EmployeeView.setFormLoading(false);
    }
  });
}

window.handleEditById = async (employeeId) => {
  try {
    const employee = await EmployeeModel.fetchEmployeeById(employeeId);
    if (!employee) {
      return Swal.fire({
        icon: "warning",
        title: "ไม่พบข้อมูล",
        text: `ไม่พบพนักงานที่มี ID: ${employeeId}`,
      });
    }

    selectedEmployeeId = employeeId;

    const form = document.querySelector("#employeeForm");
    form.employeeId.value = employee.employeeId;
    form.employeeId.disabled = true;
    form.employeeName.value = employee.employeeName;
    form.employeeDept.value = employee.employeeDept;

    const preview = document.getElementById("previewPhoto");
    if (employee.photoURL) {
      preview.src = employee.photoURL;
      preview.style.display = "block";
    }
    else{
      preview.src = "";
      preview.style.display = "none";
    }

    EmployeeView.setModalTitle("Edit Employee", "fas fa-user-edit");
    EmployeeView.toggleModal("employeeFormModal", true);
    EmployeeView.initDropzone();

  } catch (err) {
    console.error("❌ Edit error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถโหลดข้อมูลพนักงานได้",
    });
  }
};

window.promptDeleteEmployee = async (employeeId) => {
  try {
    const result = await Swal.fire({
      title: 'ลบข้อมูล?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
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
  } catch (err) {
    console.error("❌ Delete error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถลบข้อมูลได้",
    });
  }
};