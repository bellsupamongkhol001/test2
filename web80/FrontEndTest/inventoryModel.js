// 📁 inventoryModel.js
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const db = getFirestore();

const UniformsDB = collection(db, "UniformsDB");
const InventoryDB = collection(db, "InventoryDB");
const EmployeesDB = collection(db, "EmployeesDB");

let _uniformsCache = null;

export function clearUniformCache() {
  _uniformsCache = null;
}

export async function fetchUniforms() {
  if (_uniformsCache) return _uniformsCache;
  const snapshot = await getDocs(UniformsDB);
  _uniformsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return _uniformsCache;
}

export async function fetchUniformById(uniformId) {
  if (!uniformId) return null;
  const snap = await getDoc(doc(UniformsDB, uniformId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchEmployeeById(empId) {
  if (!empId) return null;
  const snap = await getDoc(doc(EmployeesDB, empId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function fetchInventoryItems() {
  try {
    const snapshot = await getDocs(query(InventoryDB, orderBy("UniformType")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch {
    const snapshot = await getDocs(InventoryDB);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export async function validateUniformCode(code) {
  if (!code) return false;
  const ref = doc(InventoryDB, code);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function assignUniformToEmployee(data) {
  const id = `${data.UniformCode}-${data.EmployeeID || "unassigned"}`;
  await setDoc(doc(InventoryDB, id), {
    UniformID: data.UniformID,
    UniformName: data.UniformName || "",
    UniformType: data.UniformType,
    UniformSize: data.UniformSize,
    UniformColor: data.UniformColor,
    UniformCode: data.UniformCode,
    UniformQty: data.UniformQty || 1,
    img: data.img || "",
    EmployeeID: data.EmployeeID || "",
    EmployeeName: data.EmployeeName || "",
    EmployeDepartment: data.EmployeDepartment || "",
    Status: data.Status || "available",
    RewashCount: data.RewashCount || 0
  });
}

export async function assignFromAvailableCode(code, employeeData) {
  // 🔍 ค้นหาโค้ดจาก InventoryDB ที่ยัง available
  const q = query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "available")
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("ไม่พบโค้ดนี้ในระบบหรือถูก Assign ไปแล้ว");
  }

  const docRef = snap.docs[0].ref;  // ✅ ใช้ document reference จริง

  await updateDoc(docRef, {
    Status: "assigned",
    EmployeeID: employeeData.employeeId,
    EmployeeName: employeeData.employeeName,
    EmployeDepartment: employeeData.employeeDept,
    RewashCount: await countRewashByUniformCode(code)
  });
}


export async function returnUniform(code) {
  const q = query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "assigned")
  );
  const snap = await getDocs(q);

  if (snap.empty) throw new Error("ไม่พบโค้ดนี้หรือโค้ดยังไม่ได้ถูก Assign");

  const docRef = snap.docs[0].ref;
  await updateDoc(docRef, {
    Status: "available",
    EmployeeID: "",
    EmployeeName: "",
    EmployeDepartment: ""
  });
}

export async function deleteUniformEntry(code) {
  await deleteDoc(doc(InventoryDB, code));
}

export async function updateUniformCode(code, payload) {
  await updateDoc(doc(InventoryDB, code), payload);
}

export async function getAllCodesByUniformID(uniformId) {
  if (!uniformId) return [];
  const q = query(InventoryDB, where("UniformID", "==", uniformId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function countRewashByUniformCode(code) {
  const q = query(InventoryDB, where("UniformCode", "==", code));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getUniformCodeCountById(uniformId) {
  if (!uniformId) return 0;
  const q = query(InventoryDB, where("UniformID", "==", uniformId));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function getInventorySummary() {
  const snapshot = await getDocs(InventoryDB);
  const items = snapshot.docs.map(doc => doc.data());
  return {
    total: items.length,
    assigned: items.filter(i => i.Status === "assigned").length,
    available: items.filter(i => i.Status === "available").length
  };
}

export async function fetchAllForExport() {
  const snapshot = await getDocs(InventoryDB);
  return snapshot.docs.map(doc => doc.data());
}

export function parseCSV(text) {
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",").map(h => h.trim());
  return rows.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.trim());
    return obj;
  });
}

export function exportCSV(dataArray, headers) {
  const csv = [
    headers.join(","),
    ...dataArray.map(row => headers.map(h => `"${row[h] || ""}"`).join(","))
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}

export const InventoryModel = {
  validateUniformCode,
  fetchUniforms,
  fetchUniformById,
  fetchEmployeeById,
  fetchInventoryItems,
  assignUniformToEmployee,
  assignFromAvailableCode,
  returnUniform,
  deleteUniformEntry,
  updateUniformCode,
  getAllCodesByUniformID,
  countRewashByUniformCode,
  getUniformCodeCountById,
  getInventorySummary,
  fetchAllForExport,
  parseCSV,
  exportCSV,
  clearUniformCache
};
