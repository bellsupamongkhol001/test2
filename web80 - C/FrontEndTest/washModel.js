import { db } from "./firebaseConfig.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
  addDoc,
  increment,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

/* ============================== 🔧 COLLECTION NAMES ============================== */
const COLLECTIONS = {
  WASH: "WashJobs",
  HISTORY: "WashHistory",
  INVENTORY: "InventoryDB",
  EMPLOYEE: "EmployeesDB",
  UNIFORMS: "UniformsDB",
};

/* ============================== 🧺 WASH JOBS ============================== */
export async function getAllWashes() {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.WASH));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("❌ getAllWashes error:", error);
    return [];
  }
}

export async function getWashJobById(id) {
  const ref = doc(db, COLLECTIONS.WASH, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addWashJob(data, id = null) {
  if (id) {
    await setDoc(doc(db, COLLECTIONS.WASH, id), data);
    return id;
  } else {
    const docRef = await addDoc(collection(db, COLLECTIONS.WASH), data);
    return docRef.id;
  }
}

export async function updateWashJob(id, data) {
  await updateDoc(doc(db, COLLECTIONS.WASH, id), data);
}

export async function deleteWashJob(id) {
  await deleteDoc(doc(db, COLLECTIONS.WASH, id));
}

/* ============================== 🧾 WASH HISTORY ============================== */
export async function getAllWashHistory() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.HISTORY));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addToWashHistory(data, id = null) {
  const ref = collection(db, COLLECTIONS.HISTORY);
  if (id) {
    await setDoc(doc(ref, id), data);
    return id;
  } else {
    const docRef = await addDoc(ref, data);
    return docRef.id;
  }
}

/* ============================== 👕 INVENTORY (UNIFORM CODE) ============================== */
export async function getUniformByCode(code, color = null) {
  const snap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
  let uniforms = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

  uniforms = uniforms.filter(u =>
    String(u.UniformCode || "").toLowerCase().includes(code.toLowerCase())
  );

  if (color) {
    uniforms = uniforms.filter(u => u.UniformColor === color);
  }

  return uniforms;
}

export async function getRewashCount(uniformCode, color) {
  const uniforms = await getUniformByCode(uniformCode, color);
  return uniforms.length > 0 ? uniforms[0].RewashCount || 0 : 0;
}

export async function setRewashCount(code, color, count) {
  const uniforms = await getUniformByCode(code, color);
  if (uniforms.length > 0) {
    const docId = uniforms[0].id;
    await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
      RewashCount: count,
    });
  }
}

export async function incrementRewashCount(uniformCode, color) {
  const uniforms = await getUniformByCode(uniformCode, color);
  if (uniforms.length > 0) {
    await updateDoc(doc(db, COLLECTIONS.INVENTORY, uniforms[0].id), {
      RewashCount: increment(1),
    });
  }
}

export async function scrapUniform(uniformCode, color) {
  const uniforms = await getUniformByCode(uniformCode, color);
  if (uniforms.length === 0) return;

  const docId = uniforms[0].id;

  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    Status: "scrap",  // กำหนดสถานะเป็น scrap
    usageStatus: "scrap", // ตั้งสถานะการใช้งานเป็น scrap
    "status.assign": deleteField(),
    "status.washing": deleteField(),
  });
}

export async function returnToStockAfterESD(washData) {
  const uniforms = await getUniformByCode(washData.uniformCode, washData.color);
  if (uniforms.length === 0) return;

  const docId = uniforms[0].id;
  const currentDoc = uniforms[0];

  let newStatus = currentDoc.Status || "available";

  if (washData.status === "ESD Failed") {
    const count = (washData.rewashCount || 0) + 1;
    newStatus = `Rewash #${count}`;
  }

  await updateDoc(doc(db, COLLECTIONS.INVENTORY, docId), {
    Status: newStatus,
    usageStatus: newStatus === "available" ? "available" : "in-use",
  });

  await deleteWashJob(washData.washId);
}


/* ============================== 👤 EMPLOYEES ============================== */
export async function getEmployeeByUniform(uniformCode, color) {
  const uniforms = await getUniformByCode(uniformCode, color);
  if (uniforms.length === 0) return null;
  const { EmployeeID, EmployeeName } = uniforms[0];
  return { EmployeeID, EmployeeName };
}

export async function getEmployeeById(empId) {
  const ref = doc(db, COLLECTIONS.EMPLOYEE, empId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
