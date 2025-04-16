// ==============================
// 🔧 Firebase Configuration
// ==============================
// ✅ Section: Firebase App Initialization
// - Import Firebase App และ Firestore SDK
// - ตั้งค่า Firebase Config
// - เรียกใช้ initializeApp เพื่อเชื่อมต่อ Firebase Project
// - สร้างตัวแปร `db` สำหรับใช้งาน Firestore ทั่วระบบ
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
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
  deleteField,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAvJ4SgGaazPf6mY4G5-QfWcX2Yhkg-1X0",
  authDomain: "rd-wash-v2.firebaseapp.com",
  projectId: "rd-wash-v2",
  storageBucket: "rd-wash-v2.firebasestorage.app",
  messagingSenderId: "553662948172",
  appId: "1:553662948172:web:2423d7a81f2bbc9d53a5e9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const uniformRef = collection(db, "UniformsDB");
const codeRef = collection(db, "InventoryDB");
const employeeRef = collection(db, "EmployeesDB");
const washRef = collection(db, "washJobs");

// ✅ Section: Shared Firestore Utilities (Model Functions)
// - getAll: ดึงเอกสารทั้งหมดจาก collection ที่กำหนด
// - getById: ดึงเอกสารจาก collection โดยใช้ ID เดียว
async function getAll(ref) {
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getById(ref, id) {
  const snap = await getDoc(doc(db, ref, id));
  return snap.exists() ? snap.data() : null;
}

// ✅ calculateUsedStock(uniformId)
// - ดึงจำนวนชุดที่ถูก assign หรือไม่ available
async function calculateUsedStock(uniformId) {
  const q = query(
    codeRef,
    where("uniformId", "==", uniformId),
    where("usageStatus", "!=", "available")
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ==============================
// 🎨 View Layer (UI Rendering)
// ==============================
// ✅ renderTemplates()
// - สร้าง UI card สำหรับแต่ละ uniform
// - แสดงข้อมูลทั้งหมดแบบ dynamic
async function renderTemplates() {
  const container = document.getElementById("inventoryList");
  container.innerHTML = "";

  const uniforms = await getAll(uniformRef); // ข้อมูล UniformsDB
  const codes = await getAll(codeRef); // ข้อมูล InventoryDB

  for (const u of uniforms) {
    const allCodes = codes.filter((c) => c.uniformId === u.uniformId);
    const used = allCodes.filter((c) => c.status !== "available").length;
    const available = allCodes.length - used;

    // ✅ เพิ่มอัปเดต qty เข้า UniformsDB ให้ตรงตามจำนวน code จริง
    await updateDoc(doc(db, "UniformsDB", u.uniformId), {
      qty: allCodes.length,
    });

    // ✅ สร้างการ์ดแสดงผล
    const card = document.createElement("div");
    card.className = "inventory-card";
    card.innerHTML = `
      <img src="${u.photo}" alt="${u.uniformName}" />
      <h4>${u.uniformName}</h4>
      <p><strong>Size:</strong> ${u.size}</p>
      <p><strong>Color:</strong> ${u.color}</p>
      <p><strong>Stock:</strong> ${available} ชิ้น</p>
      <div class="actions">
        <button class="btn" onclick="window.openAddCodeModal('${u.uniformId}')">➕ Add Code</button>
        <button class="btn" onclick="window.viewDetail('${u.uniformId}')">🔍 View</button>
      </div>
    `;
    container.appendChild(card);
  }
}

// ============================================================================
// 🧾 [saveUniformCode]
// 📌 ฟังก์ชันบันทึกโค้ดยูนิฟอร์มใหม่ (1 code = 1 ชุด)
// ✅ ตรวจสอบข้อมูลว่าครบไหม → ตรวจว่า code ซ้ำไหม → สร้าง document ใหม่ใน Firestore
// ============================================================================
window.saveUniformCode = async function (e) {
  e.preventDefault();

  const uniformId = document.getElementById("addCodeUniformId").value;
  const code = document.getElementById("addUniformCode").value.trim();

  if (!code || !uniformId) return showAlert("⚠️ กรุณากรอกข้อมูลให้ครบ");

  const uniformData = await getById("UniformsDB", uniformId);
  const color = uniformData?.color || "Unknown";

  const q = query(codeRef, where("uniformCode", "==", code));
  const snapshot = await getDocs(q);
  const existsSameColor = snapshot.docs.some(
    (doc) => doc.data().color === color
  );
  if (existsSameColor) return showAlert("❌ โค้ดนี้ถูกใช้แล้วกับสีนี้");

  const newId = `${code}-${color}-${Date.now()}`;

  await setDoc(doc(db, "InventoryDB", newId), {
    uniformCode: code,
    uniformId,
    status: "available",
    washStatus: null,
    employeeId: null,
    employeeName: null,
    color,
    qty: 1,
    rewashCount: 0,
  });

  await increaseQtyInUniformsDB(uniformId);

  window.closeAddCodeModal();
  renderTemplates();
  showAlert("✅ เพิ่ม Uniform Code สำเร็จ");
};

// 📈 เพิ่ม qty ใน UniformsDB ทีละ 1
async function increaseQtyInUniformsDB(uniformId) {
  try {
    const ref = doc(db, "UniformsDB", uniformId);
    await updateDoc(ref, { qty: increment(1) });
    console.log(`✅ เพิ่ม qty สำเร็จ +1 สำหรับ ${uniformId}`);
  } catch (err) {
    console.error("❌ เพิ่ม qty ไม่สำเร็จ:", err);
  }
}

// ============================================================================
// 📦 [closeAddCodeModal]
// 📌 ปิด Modal เพิ่มโค้ด และ reset ฟอร์ม
// ============================================================================
window.closeAddCodeModal = function () {
  document.getElementById("codeModal").style.display = "none";
  document.getElementById("codeForm").reset();
};

// ============================================================================
// ➕ [openAddCodeModal]
// 📌 เปิด Modal เพิ่มโค้ด พร้อมกำหนด uniformId ที่จะผูกกับ code นี้
// ============================================================================
window.openAddCodeModal = function (uniformId) {
  document.getElementById("addCodeUniformId").value = uniformId;
  document.getElementById("codeModal").style.display = "flex";
};

// ============================================================================
// 🧍‍♂️ [assignUniform]
// 📌 กด "Assign" → กรอก Employee ID → บันทึกโค้ดว่าใช้แล้ว (in-use)
// ============================================================================
window.assignUniform = async function (code, uniformId) {
  const q = query(codeRef, where("uniformCode", "==", code));
  const snap = await getDocs(q);

  if (snap.empty) return showAlert("❌ ไม่พบโค้ดนี้ในระบบ");

  const docSnap = snap.docs[0];
  const docId = docSnap.id;
  const current = docSnap.data();

  if (current.status && current.status !== "available") {
    return showAlert("❌ โค้ดนี้ถูกใช้งานแล้ว");
  }

  const employeeId = prompt("🧍‍♂️ ใส่รหัสพนักงานเพื่อ Assign:");
  if (!employeeId) return showAlert("⚠️ กรุณาระบุรหัสพนักงาน");

  const empSnap = await getDoc(doc(db, "EmployeesDB", employeeId));
  if (!empSnap.exists()) return showAlert("❌ ไม่พบรหัสพนักงานนี้ในระบบ");

  const employeeName = empSnap.data().employeeName;

  await updateDoc(doc(db, "InventoryDB", docId), {
    status: "in-use",
    employeeId,
    employeeName,
    assignedAt: new Date().toISOString(),
  });

  window.viewDetail(uniformId);
  renderTemplates();
  showAlert("✅ มอบชุดให้พนักงานเรียบร้อยแล้ว");
};

// ============================================================================
// 🔄 [returnUniform]
// 📌 คืนโค้ดยูนิฟอร์มกลับเข้าสู่สถานะ available
// ============================================================================
window.returnUniform = async function (docId, uniformId) {
  await updateDoc(doc(db, "InventoryDB", docId), {
    status: "available",
    employeeId: null,
    employeeName: null,
    usageStatus: deleteField()
  });

  window.viewDetail(uniformId);
  renderTemplates();
  showAlert("✅ คืนโค้ดเรียบร้อยแล้ว");
};

// ============================================================================
// 📤 [exportReport]
// 📌 ดึงข้อมูลทั้งหมดจาก uniformCodes → แปลงเป็น CSV → ดาวน์โหลดเป็นไฟล์
// ============================================================================
window.exportReport = async function () {
  const codes = await getAll(codeRef);
  const csv = ["Code,Status,EmployeeID,EmployeeName,UniformID"];

  codes.forEach((c) => {
    csv.push(
      `${c.uniformCode},${c.status || "-"},${c.employeeId || "-"},${
        c.employeeName || "-"
      },${c.uniformId}`
    );
  });

  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "uniform_report.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("✅ Export complete");
};

// ============================================================================
// 👁️ [viewDetail]
// 📌 เมื่อกด View ที่การ์ดยูนิฟอร์ม → แสดง modal รายละเอียดโค้ดทั้งหมดของยูนิฟอร์มนั้น
// ============================================================================
window.viewDetail = async function (uniformId) {
  const modal = document.getElementById("codeListModal");
  const tbody = document.getElementById("codeListBody");
  tbody.innerHTML = "";

  const codes = await getAll(codeRef);
  codes
    .filter((c) => c.uniformId === uniformId)
    .forEach((code) => {
      const docId = code.id || code.docId;
      const status = code.status || "available";
      const showAssign = status === "available";
      const showReturn = status === "in-use";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${code.uniformCode}</td>
        <td>${code.color}</td>
        <td>${code.employeeId || "-"}</td>
        <td>${code.employeeName || "-"}</td>
        <td>${usageStatus}</td>
        <td>
          ${
            showAssign
              ? `<button onclick="window.assignUniform('${code.uniformCode}', '${code.uniformId}')">📝 Assign</button>`
              : ""
          }
          ${
            showReturn
              ? `<button onclick="window.returnUniform('${docId}', '${code.uniformId}')">🔄 Return</button>`
              : ""
          }
          <button onclick="window.deleteCode('${docId}', '${
        code.uniformId
      }')">🗑️ Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  modal.classList.add("show");
};

// ============================================================================
// 🗑️ [deleteCode]
// 📌 ลบโค้ดยูนิฟอร์มออกจากระบบ พร้อม refresh UI
// ============================================================================
window.deleteCode = async function (codeId, uniformId) {
  const confirmDelete = confirm(`❌ Delete code ${codeId}?`);
  if (!confirmDelete) return;

  await deleteDoc(doc(db, "InventoryDB", codeId));

  // ✅ ลด qty ใน UniformsDB ด้วย
  await decreaseQtyInUniformsDB(uniformId);

  // ✅ รีเฟรช UI
  window.viewDetail(uniformId);
  renderTemplates();
  showAlert("✅ Deleted");
};

// ============================================================================
// 📣 [showAlert]
// 📌 แสดงข้อความแจ้งเตือนแบบ popup ลอย (auto หายภายใน 2.5 วิ)
// ============================================================================
function showAlert(message, type = "success") {
  const alertBox = document.createElement("div");
  alertBox.textContent = message;
  alertBox.className = `popup-alert ${type}`;
  document.body.appendChild(alertBox);
  setTimeout(() => alertBox.remove(), 2500); // ⏱️ auto remove
}

// ============================================================================
// 🔍 [searchAll]
// 📌 ค้นหาจาก keyword → รวมผลจาก 3 หมวด: uniform, codes, employees
// ============================================================================
window.searchAll = async function (e) {
  const keyword = e.target.value.toLowerCase();
  const list = document.getElementById("searchForEverything");
  if (!list) return;

  list.innerHTML = "";

  // 🔍 โหลดข้อมูลทั้งหมด
  const uniforms = await getAll(uniformRef);
  const codes = await getAll(codeRef);
  const employees = await getAll(employeeRef);

  // 🔍 Filter และแสดงผล
  const results = [
    ...uniforms
      .filter((u) => u.uniformName.toLowerCase().includes(keyword))
      .map((u) => `🎽 ${u.uniformName}`),

    ...codes
      .filter((c) => c.uniformCode.toLowerCase().includes(keyword))
      .map((c) => `🎫 ${c.uniformCode} (${c.usageStatus || "-"})`),

    ...employees
      .filter(
        (e) =>
          e.employeeId.toLowerCase().includes(keyword) ||
          e.employeeName.toLowerCase().includes(keyword)
      )
      .map((e) => `👤 ${e.employeeName} (${e.employeeId})`),
  ];

  // 🖨️ แสดงผลลัพธ์
  if (results.length > 0) {
    results.forEach((txt) => {
      const li = document.createElement("li");
      li.textContent = txt;
      list.appendChild(li);
    });
  } else {
    list.innerHTML = "<li>No matches found</li>";
  }
};

// ============================================================================
// 🔻 [closeCodeListModal]
// 📌 ฟังก์ชันปิด Modal แสดงรายละเอียดโค้ดของยูนิฟอร์ม (codeListModal)
// ✅ ใช้ class "show" ในการควบคุมการแสดงผลแทนการแก้ style โดยตรง
// ❗ ป้องกันกรณีที่ modal ไม่พบใน DOM (เช่น DOM ยังโหลดไม่เสร็จ หรือมี typo)
// ============================================================================
window.closeCodeListModal = function () {
  const modal = document.getElementById("codeListModal"); // 🔍 ดึง modal จาก DOM ตาม id

  if (modal) {
    // ✅ ถ้าเจอ element → ลบ class "show" ออก ทำให้ modal หายไป (CSS ควบคุม visibility)
    modal.classList.remove("show");
  } else {
    // ❌ ถ้าไม่เจอ element (เช่น id ผิด หรือ DOM ยังไม่พร้อม) → แจ้งเตือนผ่าน console
    console.error("Element not found: codeListModal");
  }
};

// ====================================================================================
// 🔻 [Click Outside Modal Content to Close]
// 📌 เพิ่ม Event Listener ให้กับ #codeListModal (พื้นหลังของ modal ทั้งหมด)
// ✅ ถ้าผู้ใช้คลิกที่พื้นหลัง (ไม่ใช่เนื้อหา modal) → ให้ปิด modal โดยลบ class "show"
// 💡 ป้องกันการคลิกที่เนื้อหา modal แล้ว modal ถูกปิดโดยไม่ได้ตั้งใจ
// ====================================================================================
document.getElementById("codeListModal").addEventListener("click", (e) => {
  // 🔍 ตรวจสอบว่า user คลิกที่ background modal ไม่ใช่เนื้อหาภายใน modal-content
  if (e.target.id === "codeListModal") {
    // ✅ ปิด modal โดยลบ class "show" ซึ่งควบคุมการแสดงผลผ่าน CSS
    document.getElementById("codeListModal").classList.remove("show");
  }
});

// 🔓 [View Layer] เปิด Modal สำหรับการ Assign ชุดยูนิฟอร์มให้พนักงาน
function openAssignModal(code, uniformId) {
  // 👉 ดึง Element modal ที่ใช้สำหรับ Assign
  const modal = document.getElementById("assignModal");

  // ✅ ถ้า modal มีอยู่ใน DOM จริง
  if (modal) {
    // ✅ เพิ่มคลาส .show เพื่อให้ modal ปรากฏขึ้น (แสดง modal)
    modal.classList.add("show");

    // 📝 เก็บข้อมูลรหัสยูนิฟอร์มไว้ใน dataset ของฟอร์ม
    document.getElementById("assignForm").dataset.code = code;

    // 📝 เก็บ uniformId ไว้ใน dataset เพื่อใช้ตอนกดยืนยัน
    document.getElementById("assignForm").dataset.uniformId = uniformId;

    // 🔄 รีเซ็ตค่า Employee ID ที่เคยกรอกก่อนหน้านี้
    document.getElementById("assignEmployeeId").value = "";

    // 🔄 รีเซ็ตชื่อพนักงานให้ว่าง (รอ autofill)
    document.getElementById("assignEmployeeName").value = "";
  }
}

// 🧠 [Controller Layer] เมื่อผู้ใช้พิมพ์ Employee ID → ตรวจสอบจาก Firestore และกรอกชื่อให้อัตโนมัติ
document
  .getElementById("assignEmployeeId") // 🎯 Target: ช่องกรอก Employee ID ในฟอร์ม Assign
  .addEventListener("input", async (e) => {
    // ✂️ ตัดช่องว่างซ้ายขวา เพื่อความสะอาด
    const id = e.target.value.trim();

    // 🔎 ค้นหาข้อมูลจาก Firestore → ดึง document ที่มี ID ตรงกับที่ผู้ใช้พิมพ์
    const snap = await getDoc(doc(db, "EmployeesDB", id));

    // ✅ ถ้าพบพนักงาน → กรอกชื่อในช่อง assignEmployeeName
    // ❌ ถ้าไม่พบ → ปล่อยว่าง
    document.getElementById("assignEmployeeName").value = snap.exists()
      ? snap.data().employeeName
      : "";
  });

// 🧠 [Controller Layer] เมื่อผู้ใช้กดปุ่ม Submit ฟอร์ม Assign → ทำการบันทึกการมอบหมายยูนิฟอร์มให้พนักงาน
document.getElementById("assignForm").addEventListener("submit", async (e) => {
  e.preventDefault(); // ❌ ป้องกันการรีเฟรชหน้าเว็บจากการ submit แบบฟอร์มปกติ

  // 📌 ดึงข้อมูลโค้ดยูนิฟอร์ม และ ID ของชุดที่เลือกจาก dataset ที่ฝังไว้ใน <form>
  const code = e.target.dataset.code;
  const uniformId = e.target.dataset.uniformId;

  // 🧍 รับค่า Employee ID และ Employee Name ที่ผู้ใช้ป้อน/ระบบกรอก
  const employeeId = document.getElementById("assignEmployeeId").value;
  const employeeName = document.getElementById("assignEmployeeName").value;

  // ❗ ตรวจสอบความถูกต้อง: ถ้าไม่มีข้อมูล → แจ้งเตือนและหยุดทำงาน
  if (!employeeId || !employeeName)
    return showAlert("⚠️ Invalid employee", "error");

  // 📝 อัปเดตข้อมูลใน Firestore → เปลี่ยนสถานะเป็น Assigned พร้อมแนบข้อมูลพนักงาน
  await updateDoc(doc(db, "InventoryDB", code), {
    usageStatus: "in-use", // ✅ ใช้ usageStatus แทน status เดิม
    employeeId,
    employeeName,
    assignedAt: new Date().toISOString(),
    rewashCount: increment(1), // 🕒 บันทึกเวลาที่ assign
  });

  // 🔐 ปิด modal
  closeAssignModal();

  // 🔄 โหลด UI ใหม่ เพื่อให้ข้อมูลอัปเดตในหน้าเว็บ
  renderTemplates();

  // ✅ แจ้งผลลัพธ์
  showAlert("✅ Uniform assigned successfully", "success");
});

// ==========================================================================
// 🎯 ฟังก์ชันปิด Modal "Assign Uniform"
// ✅ ซ่อน modal โดยใช้ style.display
// (💡 ถ้าใช้ Tailwind/Bootstrap ควรใช้ class/remove class แทน)
// ==========================================================================
function closeAssignModal() {
  document.getElementById("assignModal").style.display = "none";
}

// ==========================================================================
// 🎯 Autofill ชื่อพนักงานจาก Employee ID ที่พิมพ์
// ✅ เมื่อผู้ใช้พิมพ์รหัส → ดึงข้อมูล Firestore → เติมชื่ออัตโนมัติ
// ==========================================================================
document
  .getElementById("assignEmployeeId")
  .addEventListener("input", async (e) => {
    const id = e.target.value.trim(); // 🔍 รับค่า Employee ID
    const snap = await getDoc(doc(db, "EmployeesDB", id)); // 📥 ดึงข้อมูลจาก Firestore

    // 🧾 แสดงชื่อพนักงาน หรือเคลียร์ถ้าไม่พบ
    document.getElementById("assignEmployeeName").value = snap.exists()
      ? snap.data().employeeName
      : "";
  });

// ==========================================================================
// 🎯 บันทึกการ Assign Uniform → บันทึกลง Firestore
// ✅ เก็บรหัสชุดและรหัสพนักงาน → อัปเดต usageStatus และเจ้าของ
// ==========================================================================
document.getElementById("assignForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  // 🧩 ดึงค่า dataset จาก form
  const code = e.target.dataset.code;
  const uniformId = e.target.dataset.uniformId;

  // 🧍‍♂️ ดึงค่าจาก input
  const employeeId = document.getElementById("assignEmployeeId").value;
  const employeeName = document.getElementById("assignEmployeeName").value;

  // ❗ Validation: ห้ามว่าง
  if (!employeeId || !employeeName)
    return showAlert("⚠️ Invalid employee", "error");

  // 💾 อัปเดต Firestore → เปลี่ยน status เป็น Assigned
  await updateDoc(doc(db, "InventoryDB", docId), {
    status: "in-use",
    employeeId,
    employeeName,
    assignedAt: new Date().toISOString(),
  });

  // ✅ ปิด modal และโหลดข้อมูลใหม่
  closeAssignModal();
  renderTemplates(); // 🔁 โหลดหน้าใหม่ (อัปเดตข้อมูล)
  showAlert("✅ Uniform assigned successfully", "success");
});

// ==============================
// 🎮 Controller Layer (Business Logic & Event Handling)
// ==============================
// ✅ Document Ready Handler
// - ฟัง event และเรียก controller ต่าง ๆ
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("codeForm")
    ?.addEventListener("submit", saveUniformCode);
  document
    .getElementById("searchByUniformAndEmployee")
    ?.addEventListener("input", searchAll);
  document
    .getElementById("btnExportReport")
    ?.addEventListener("click", exportReport);
  renderTemplates();
});

async function updateQtyInUniformsDB(uniformId) {
  try {
    // ดึงข้อมูลจาก InventoryDB ที่ตรงกับ uniformId
    const invRef = doc(db, "InventoryDB", uniformId);
    const invSnap = await getDoc(invRef);

    if (!invSnap.exists()) {
      console.warn(`⚠️ ไม่พบ Uniform ใน InventoryDB: ${uniformId}`);
      return;
    }

    const invData = invSnap.data();
    const qty = invData.qty || 0;

    // อัปเดต qty ใน UniformsDB
    const uniRef = doc(db, "UniformsDB", uniformId);
    await setDoc(uniRef, { qty }, { merge: true });

    console.log(
      `✅ อัปเดต qty ใน UniformsDB = ${qty} สำเร็จสำหรับ ${uniformId}`
    );
  } catch (error) {
    console.error("❌ ไม่สามารถอัปเดต qty ใน UniformsDB:", error);
  }
}

async function decreaseQtyInUniformsDB(uniformId) {
  try {
    const ref = doc(db, "UniformsDB", uniformId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const currentQty = snap.data().qty || 0;
    const newQty = Math.max(0, currentQty - 1); // ไม่ให้ติดลบ

    await updateDoc(ref, { qty: newQty });

    console.log(`📉 ลด qty ของ ${uniformId} เหลือ ${newQty}`);
  } catch (err) {
    console.error("❌ ลด qty ไม่สำเร็จ:", err);
  }
}

await deleteDoc(doc(db, "InventoryDB", uniformCode));
await clearQtyInUniformsDB(uniformId);
