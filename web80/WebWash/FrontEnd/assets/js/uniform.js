// ========== Firebase Init ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  increment
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
const uniformCol = collection(db, "UniformsDB");

// ========== State ==========
let currentDeleteId = null;
let currentPhoto = null;

// ========== DOM Ready ==========
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchUniform").addEventListener("input", renderUniformTable);
  renderUniformTable();
});

// ========== Render Table ==========
async function getAllUniforms() {
  const snapshot = await getDocs(uniformCol);
  return snapshot.docs.map((doc) => doc.data());
}

async function renderUniformTable() {
  const tbody = document.getElementById("uniformTableBody");
  const keyword = document.getElementById("searchUniform").value.toLowerCase();
  tbody.innerHTML = "";

  const uniforms = await getAllUniforms();

  if (!uniforms.length) {
    tbody.innerHTML = '<tr><td colspan="5">No uniforms found.</td></tr>';
    return;
  }

  uniforms.forEach((uni) => {
    const match =
      uni.uniformName.toLowerCase().includes(keyword) ||
      uni.size.toLowerCase().includes(keyword) ||
      uni.color.toLowerCase().includes(keyword);

    if (!match) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${uni.uniformName}</td>
      <td>${uni.size}</td>
      <td>${uni.color}</td>
      <td><img src="${uni.photo}" alt="Uniform Photo" style="max-width:60px; border-radius:6px;"></td>
      <td class="actions">
        <button class="edit" onclick="openUniformForm('${uni.uniformId}')">Edit</button>
        <button class="delete" onclick="toggleDeleteModal(true, '${uni.uniformId}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ========== Open Form ==========
window.openUniformForm = async function (id = null) {
  clearForm();
  toggleUniformModal(true);
  const modalTitle = document.getElementById("uniformModalTitle");

  if (id) {
    modalTitle.textContent = "Edit Uniform";
    const uniDoc = await getDoc(doc(db, "UniformDB", id));
    if (uniDoc.exists()) {
      const uni = uniDoc.data();
      document.getElementById("uniformId").value = uni.uniformId;
      document.getElementById("uniformName").value = uni.uniformName;
      document.getElementById("size").value = uni.size;
      document.getElementById("color").value = uni.color;
      currentPhoto = uni.photo;
    }
  } else {
    modalTitle.textContent = "Add Uniform";
    const newId = await generateNewUniformId();
    document.getElementById("uniformId").value = newId;
  }
};

// ========== Generate ID ==========
async function generateNewUniformId() {
  const uniforms = await getAllUniforms();
  let max = 0;
  uniforms.forEach((u) => {
    const match = u.uniformId?.match(/RD-Uniform-(\d{4})/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > max) max = num;
    }
  });
  return `RD-Uniform-${String(max + 1).padStart(4, "0")}`;
}

// ========== Save ==========
window.saveUniform = async function (e) {
  e.preventDefault();
  const id = document.getElementById("uniformId").value.trim();
  const name = document.getElementById("uniformName").value.trim();
  const size = document.getElementById("size").value.trim();
  const color = document.getElementById("color").value.trim();
  const file = document.getElementById("uniformPhoto").files[0];
  const qty = Number(document.getElementById("qty").value) || 0;

  if (!id || !name || !size || !color) {
    alert("⚠️ Please fill all fields.");
    return;
  }

  if (file && !file.type.startsWith("image/")) {
    alert("⚠️ Please upload a valid image.");
    return;
  }

  const saveToFirebase = async (photo) => {
    await setDoc(doc(db, "UniformsDB", id), {
      uniformId: id,
      uniformName: name,
      size,
      color,
      photo,
      qty,
    });
    toggleUniformModal(false);
    renderUniformTable();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => saveToFirebase(e.target.result);
    reader.readAsDataURL(file);
  } else {
    if (!currentPhoto) {
      alert("⚠️ Please upload a photo.");
      return;
    }
    saveToFirebase(currentPhoto);
  }
};

// ========== Delete ==========
window.toggleDeleteModal = function (show, id = null) {
  currentDeleteId = id;
  document.getElementById("deleteModal").style.display = show ? "flex" : "none";
};

window.deleteUniform = async function () {
  if (!currentDeleteId) return;
  await deleteDoc(doc(db, "UniformsDB", currentDeleteId));
  toggleDeleteModal(false);
  renderUniformTable();
};

// ========== Modal Controls ==========
window.toggleUniformModal = function (show) {
  document.getElementById("uniformModal").style.display = show ? "flex" : "none";
};

function clearForm() {
  document.getElementById("uniformId").value = "";
  document.getElementById("uniformName").value = "";
  document.getElementById("size").value = "";
  document.getElementById("color").value = "";
  document.getElementById("uniformPhoto").value = "";
  currentPhoto = null;
}

// ========== Mock Data ==========
window.generateUniformMock = async function () {
  const sizes = ["S", "M", "L", "XL"];
  const colors = ["White", "Blue", "Black", "Gray"];
  const photo = "https://cdn-icons-png.flaticon.com/512/5242/5242103.png";

  const uniforms = await getAllUniforms();
  let count = uniforms.length;

  for (let i = 1; i <= 20; i++) {
    const id = `RD-Uniform-${String(count + i).padStart(4, "0")}`;
    const name = `Uniform ${count + i}`;
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    await setDoc(doc(db, "UniformsDB", id), {
      uniformId: id,
      uniformName: name,
      size,
      color,
      photo,
    });
  }

  renderUniformTable();
};
