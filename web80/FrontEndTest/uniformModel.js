// 📁 uniformModel.js (Refactored)
import { db } from './firebaseConfig.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js';

// 🔧 CONFIG
const COLLECTION_NAME = 'UniformsDB';
const uniformCollection = collection(db, COLLECTION_NAME);

// 📦 CRUD
async function fetchAllUniforms() {
  const q = query(uniformCollection, orderBy('uniformID'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fetchUniformById(id) {
  const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

async function createUniform(data) {
  const id = data.uniformID;
  if (!id) throw new Error('Uniform ID is required');
  await setDoc(doc(db, COLLECTION_NAME, id), data);
}

async function updateUniform(id, data) {
  if (!id) throw new Error('Uniform ID is required for update');
  await updateDoc(doc(db, COLLECTION_NAME, id), data);
}

async function deleteUniform(id) {
  if (!id) throw new Error('Uniform ID is required for deletion');
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

// 📤 Export
function exportCSV(dataArray, headers) {
  const csvContent = [
    headers.join(','),
    ...dataArray.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n');
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}

// 📥 Parse
function parseCSV(csvText) {
  const rows = csvText.trim().split('\n');
  const headers = rows[0].split(',').map(h => h.trim());
  return rows.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]?.trim() ?? ''));
    return obj;
  });
}

// 🧪 Validation
function isValidUniform(u) {
  return (
    u.uniformID &&
    u.uniformType &&
    u.uniformSize &&
    u.uniformColor &&
    !isNaN(parseInt(u.uniformQty ?? '0'))
  );
}

// 🔄 Convert image to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export const UniformModel = {
  fetchAllUniforms,
  fetchUniformById,
  createUniform,
  updateUniform,
  deleteUniform,
  parseCSV,
  exportCSV,
  isValidUniform,
  toBase64
};
