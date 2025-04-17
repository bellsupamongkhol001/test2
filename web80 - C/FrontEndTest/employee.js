// ==================== Firebase Init ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvJ4SgGaazPf6mY4G5-QfWcX2Yhkg-1X0",
  authDomain: "rd-wash-v2.firebaseapp.com",
  projectId: "rd-wash-v2",
  storageBucket: "rd-wash-v2.firebasestorage.app",
  messagingSenderId: "553662948172",
  appId: "1:553662948172:web:2423d7a81f2bbc9d53a5e9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const EMP_COLLECTION = collection(db, "EmployeesDB");

// ==================== DOM Ready ====================
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("searchEmployee")
    .addEventListener("input", renderEmployeeTable);
  renderEmployeeTable();
});

// ==================== Get All ====================
async function getAllEmployees() {
  const snapshot = await getDocs(EMP_COLLECTION);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getEmployee(id) {
  const empDoc = await getDoc(doc(db, "EmployeesDB", id));
  return empDoc.exists() ? empDoc.data() : null;
}

// ==================== Render Table ====================
async function renderEmployeeTable() {
  const tbody = document.getElementById("employeeTableBody");
  const keyword = document.getElementById("searchEmployee").value.toLowerCase();
  tbody.innerHTML = "";

  const employees = await getAllEmployees();
  const filtered = employees.filter(
    (emp) =>
      emp.employeeId.toLowerCase().includes(keyword) ||
      emp.employeeName.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No employees found.</td></tr>';
    return;
  }

  filtered.forEach((emp) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp.employeeId}</td>
      <td>${emp.employeeName}</td>
      <td>${emp.employeeDept}</td>
      <td><img src="${emp.employeePhoto}" alt="Photo" style="max-width:60px; border-radius:6px;"></td>
      <td class="actions">
        <button class="edit" onclick="openEmployeeForm('${emp.employeeId}')">Edit</button>
        <button class="delete" onclick="toggleDeleteModal(true, '${emp.employeeId}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==================== Form Logic ====================
window.openEmployeeForm = async function (id = null) {
  clearForm();
  const modal = document.getElementById("employeeFormModal");
  const title = document.getElementById("employeeModalTitle");
  const idField = document.getElementById("employeeId");

  if (id) {
    title.textContent = "Edit Employee";
    idField.disabled = true;

    const emp = await getEmployee(id);
    if (emp) {
      idField.value = emp.employeeId;
      document.getElementById("employeeName").value = emp.employeeName;
      document.getElementById("employeeDept").value = emp.employeeDept;
      document.getElementById("employeePhoto").dataset.preview = emp.employeePhoto;
      document.getElementById("employeeEditIndex").value = emp.employeeId;
    }
  } else {
    title.textContent = "Add Employee";
    idField.disabled = false;
  }

  modal.style.display = "flex";
};

window.toggleEmployeeModal = function (show) {
  document.getElementById("employeeFormModal").style.display = show ? "flex" : "none";
};

function clearForm() {
  document.getElementById("employeeId").value = "";
  document.getElementById("employeeName").value = "";
  document.getElementById("employeeDept").value = "";
  document.getElementById("employeePhoto").value = "";
  document.getElementById("employeePhoto").dataset.preview = "";
  document.getElementById("employeeEditIndex").value = "";
}

// ==================== Save ====================
window.saveEmployee = async function () {
  const isValid = await validateEmployeeForm();
  if (!isValid) return;

  const id = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("employeeName").value.trim();
  const dept = document.getElementById("employeeDept").value.trim();
  const file = document.getElementById("employeePhoto").files[0];

  let photo = "";
  if (file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      photo = e.target.result;
      await saveToDatabase(id, name, dept, photo);
    };
    reader.readAsDataURL(file);
  } else {
    photo = document.getElementById("employeePhoto").dataset.preview || "";
    await saveToDatabase(id, name, dept, photo);
  }
};

async function saveToDatabase(id, name, dept, photo) {
  await setDoc(doc(db, "EmployeesDB", id), {
    employeeId: id,
    employeeName: name,
    employeeDept: dept,
    employeePhoto: photo,
  });

  alert("✅ ข้อมูลพนักงานถูกบันทึกเรียบร้อยแล้ว");
  toggleEmployeeModal(false);
  renderEmployeeTable();
}

// ==================== Delete ====================
let currentDeleteId = null;

window.toggleDeleteModal = function (show, id = null) {
  currentDeleteId = id;
  document.getElementById("deleteModal").style.display = show ? "flex" : "none";
};

window.deleteEmployee = async function () {
  if (!currentDeleteId) return;
  await deleteDoc(doc(db, "EmployeesDB", currentDeleteId));
  toggleDeleteModal(false);
  renderEmployeeTable();
};

// ==================== Validation ====================
async function validateEmployeeForm() {
  const id = document.getElementById("employeeId").value.trim();
  const name = document.getElementById("employeeName").value.trim();
  const dept = document.getElementById("employeeDept").value.trim();
  const editId = document.getElementById("employeeEditIndex").value;
  const idPattern = /^[A-Z0-9]+$/;

  if (!id || !name || !dept) {
    alert("⚠️ กรุณากรอกข้อมูลให้ครบทุกช่อง");
    return false;
  }

  if (!idPattern.test(id)) {
    alert("⚠️ Employee ID ต้องเป็น A-Z หรือ 0-9 เท่านั้น");
    return false;
  }

  if (!editId) {
    const exists = await getEmployee(id);
    if (exists) {
      alert("❌ มี Employee ID นี้ในระบบแล้ว");
      return false;
    }
  }

  return true;
}

// ==================== Mock Data ====================
window.generateMockData = async function () {
  const names = Array.from({ length: 20 }, (_, i) => `EmployeeName${String(i + 1).padStart(3, "0")}`);
  const dept = "Research and Development";
  const photo = "https://cdn-icons-png.flaticon.com/512/2919/2919906.png";

  for (let i = 0; i < names.length; i++) {
    const id = `EMP${1000 + i}`;
    await setDoc(doc(db, "EmployeesDB", id), {
      employeeId: id,
      employeeName: names[i],
      employeeDept: dept,
      employeePhoto: photo,
    });
  }

  renderEmployeeTable();
};

// ==================== Export CSV ====================
window.exportEmployees = async function () {
  const employees = await getAllEmployees();
  if (!employees.length) return alert("❗ ไม่มีข้อมูลพนักงาน");

  const csvHeader = "Employee ID,Name,Department,Photo\n";
  const csvRows = employees.map(
    (e) => `"${e.employeeId}","${e.employeeName}","${e.employeeDept}","${e.employeePhoto}"`
  );
  const csvContent = csvHeader + csvRows.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EmployeesDB_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}