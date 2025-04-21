import { db } from "../firebase/firebaseConfig.js";
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

const UniformsDB   = collection(db, "UniformsDB");
const InventoryDB  = collection(db, "InventoryDB");
const EmployeesDB  = collection(db, "EmployeesDB");

let _uniformsCache = null;

export function clearUniformCache() {
  _uniformsCache = null;
}

export async function fetchUniforms() {
  if (_uniformsCache) return _uniformsCache;
  const snapshot = await getDocs(UniformsDB);
  _uniformsCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
    const snap = await getDocs(query(InventoryDB, orderBy("UniformType")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(InventoryDB);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

export async function validateUniformCode(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));
  return !snap.empty;
}

export async function assignUniformToEmployee(data) {
  const id = data.UniformCode;
  const payload = {
    UniformID:       data.UniformID,
    UniformType:     data.UniformType,
    UniformSize:     data.UniformSize,
    UniformColor:    data.UniformColor,
    UniformCode:     data.UniformCode,
    UniformQty:      data.UniformQty  || 1,
    img:             data.img         || "",
    EmployeeID:      data.EmployeeID  || "",
    EmployeeName:    data.EmployeeName|| "",
    EmployeDepartment: data.EmployeDepartment || "",
    Status:          data.Status      || "available",
    RewashCount:     typeof data.RewashCount === "number"
                       ? data.RewashCount
                       : 0
  };
  await setDoc(doc(InventoryDB, id), payload, { merge: true });
}

export async function assignFromAvailableCode(code, employeeData) {
  const snap = await getDocs(query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "available")
  ));

  if (snap.empty) {
    throw new Error("This code is either not found or already assigned.");
  }

  const ref = snap.docs[0].ref;

  await updateDoc(ref, {
    Status: "assigned",
    EmployeeID: employeeData.employeeId,
    EmployeeName: employeeData.employeeName,
    EmployeDepartment: employeeData.employeeDept
  });
}

export async function returnUniform(code) {
  const snap = await getDocs(query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "assigned")
  ));

  if (snap.empty) {
    throw new Error("Code not found or not currently assigned.");
  }

  const ref = snap.docs[0].ref;
  await updateDoc(ref, {
    Status: "available",
    EmployeeID: "",
    EmployeeName: "",
    EmployeDepartment: ""
  });
}

export async function deleteUniformEntry(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));

  if (snap.empty) {
    throw new Error("Uniform code not found in the system.");
  }

  for (const docSnap of snap.docs) {
    await deleteDoc(doc(InventoryDB, docSnap.id));
  }
}

export async function updateUniformCode(code, payload) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));

  if (snap.empty) {
    throw new Error("Uniform code not found in the system.");
  }

  for (const docSnap of snap.docs) {
    await updateDoc(doc(InventoryDB, docSnap.id), payload);
  }
}

export async function getAllCodesByUniformID(uniformId) {
  if (!uniformId) return [];
  const snap = await getDocs(query(InventoryDB, where("UniformID", "==", uniformId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUniformCodeCountById(uniformId) {
  if (!uniformId) return 0;
  const snap = await getDocs(query(InventoryDB, where("UniformID", "==", uniformId)));
  return snap.size;
}

export async function getInventorySummary() {
  const snap = await getDocs(InventoryDB);
  const items = snap.docs.map(d => d.data());
  return {
    total:     items.length,
    assigned:  items.filter(i => i.Status === "assigned").length,
    available: items.filter(i => i.Status === "available").length
  };
}

export async function fetchAllForExport() {
  const snap = await getDocs(InventoryDB);
  return snap.docs.map(d => d.data());
}

export function parseCSV(text) {
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",").map(h => h.trim());
  return rows.slice(1).map(line => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i]?.trim() || "");
    return obj;
  });
}

export function exportCSV(dataArray, headers) {
  const csv   = [ headers.join(","), 
                  ...dataArray.map(row => 
                    headers.map(h => `"${row[h]||""}"`).join(",")
                  )
                ].join("\n");
  const blob  = new Blob([ "\uFEFF" + csv ], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}

export async function getUniformIdByCode(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));

  if (snap.empty) {
    console.warn("⚠️ No document found with UniformCode:", code);
    return null;
  }

  const data = snap.docs[0].data();
  return data.UniformID || data.uniformID || null;
}

export const InventoryModel = {
  clearUniformCache,
  fetchUniforms,
  fetchUniformById,
  fetchEmployeeById,
  fetchInventoryItems,
  validateUniformCode,
  assignUniformToEmployee,
  assignFromAvailableCode,
  returnUniform,
  deleteUniformEntry,
  updateUniformCode,
  getAllCodesByUniformID,
  getUniformCodeCountById,
  getInventorySummary,
  fetchAllForExport,
  parseCSV,
  exportCSV,
  getUniformIdByCode
};
