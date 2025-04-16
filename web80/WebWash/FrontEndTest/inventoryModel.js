import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    increment,
    deleteField,
  } from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js';
  
  import { db } from '../assets/js/firebase/firebaseConfig.js';
  
  const codeRef = collection(db, 'InventoryDB');
  
  // ✅ ดึงโค้ดทั้งหมด
  export async function getAllCodes() {
    const snapshot = await getDocs(codeRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // ✅ ดึงโค้ดจาก ID
  export async function getCodeById(codeId) {
    const snap = await getDoc(doc(db, 'InventoryDB', codeId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
  
  // ✅ ดึงโค้ดทั้งหมดของยูนิฟอร์มใดยูนิฟอร์มหนึ่ง
  export async function getCodesByUniformId(uniformId) {
    const q = query(codeRef, where('uniformId', '==', uniformId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  // ✅ ตรวจสอบว่าโค้ดซ้ำกับสีนี้ไหม
  export async function isDuplicateCode(code, color) {
    const q = query(codeRef, where('uniformCode', '==', code));
    const snapshot = await getDocs(q);
    return snapshot.docs.some(doc => doc.data().color === color);
  }
  
  // ✅ เพิ่มโค้ดใหม่
  export async function addUniformCode({ code, uniformId, color }) {
    const newId = `${code}-${color}-${Date.now()}`;
  
    await setDoc(doc(db, 'InventoryDB', newId), {
      uniformCode: code,
      uniformId,
      status: 'available',
      washStatus: null,
      employeeId: null,
      employeeName: null,
      color,
      qty: 1,
      rewashCount: 0,
    });
  
    return newId;
  }
  
  // ✅ ลบโค้ด
  export async function deleteUniformCode(codeId) {
    await deleteDoc(doc(db, 'InventoryDB', codeId));
  }
  
  // ✅ มอบหมายชุด (Assign)
  export async function assignCode(codeId, employeeId, employeeName) {
    await updateDoc(doc(db, 'InventoryDB', codeId), {
      usageStatus: 'in-use',
      employeeId,
      employeeName,
      assignedAt: new Date().toISOString(),
      rewashCount: increment(1),
    });
  }
  
  // ✅ คืนชุด (Return)
  export async function returnCode(codeId) {
    await updateDoc(doc(db, 'InventoryDB', codeId), {
      usageStatus: 'available',
      employeeId: null,
      employeeName: null,
      assignedAt: null,
      washStatus: null,
      rewashCount: deleteField(),
    });
  }
  
  // ✅ นับจำนวน code ที่มี usageStatus ไม่ใช่ available
  export async function countUsedCodes(uniformId) {
    const q = query(codeRef, where('uniformId', '==', uniformId), where('usageStatus', '!=', 'available'));
    const snap = await getDocs(q);
    return snap.size;
  }
  
  // ✅ ดึง code ทั้งหมดและแปลงเป็น CSV
  export async function exportCodesToCSV() {
    const codes = await getAllCodes();
    const csv = ['Code,Status,EmployeeID,EmployeeName,UniformID'];
  
    codes.forEach(c => {
      csv.push(`${c.uniformCode},${c.status || '-'},${c.employeeId || '-'},${c.employeeName || '-'},${c.uniformId}`);
    });
  
    return csv.join('\n');
  }