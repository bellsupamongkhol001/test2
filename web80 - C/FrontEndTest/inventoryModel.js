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
const UniformsDB   = collection(db, "UniformsDB");
const InventoryDB  = collection(db, "InventoryDB");
const EmployeesDB  = collection(db, "EmployeesDB");

let _uniformsCache = null;

/** เคลียร์ cache ของ UniformsDB */
export function clearUniformCache() {
  _uniformsCache = null;
}

/** ดึงข้อมูล Uniform Base ทั้งหมด (cache) */
export async function fetchUniforms() {
  if (_uniformsCache) return _uniformsCache;
  const snapshot = await getDocs(UniformsDB);
  _uniformsCache = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return _uniformsCache;
}

/** ดึง Uniform Base ตาม ID */
export async function fetchUniformById(uniformId) {
  if (!uniformId) return null;
  const snap = await getDoc(doc(UniformsDB, uniformId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** ดึงข้อมูลพนักงานตามรหัส */
export async function fetchEmployeeById(empId) {
  if (!empId) return null;
  const snap = await getDoc(doc(EmployeesDB, empId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** ดึงรายการ Inventory ทั้งหมด เรียงตาม UniformType */
export async function fetchInventoryItems() {
  try {
    const snap = await getDocs(query(InventoryDB, orderBy("UniformType")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(InventoryDB);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

/** เช็คโค้ดซ้ำ */
export async function validateUniformCode(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));
  return !snap.empty;
}

/**
 * เพิ่มโค้ดใหม่ใน InventoryDB
 * - กำหนด RewashCount = 0 ครั้งแรก
 * - ใช้ merge:true เพื่อไม่เขียนทับฟิลด์เดิม (ถ้าใช้ซ้ำ ID นี้)
 */
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

/** Assign โค้ดที่สถานะ available ให้พนักงาน (ไม่แตะ RewashCount) */
export async function assignFromAvailableCode(code, employeeData) {
  const snap = await getDocs(query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "available")
  ));
  if (snap.empty) throw new Error("ไม่พบโค้ดนี้ในระบบหรือถูก Assign ไปแล้ว");

  const ref = snap.docs[0].ref;
  await updateDoc(ref, {
    Status:            "assigned",
    EmployeeID:        employeeData.employeeId,
    EmployeeName:      employeeData.employeeName,
    EmployeDepartment: employeeData.employeeDept
  });
}

/** คืนโค้ด (set Status=available) โดยไม่แตะ RewashCount */
export async function returnUniform(code) {
  const snap = await getDocs(query(
    InventoryDB,
    where("UniformCode", "==", code),
    where("Status", "==", "assigned")
  ));
  if (snap.empty) throw new Error("ไม่พบโค้ดนี้หรือโค้ดยังไม่ได้ถูก Assign");

  const ref = snap.docs[0].ref;
  await updateDoc(ref, {
    Status:            "available",
    EmployeeID:        "",
    EmployeeName:      "",
    EmployeDepartment: ""
  });
}

/** ลบรายการโค้ดทั้งหมดที่เจอโดยใช้ UniformCode */
export async function deleteUniformEntry(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));
  if (snap.empty) throw new Error("ไม่พบโค้ดนี้ในระบบ");

  for (const d of snap.docs) {
    await deleteDoc(doc(InventoryDB, d.id));
  }
}

/** อัพเดตโค้ด (เช่น แก้ไข UniformCode) */
export async function updateUniformCode(code, payload) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));
  if (snap.empty) throw new Error("ไม่พบโค้ดในระบบ");

  for (const d of snap.docs) {
    await updateDoc(doc(InventoryDB, d.id), payload);
  }
}

/** ดึงโค้ดทั้งหมดของ UniformID นั้น ๆ */
export async function getAllCodesByUniformID(uniformId) {
  if (!uniformId) return [];
  const snap = await getDocs(query(InventoryDB, where("UniformID", "==", uniformId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** นับจำนวนโค้ดของ UniformID */
export async function getUniformCodeCountById(uniformId) {
  if (!uniformId) return 0;
  const snap = await getDocs(query(InventoryDB, where("UniformID", "==", uniformId)));
  return snap.size;
}

/** สรุปสถิติ Dashboard */
export async function getInventorySummary() {
  const snap = await getDocs(InventoryDB);
  const items = snap.docs.map(d => d.data());
  return {
    total:     items.length,
    assigned:  items.filter(i => i.Status === "assigned").length,
    available: items.filter(i => i.Status === "available").length
  };
}

/** ดึงข้อมูลทั้งหมดสำหรับ Export CSV */
export async function fetchAllForExport() {
  const snap = await getDocs(InventoryDB);
  return snap.docs.map(d => d.data());
}

/** แปลง CSV → Array of Objects */
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

/** สร้าง URL สำหรับดาวน์โหลด CSV */
export function exportCSV(dataArray, headers) {
  const csv   = [ headers.join(","), 
                  ...dataArray.map(row => 
                    headers.map(h => `"${row[h]||""}"`).join(",")
                  )
                ].join("\n");
  const blob  = new Blob([ "\uFEFF" + csv ], { type: "text/csv;charset=utf-8;" });
  return URL.createObjectURL(blob);
}

/** หาค่า UniformID จาก UniformCode */
export async function getUniformIdByCode(code) {
  const snap = await getDocs(query(InventoryDB, where("UniformCode", "==", code)));
  if (snap.empty) {
    console.warn("⚠️ ไม่พบ document ที่มี UniformCode:", code);
    return null;
  }
  const data = snap.docs[0].data();
  return data.UniformID || data.uniformID || null;
}

/** รวม export เป็น object เดียว */
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
