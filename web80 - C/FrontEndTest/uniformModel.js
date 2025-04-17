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

/**
 * Fetch all uniforms ordered by uniformID.
 * Falls back to client-side sort if orderBy fails.
 * @returns {Promise<Array<Object>>}
 */
async function fetchAllUniforms() {
  try {
    const q = query(uniformCollection, orderBy('uniformID'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn('OrderBy failed, fetching without order and sorting locally', e);
    const snapshot = await getDocs(uniformCollection);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return data.sort((a, b) => (a.uniformID || '').localeCompare(b.uniformID || ''));
  }
}

/**
 * Fetch a single uniform by document ID.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function fetchUniformById(id) {
  if (!id) throw new Error('Uniform ID is required');
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (e) {
    console.error('Failed to fetch uniform by ID', e);
    throw e;
  }
}

/**
 * Create a new uniform document.
 * Throws if document exists.
 * @param {Object} data
 */
async function createUniform(data) {
  const id = data.uniformID;
  if (!id) throw new Error('Uniform ID is required');
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const existing = await getDoc(docRef);
    if (existing.exists()) throw new Error(`Uniform with ID ${id} already exists`);
    await setDoc(docRef, data);
  } catch (e) {
    console.error('Failed to create uniform', e);
    throw e;
  }
}

/**
 * Update an existing uniform document.
 * @param {string} id 
 * @param {Object} data 
 */
async function updateUniform(id, data) {
  if (!id) throw new Error('Uniform ID is required for update');
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error(`Uniform with ID ${id} not found`);
    await updateDoc(docRef, data);
  } catch (e) {
    console.error('Failed to update uniform', e);
    throw e;
  }
}

/**
 * Delete a uniform document by ID.
 * @param {string} id 
 */
async function deleteUniform(id) {
  if (!id) throw new Error('Uniform ID is required for deletion');
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error(`Uniform with ID ${id} not found`);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to delete uniform', e);
    throw e;
  }
}

/**
 * Export dataArray to CSV Blob URL.
 * @param {Array<Object>} dataArray
 * @param {Array<string>} headers
 * @returns {string} URL for download
 */
function exportCSV(dataArray, headers) {
  if (!Array.isArray(headers) || headers.some(h => typeof h !== 'string')) {
    throw new Error('Headers must be an array of strings');
  }
  const csvRows = [headers.join(',')];
  for (const row of dataArray) {
    const line = headers.map(h => `"${row[h] ?? ''}"`).join(',');
    csvRows.push(line);
  }
  const csvContent = "\uFEFF" + csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return URL.createObjectURL(blob);
}

/**
 * Parse CSV text to array of objects.
 * Note: This simple parser does not handle commas inside quoted fields.
 * @param {string} csvText
 * @returns {Array<Object>}
 */
function parseCSV(csvText) {
  const rows = csvText.trim().split('\n');
  const headers = rows[0].split(',').map(h => h.replace(/(^"|"$)/g, '').trim());
  return rows.slice(1).map(line => {
    const values = line.split(',').map(cell => cell.replace(/(^"|"$)/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
}

/**
 * Validate uniform object shape.
 * Checks required fields and numeric qty >= 0.
 * @param {Object} u
 * @returns {boolean}
 */
function isValidUniform(u) {
  const qty = parseInt(u.uniformQty ?? '0', 10);
  return (
    typeof u.uniformID === 'string' && u.uniformID.trim() !== '' &&
    typeof u.uniformType === 'string' && u.uniformType.trim() !== '' &&
    typeof u.uniformSize === 'string' && u.uniformSize.trim() !== '' &&
    typeof u.uniformColor === 'string' && u.uniformColor.trim() !== '' &&
    !isNaN(qty) && qty >= 0
  );
}

/**
 * Convert File to Base64 data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
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
  exportCSV,
  parseCSV,
  isValidUniform,
  toBase64
};
