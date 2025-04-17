// 📁 assets/js/models/employeeModel.js
import { db } from "./firebaseConfig.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const COLLECTION_NAME = "EmployeesDB";
const employeeCollection = collection(db, COLLECTION_NAME);

// 🔄 CRUD
async function fetchAllEmployees() {
  const q = query(employeeCollection, orderBy("employeeName"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchEmployeeById(employeeId) {
  const docSnap = await getDoc(doc(db, COLLECTION_NAME, employeeId));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

async function createEmployee(employeeData) {
  const id = employeeData.employeeId?.trim();
  if (!id) throw new Error("Employee ID is required");
  await setDoc(doc(db, COLLECTION_NAME, id), employeeData);
}

async function updateEmployee(employeeId, updateData) {
  if (!employeeId) throw new Error("Employee ID is required for update");
  await updateDoc(doc(db, COLLECTION_NAME, employeeId), updateData);
}

async function deleteEmployee(employeeId) {
  if (!employeeId) throw new Error("Employee ID is required for deletion");
  await deleteDoc(doc(db, COLLECTION_NAME, employeeId));
}

// 🖼️ Base64 Image
async function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 📑 CSV Parser
function parseCSV(csvText) {
  const rows = csvText.trim().split("\n");
  const headers = rows[0].split(",").map(h => h.trim().toLowerCase());

  return rows.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      if (h === "employeeid") obj.employeeId = values[i]?.trim() ?? "";
      if (h === "employeename") obj.employeeName = values[i]?.trim() ?? "";
      if (h === "employeedept") obj.employeeDept = values[i]?.trim() ?? "";
    });
    return obj;
  });
}

// ✅ Validation
function isValidEmployee(emp) {
  return emp.employeeId && emp.employeeName && emp.employeeDept;
}

export const EmployeeModel = {
  fetchAllEmployees,
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  parseCSV,
  convertImageToBase64,
  isValidEmployee,
};
