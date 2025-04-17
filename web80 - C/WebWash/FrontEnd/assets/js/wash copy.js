// ==================== Firebase Setup ====================
// 🔧 ส่วนนี้ทำหน้าที่กำหนดค่าและเริ่มต้นการเชื่อมต่อกับ Firebase และ Firestore Database

// ✅ 1. นำเข้า Firebase App SDK เพื่อใช้ในการ initialize Firebase app
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

// ✅ 2. นำเข้าเมธอดต่าง ๆ ของ Firestore (Database) เพื่อให้สามารถใช้ในการติดต่อฐานข้อมูลได้
import {
  getFirestore,     // ใช้เชื่อมต่อกับ Firestore Database
  collection,       // ใช้เรียกดู Collection (ตาราง)
  doc,              // ใช้อ้างอิงเอกสารแบบระบุ ID
  addDoc,           // ใช้เพิ่มเอกสารใหม่โดยให้ Firebase สร้าง ID ให้อัตโนมัติ
  deleteDoc,        // ใช้ลบเอกสารใน Firestore
  getDocs,          // ใช้ดึงเอกสารทั้งหมดใน Collection
  getDoc,           // ใช้ดึงเอกสารแบบระบุ ID เดียว
  setDoc,           // ใช้สร้างหรืออัปเดตเอกสารด้วย ID ที่กำหนดเอง
  updateDoc,        // ใช้แก้ไขเฉพาะบางฟิลด์ในเอกสาร
  query,            // ใช้สร้างเงื่อนไขการค้นหา
  where,            // ใช้ระบุเงื่อนไขใน query เช่น field == value
  increment,      // ✅ เพิ่มเข้ามา
  deleteField
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ✅ 3. ตั้งค่า Config ของ Firebase (ข้อมูลนี้จะได้จากหน้า Project ของ Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAvJ4SgGaazPf6mY4G5-QfWcX2Yhkg-1X0",             // 🔑 รหัส API สำหรับเข้าถึงโปรเจกต์
  authDomain: "rd-wash-v2.firebaseapp.com",                      // 🌐 โดเมนสำหรับการยืนยันตัวตน
  projectId: "rd-wash-v2",                                       // 🏷️ ชื่อ Project ID
  storageBucket: "rd-wash-v2.firebasestorage.app",               // ☁️ ใช้สำหรับเก็บรูปภาพ/ไฟล์ (Firebase Storage)
  messagingSenderId: "553662948172",                             // 📱 ใช้สำหรับ Push Notification (ยังไม่ใช้ก็ได้)
  appId: "1:553662948172:web:2423d7a81f2bbc9d53a5e9",             // 🆔 App ID สำหรับการระบุตัวใน Firebase
};

// ✅ 4. เริ่มต้น Firebase App ด้วยค่าที่กำหนดไว้ด้านบน
const app = initializeApp(firebaseConfig);

// ✅ 5. เชื่อมต่อกับ Firestore (ฐานข้อมูล) จาก Firebase App ที่เราสร้าง
const db = getFirestore(app);

// ✅ 6. ประกาศชื่อ Collection ทั้งหมดที่ใช้ในระบบนี้ เพื่อสะดวกในการอ้างอิง
const COLLECTIONS = {
  WASHES: "washJobs",          // 📁 ตารางเก็บข้อมูลงานซักทั้งหมด
  EMPLOYEES: "EmployeesDB",      // 👥 ตารางพนักงาน
  UNIFORMCODES: "InventoryDB",    // 🎽 ตารางโค้ดยูนิฟอร์ม
  UNIFORM: "UniformsDB",
};

// ======================================================
// 📦 ดึงข้อมูลทั้งหมดจาก Collection ที่กำหนด
// ใช้กับ collection เช่น "washJobs", "employees", "uniformCodes"
// ======================================================
async function getAll(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName)); // 🔍 ดึงข้อมูลทั้งหมดใน collection นั้น
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); // 🔁 แปลงข้อมูลให้อยู่ในรูปแบบ array ของ object (รวม id ด้วย)
  } catch (error) {
    console.error("❌ Error getting documents:", error); // 🛑 แสดง error ถ้าไม่สำเร็จ
    throw error;
  }
} //OK

// ======================================================
// ✏️ เพิ่มหรืออัปเดตข้อมูลใน Firestore (ระบุ ID เองได้)
// ใช้สำหรับสร้างหรืออัปเดตเอกสารใน collection
// ======================================================
async function put(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id); // 🔗 อ้างอิงตำแหน่งเอกสาร (ใช้ id ที่กำหนด)
    await setDoc(docRef, data); // 💾 เขียนข้อมูลลง Firestore (สร้างใหม่หรือแทนที่เดิม)
    console.log(`✅ Document written with ID: ${id}`);
  } catch (error) {
    console.error("❌ Error adding/updating document:", error);
    throw error;
  }
} //x

// ======================================================
// 🗑 ลบเอกสารจาก Firestore (ตาม ID และ Collection)
// ใช้เมื่อผู้ใช้ลบข้อมูล เช่น รายการซักหรือยูนิฟอร์ม
// ======================================================
async function remove(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id); // 🔗 สร้าง reference ไปยัง document ที่ต้องการลบ
    await deleteDoc(docRef); // ❌ ลบ document ออกจาก Firestore
    console.log(`✅ Document with ID: ${id} has been deleted.`);
  } catch (error) {
    console.error("❌ Error deleting document:", error);
    throw error;
  }
} //x

// ======================================================
// 🔍 ดึงเอกสารจาก Firestore โดยใช้ ID เดียว (เช่น ใช้ในการแก้ไข)
// ======================================================
async function getById(collectionName, id) {
  console.log(`📄 Getting document from ${collectionName} with ID: ${id}`);
  const docRef = doc(db, collectionName, id); // 🔗 สร้าง reference ไปยังเอกสาร
  const docSnap = await getDoc(docRef); // 📦 ดึงข้อมูลจริงจาก Firestore
  if (!docSnap.exists()) {
    console.warn("⚠️ Document ID not found:", id); // ⚠️ ไม่พบเอกสาร
    return null;
  }
  return docSnap.data(); // ✅ คืนข้อมูลเอกสารในรูปแบบ object
}

// ======================================================
// 🎽 ดึงชุดยูนิฟอร์มทั้งหมดที่มี uniformCode ตรงกัน (อาจมีหลายสี)
// ใช้เพื่อกรองชุดก่อนส่งซัก
// ======================================================
async function getUniformByCode(code) {
  try {
    console.log("🔍 กำลังค้นหา uniformCode:", code);
    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),       // 🔗 เชื่อมต่อกับคอลเลกชันยูนิฟอร์ม
      where("uniformCode", "==", code)            // 🎯 กรองเฉพาะที่มี code ตรงกัน
    );
    const snapshot = await getDocs(uniformQuery);

    if (snapshot.empty) {
      console.warn("⚠️ ไม่พบชุดยูนิฟอร์มที่ตรงกับรหัส:", code);
      return [];
    }

    return snapshot.docs.map((doc) => doc.data()); // 🔁 แปลงข้อมูลเอกสารทั้งหมดเป็น array
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการค้นหาข้อมูล:", error);
    return [];
  }
}

// ======================================================
// 👤 ค้นหาข้อมูลเจ้าของของชุดยูนิฟอร์มจาก uniformCode
// ใช้ดูว่าโค้ดนี้เป็นของใคร
// ======================================================
async function getOwnerByUniformCode(code) {
  try {
    const stockQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", code)
    );

    const snapshot = await getDocs(stockQuery);

    if (snapshot.empty) {
      console.warn("⚠️ ไม่พบเจ้าของชุดยูนิฟอร์มรหัส:", code);
      return [];
    }

    return snapshot.docs.map((doc) => doc.data()); // 🔁 คืนข้อมูลแบบ array
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการดึงเจ้าของชุด:", error);
    return [];
  }
}

// ======================================================
// 👷‍♂️ ดึงข้อมูลพนักงานโดยใช้รหัสพนักงาน (employeeId)
// ใช้ในฟอร์ม assign หรือโหลดชื่อพนักงานอัตโนมัติ
// ======================================================
async function getEmployeeById(empId) {
  try {
    const empRef = doc(db, COLLECTIONS.EMPLOYEES, empId); // 🔗 อ้างอิง document พนักงาน
    const empDoc = await getDoc(empRef); // 📄 ดึงข้อมูลจาก Firestore
    if (!empDoc.exists()) {
      console.warn(`⚠️ ไม่พบพนักงานรหัส: ${empId}`);
      return null;
    }
    return empDoc.data(); // ✅ คืนข้อมูลพนักงาน
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน:", error);
    return null;
  }
}

// ===========================================================
// 🚀 ฟังก์ชันเริ่มต้นหน้าระบบซักผ้า เมื่อโหลดหน้าเสร็จ
// ===========================================================
async function initWashPage() {
  try {
    console.log("🚀 กำลังเริ่มโหลดหน้าระบบซักผ้า...");

    setupListeners();       // 🧩 1. ติดตั้ง event listeners สำหรับ input ต่างๆ
    await renderTable();    // 📊 2. แสดงข้อมูลตารางหลัก (washJobs)
    await renderHistory();  // 🧾 3. แสดงประวัติการทดสอบ ESD (washHistory)
    await updateSummary();  // 📌 4. อัปเดตสรุปตัวเลขใน dashboard

    console.log("✅ โหลดข้อมูลทั้งหมดเรียบร้อยแล้ว");
  } catch (error) {
    console.error("❌ ล้มเหลวในการเริ่มต้นหน้า Wash:", error);
    alert("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าหรือเช็คการเชื่อมต่อ");
  }
}

// ✅ เรียก initWashPage เมื่อโหลด DOM เสร็จสมบูรณ์
document.addEventListener("DOMContentLoaded", initWashPage);

// ===========================================================
// 🪟 เปิด/ปิด Modal สำหรับฟอร์มเพิ่มหรือแก้ไขข้อมูลซักผ้า
// ===========================================================
function toggleModal(show) {
  const modal = document.getElementById("Modal");
  modal.style.display = show ? "flex" : "none"; // แสดงหรือซ่อน modal
  if (!show) clearForm(); // ถ้าปิด modal → เคลียร์ข้อมูลฟอร์ม
}

// ===========================================================
// 📝 เปิดฟอร์มเพิ่มหรือแก้ไขข้อมูล (ถ้ามี ID แสดงเป็นแก้ไข)
// ===========================================================
async function openForm(id = null) {
  clearForm(); // ✨ เคลียร์ค่าทุกช่องก่อน

  // 🖋 เปลี่ยนหัวข้อของ Modal เป็น Add หรือ Edit
  document.getElementById("modalTitle").innerText = id
    ? "Edit Wash"
    : "Add Wash";

  if (id) {
    try {
      const data = await getById(COLLECTIONS.WASHES, id); // 🔍 ดึงข้อมูลที่ต้องการแก้ไข

      if (data) {
        // 🧑‍💼 กรอกค่าลงในช่องฟอร์มจากข้อมูลเก่า
        document.getElementById("editIndex").value = id;
        document.getElementById("empId").value = data.empId;
        document.getElementById("empName").value = data.empName;
        document.getElementById("uniformCode").value = data.uniformCode;
        document.getElementById("qty").value = data.qty;

        const colorSelect = document.getElementById("color");
        const selectedColor = data.color || "";

        // 🎨 ตรวจสอบว่าสีที่เคยเลือกไว้มีใน dropdown หรือไม่
        let found = false;
        for (let option of colorSelect.options) {
          if (option.value === selectedColor) {
            found = true;
            break;
          }
        }

        // 🟡 ถ้าไม่มี → เพิ่ม option สีเข้าไป
        if (!found && selectedColor) {
          const newOption = document.createElement("option");
          newOption.value = selectedColor;
          newOption.textContent = selectedColor;
          colorSelect.appendChild(newOption);
        }

        // ✅ ตั้งค่าสีที่เคยเลือกไว้
        colorSelect.value = selectedColor;
      } else {
        alert("⚠️ ไม่พบข้อมูลที่ต้องการแก้ไข");
      }
    } catch (error) {
      console.error("❌ Error fetching data for edit:", error);
    }
  }

  toggleModal(true); // ✅ เปิด modal หลังโหลดข้อมูลเสร็จ
}

// ===========================================================
// 📝 เปิดฟอร์มเพิ่มหรือแก้ไขข้อมูล (ถ้ามี ID แสดงเป็นแก้ไข)
// ===========================================================


function setupListeners() {
  // 🔍 เมื่อผู้ใช้พิมพ์ในช่องค้นหา → เรียก renderTable() แบบหน่วงเวลา 300ms (debounce)
  document
    .getElementById("search")
    ?.addEventListener("input", debounce(renderTable, 300));

  // 📊 เมื่อผู้ใช้เลือก filter สถานะ → อัปเดตตารางใหม่
  document
    .getElementById("filterStatus")
    ?.addEventListener("change", renderTable);

  // 🎫 เมื่อกรอกรหัสยูนิฟอร์ม → เรียก autofill ข้อมูลอัตโนมัติ
  document
    .getElementById("uniformCode")
    ?.addEventListener("input", debounce(autofillUniformInfo, 300));

  // 💾 เมื่อกดปุ่ม Save → เรียกฟังก์ชัน saveWash()
  document.getElementById("saveBtn")?.addEventListener("click", saveWash);

  // 🎨 เมื่อเปลี่ยนสี → อัปเดตรายละเอียดพนักงานโดยอิงจากโค้ด + สี
  document
    .getElementById("color")
    .addEventListener("change", fetchEmployeeByColor);

  // ⎋ หากผู้ใช้กด ESC → ปิด modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleModal(false);
    }
  });
}


function getStatusFromCreatedAt(
  createdAtISO,
  rewashCount = 0,
  esdTestResult = "",
  currentStatus = ""
) {
  const now = new Date();
  const created = new Date(createdAtISO);
  rewashCount = rewashCount || 0;
  esdTestResult = esdTestResult || "";
  currentStatus = currentStatus || "";

  if (isNaN(created.getTime())) {
    console.error("Invalid createdAt date passed:", createdAtISO);
    return "Unknown Status";
  }

  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  const lowerStatus = (currentStatus || "").toLowerCase();

  // ✅ กรณีผ่าน ESD
  if (esdTestResult === "Pass") return "Completed";

  // ❌ เกิน 3 ครั้งแล้วไม่ผ่าน ESD → Scrap
  if (rewashCount >= 3 && esdTestResult === "Fail") return "Scrap";

  // ✅ เกิน 4 วัน → ถือว่า Completed
  if (diffDays >= 4) return "Completed";

  // 🔄 กำลังรอซัก
  const isWaiting =
    lowerStatus === "waiting to send" ||
    lowerStatus.startsWith("waiting rewash");

  if (isWaiting) {
    if (diffDays < 1) {
      return rewashCount > 0
        ? `Waiting Rewash #${rewashCount}`
        : "Waiting to Send";
    } else {
      return rewashCount > 0 ? `Washing #${rewashCount}` : "Washing";
    }
  }

  // 🟡 ถ้ากำลังซักอยู่ และมีการ Rewash → แสดง Washing #n
  if (lowerStatus === "washing" && rewashCount > 0) {
    return `Washing #${rewashCount}`;
  }

  return currentStatus || "Unknown Status";
}

// ===================== 📋 RENDER WASH TABLE =====================
async function renderTable() {
  const tbody = document.getElementById("washTableBody");
  const keyword = document.getElementById("search").value.toLowerCase();
  const filterStatus = document.getElementById("filterStatus").value;

  // 📄 แสดง Loading ระหว่างโหลดข้อมูล
  tbody.innerHTML =
    "<tr><td colspan='8' style='text-align: center;'>Loading data...</td></tr>";

  try {
    // 1️⃣ ดึงข้อมูล Wash ทั้งหมดจาก Firestore
    const allWashesRaw = await getAll(COLLECTIONS.WASHES);

    // 2️⃣ คำนวณสถานะใหม่ตามเวลาสร้าง
    const allWashes = await Promise.all(
      allWashesRaw.map(async (wash) => {
        if (!wash || !wash.washId) return null;

        const calculatedStatus = getStatusFromCreatedAt(
          wash.createdAt,
          wash.rewashCount || 0,
          wash.esdTestResult || "",
          wash.status || ""
        );

        // ถ้าสถานะเปลี่ยน → อัปเดต
        if (wash.status !== calculatedStatus) {
          await updateDoc(doc(db, COLLECTIONS.WASHES, wash.washId), {
            status: calculatedStatus,
          });
        }

        wash.status = calculatedStatus;
        if (!wash.empName) wash.empName = "N/A";
        return wash;
      })
    );

    // 3️⃣ กรองข้อมูล
    const validWashes = allWashes.filter((wash) => wash !== null);
    const finalData = validWashes.filter((wash) => {
      const matchesKeyword =
        (wash.empName || "").toLowerCase().includes(keyword) ||
        (wash.washId || "").toLowerCase().includes(keyword);

      const matchesStatus =
        !filterStatus || filterStatus === "All"
          ? true
          : (wash.status || "").toLowerCase() === filterStatus.toLowerCase();

      return matchesKeyword && matchesStatus;
    });

    // 4️⃣ Pagination
    const totalItems = finalData.length;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = finalData.slice(startIndex, endIndex);

    tbody.innerHTML = "";

    if (pageData.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="8" style="text-align: center; vertical-align: middle;">No data found</td>`;
      tbody.appendChild(tr);
    } else {
      pageData.forEach((wash) => {
        const tr = document.createElement("tr");
        const statusLower = (wash.status || "").toLowerCase();
        const esdTested = wash.esdTestResult === "Pass" || wash.esdTestResult === "Fail";

        const viewButton = `<button onclick="openForm('${wash.washId}')" ${
          statusLower === "completed" || statusLower === "scrap" ? "disabled" : ""
        }>${statusLower === "completed" || statusLower === "scrap" ? "View" : "Edit"}</button>`;

        const deleteButton = `<button onclick="showDeleteModal('${wash.washId}')">Delete</button>`;
        const shiftDateButtons = `
          <button title="Subtract 1 day" onclick="shiftWashDate('${wash.washId}', -1)">⬅️</button> 
          <button title="Add 1 day" onclick="shiftWashDate('${wash.washId}', 1)">➡️</button>`;
        const esdButton = `<button onclick="showESDModal('${wash.washId}')">ESD</button>`;
        const returnButton = `<button onclick="returnUniform('${wash.washId}')">Return</button>`;

        // 🧠 จัดปุ่มตามสถานะ
        let actionButtonsHTML = "";
        if (statusLower === "waiting to send" || statusLower.startsWith("waiting rewash")) {
          actionButtonsHTML = `${viewButton} ${deleteButton} ${shiftDateButtons}`;
        } else if (statusLower === "washing") {
          actionButtonsHTML = `${shiftDateButtons}`;
        } else if (statusLower === "completed") {
          actionButtonsHTML = wash.esdTestResult === "Pass"
            ? `${returnButton} ${shiftDateButtons}`
            : `${esdButton} ${shiftDateButtons}`;
        } else if (statusLower === "scrap") {
          actionButtonsHTML = ``;
        } else {
          actionButtonsHTML = `<span>No actions</span>`;
        }

        // 🎨 แสดงแถว
        tr.innerHTML = `
          <td>${wash.washId || "-"}</td>
          <td>${wash.empId || "-"}</td>
          <td>${wash.empName || "-"}</td>
          <td>${wash.uniformCode || "-"}</td>
          <td>${wash.color || "-"}</td>
          <td>${wash.qty || "-"}</td>
          <td>${wash.status || "Unknown"}</td>
          <td class="action-buttons">${actionButtonsHTML}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    renderPagination(totalItems, currentPage, rowsPerPage);
  } catch (error) {
    console.error("❌ Error rendering table:", error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red;">Error loading data: ${error.message}</td></tr>`;
  }
}


// 🔄 ค่ากำหนดเริ่มต้นสำหรับ pagination ของตารางประวัติ
let currentHistoryPage = 1;             // หน้าเริ่มต้นที่จะแสดงคือหน้า 1
const historyRowsPerPage = 5;           // แสดง 5 แถวต่อ 1 หน้า

// 📘 ฟังก์ชันหลักสำหรับแสดงตารางประวัติการซักผ้า
async function renderHistory() {
  // 👉 ดึง element ของตารางและ pagination
  const tableBody = document.getElementById("historyTableBody");
  const pagination = document.getElementById("historyPagination");

  // ❗ ตรวจสอบว่า element ทั้งสองมีจริง
  if (!tableBody || !pagination) {
    console.error("History table body or pagination element not found.");
    return;
  }

  // 🧹 ล้างข้อมูลเก่าก่อนโหลดใหม่
  pagination.innerHTML = "";
  tableBody.innerHTML = "";

  try {
    // 📥 โหลดข้อมูลทั้งหมดจาก collection "washHistory"
    const history = await getAll("washHistory");

    // 📭 ถ้าไม่มีข้อมูลเลย ให้แสดงข้อความ "No history found"
    if (history.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="text-align: center; vertical-align: middle;">No history found</td>`;
      tableBody.appendChild(tr);
      return;
    }

    // 🔃 เรียงข้อมูลจากใหม่ไปเก่า ตามวันที่ทดสอบ ESD
    history.sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

    // 📐 คำนวณช่วงข้อมูลสำหรับหน้าปัจจุบัน
    const totalPages = Math.ceil(history.length / historyRowsPerPage);       // จำนวนหน้าทั้งหมด
    const start = (currentHistoryPage - 1) * historyRowsPerPage;             // index เริ่มต้น
    const end = start + historyRowsPerPage;                                  // index สิ้นสุด
    const pageData = history.slice(start, end);                              // ดึงข้อมูลเฉพาะหน้าปัจจุบัน

    // 🖨️ สร้างแถวของข้อมูลประวัติแต่ละรายการ
    pageData.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align: center; vertical-align: middle;">${entry.washId}</td>
        <td style="text-align: center; vertical-align: middle;">${entry.uniformCode}</td>
        <td style="text-align: center; vertical-align: middle;">${entry.empName || "-"} (${entry.empId || "-"})</td>
        <td style="text-align: center; vertical-align: middle;">${entry.testResult}</td>
        <td style="text-align: center; vertical-align: middle;">${entry.testDate}</td>
        <td style="text-align: center; vertical-align: middle;">${entry.status}</td>
      `;
      tableBody.appendChild(tr);  // ➕ เพิ่มแถวลงใน tbody
    });

    // 🔢 สร้างปุ่ม pagination ตามจำนวนหน้าทั้งหมด
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentHistoryPage ? "active" : "";   // ไฮไลต์หน้าปัจจุบัน
      btn.onclick = () => {
        currentHistoryPage = i;   // อัปเดตหมายเลขหน้า
        renderHistory();          // โหลดข้อมูลใหม่
      };
      pagination.appendChild(btn);  // ➕ เพิ่มปุ่มลง DOM
    }
  } catch (error) {
    // 🧯 ถ้าเกิดข้อผิดพลาด ให้แสดงใน console
    console.error("❌ Error rendering history:", error);
  }
}

// 📘 ฟังก์ชันสำหรับอัปเดตข้อมูลสรุปยอดทั้งหมด
// 📘 ฟังก์ชันสำหรับอัปเดตข้อมูลสรุปยอดทั้งหมด
async function updateSummary() {
  try {
    // 📥 ดึงข้อมูลจาก collection washJobs และ washHistory
    const washesRaw = await getAll(COLLECTIONS.WASHES);     // ข้อมูล wash ปัจจุบัน
    const history = await getAll("washHistory");            // ข้อมูลในประวัติ

    // ✅ กรอง null / undefined ทิ้งก่อน
    const washes = (washesRaw || []).filter(w => w && typeof w === 'object');

    // 📌 สรุปค่าต่าง ๆ
    const total = washes.length;
    const waiting = washes.filter((w) => w.status?.includes("Waiting")).length;
    const washing = washes.filter((w) => w.status === "Washing").length;
    const completed = washes.filter((w) => w.status === "Completed").length;
    const rewash = washes.filter((w) => w.status?.includes("Rewash")).length;
    const scrap = washes.filter((w) => w.status === "Scrap").length;
    const historyCount = (history || []).length;

    // 🖥️ แสดงค่าลงบน Dashboard
    document.getElementById("sumTotal").textContent = total;
    document.getElementById("sumWaiting").textContent = waiting;
    document.getElementById("sumWashing").textContent = washing;
    document.getElementById("sumCompleted").textContent = completed;
    document.getElementById("sumRewash").textContent = rewash;
    document.getElementById("sumScrap").textContent = scrap;
    document.getElementById("sumHistory").textContent = historyCount;

  } catch (error) {
    // 🧯 แสดงข้อความ error ถ้าโหลดข้อมูลไม่สำเร็จ
    console.error("❌ Error updating summary:", error);
  }
}


// 📘 ฟังก์ชัน debounce ช่วยชะลอการเรียกฟังก์ชันจนกว่าผู้ใช้จะ "หยุด" พิมพ์
function debounce(fn, delay) {
  let timer;  // ตัวแปรเก็บ timeout ก่อนหน้า

  return function () {
    clearTimeout(timer);  // ถ้ามี timer ก่อนหน้า ให้เคลียร์ทิ้ง (กันซ้ำ)
    timer = setTimeout(() => fn.apply(this, arguments), delay);  
    // สั่งให้เรียกฟังก์ชัน fn ใหม่หลังจากหยุดพิมพ์แล้ว delay ms
  };
}

async function autofillUniformInfo() {
  const code = document.querySelector("#uniformCode")?.value.trim();
  const colorSelect = document.querySelector("#color");

  if (!code) return;

  if (!colorSelect) {
    console.error("❌ ไม่พบ element #color");
    return;
  }

  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.UNIFORMCODES),
        where("uniformCode", "==", code)
      )
    );

    if (querySnapshot.empty) {
      console.warn("🛑 ไม่พบยูนิฟอร์ม:", code);
      colorSelect.innerHTML = '<option value="">No Color Available</option>';
      colorSelect.disabled = true;

      document.querySelector("#empId").value = "";
      document.querySelector("#empName").value = "";
      document.querySelector("#qty").value = 1;
      return;
    }

    const colors = [...new Set(querySnapshot.docs.map((doc) => doc.data().color))];
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colors.forEach((color) => {
      const option = document.createElement("option");
      option.value = color;
      option.textContent = color;
      colorSelect.appendChild(option);
    });

    colorSelect.disabled = false;
    colorSelect.focus();
  } catch (err) {
    console.error("❌ Error during autofill:", err);
    alert("⚠️ เกิดข้อผิดพลาดขณะโหลดข้อมูล Uniform");
  }
}

// ✅ Trigger เมื่อกด Enter เท่านั้น ไม่เรียกบ่อย
document.getElementById("uniformCode").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    autofillUniformInfo();
  }
});



let currentPage = 1;
const rowsPerPage = 10;

// 📘 ฟังก์ชันสำหรับสร้างระบบแบ่งหน้า (pagination) ตามจำนวนข้อมูล
async function renderPagination(totalItems, current, perPage) {
  const pagination = document.getElementById("pagination"); // div สำหรับแสดงปุ่ม

  // ❗ ถ้าไม่เจอ element ให้แสดง error
  if (!pagination) {
    console.error("Pagination element not found.");
    return;
  }

  // 🧹 ล้างปุ่มเดิมก่อน
  pagination.innerHTML = "";

  const totalPages = Math.ceil(totalItems / perPage); // คำนวณจำนวนหน้าทั้งหมด

  // 📌 ถ้ามีแค่ 1 หน้า ไม่ต้องสร้าง pagination
  if (totalPages <= 1) return;

  // ⏮ First Page Button
  const firstPageBtn = document.createElement("button");
  firstPageBtn.innerText = "First";
  firstPageBtn.className = current === 1 ? "disabled" : ""; // ปิดปุ่มถ้าอยู่หน้าแรก
  firstPageBtn.onclick = async () => {
    currentPage = 1;
    await renderTable();
  };
  pagination.appendChild(firstPageBtn);

  // ◀️ Previous Page Button
  const prevPageBtn = document.createElement("button");
  prevPageBtn.innerText = "Previous";
  prevPageBtn.className = current === 1 ? "disabled" : "";
  prevPageBtn.onclick = async () => {
    if (current > 1) currentPage--;
    await renderTable();
  };
  pagination.appendChild(prevPageBtn);

  // 🔢 ปุ่มหน้ากลาง ๆ
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.className = i === current ? "active" : ""; // ไฮไลต์หน้าปัจจุบัน

    btn.onclick = async () => {
      currentPage = i;
      await renderTable();
    };

    pagination.appendChild(btn);

    // 💡 ถ้ามีหน้ามากกว่า 5 ซ่อนปุ่มกลาง ๆ (เพื่อ UI สวยงาม)
    if (totalPages > 5 && i > 3 && i < totalPages - 2) {
      if (i !== current) {
        btn.style.display = "none"; // ซ่อนปุ่ม
      }
    }
  }

  // ▶️ Next Page Button
  const nextPageBtn = document.createElement("button");
  nextPageBtn.innerText = "Next";
  nextPageBtn.className = current === totalPages ? "disabled" : "";
  nextPageBtn.onclick = async () => {
    if (current < totalPages) currentPage++;
    await renderTable();
  };
  pagination.appendChild(nextPageBtn);

  // ⏭ Last Page Button
  const lastPageBtn = document.createElement("button");
  lastPageBtn.innerText = "Last";
  lastPageBtn.className = current === totalPages ? "disabled" : "";
  lastPageBtn.onclick = async () => {
    currentPage = totalPages;
    await renderTable();
  };
  pagination.appendChild(lastPageBtn);
}


function showDeleteModal(id) {
  // ✅ สร้าง overlay modal สำหรับยืนยันการลบข้อมูล
  const modal = document.createElement("div");
  modal.className = "overlay"; // คลาสสำหรับทำฉากหลังมืด

  // ✅ ใส่ HTML สำหรับกล่องยืนยันการลบ
  modal.innerHTML = `
    <div class="confirm-box">
      <h3>Delete Confirmation</h3>
      <p>Are you sure you want to delete this wash job?</p>
      <div>
        <button class="btn-yes" onclick="confirmDelete('${id}', this, true)">Yes</button>
        <button class="btn-no" id="cancelButton">Cancel</button>
      </div>
    </div>
  `;

  // ✅ เพิ่ม modal เข้าไปในหน้าเว็บ
  document.body.appendChild(modal);

  // 🛑 ถ้าผู้ใช้กด Cancel → ปิด modal
  document.getElementById("cancelButton").addEventListener("click", function () {
    closeModal(this);
  });

  // 📦 ปิด modal หากผู้ใช้คลิกบริเวณนอกกล่อง modal
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(e.target);
    }
  });
}

function closeModal(modalElement) {
  // ✅ หา element ที่เป็น overlay (ตัวครอบ modal)
  const overlay = modalElement.closest(".overlay");

  // ✅ ถ้าเจอให้ลบออกจาก DOM
  if (overlay) {
    overlay.remove();
  } else {
    // ❌ ไม่เจอ → แจ้งใน console
    console.error("Overlay element not found.");
  }
}

async function confirmDelete(id, button, confirmed = false) {
  try {
    // ❗ ถ้าไม่ได้กดยืนยัน (confirmed = false) → หยุดทำงาน
    if (!confirmed) return;

    // ✅ อ้างอิงไปยังเอกสารใน Firestore ที่จะลบ
    const washDocRef = doc(db, COLLECTIONS.WASHES, id);
    console.log(`กำลังลบเอกสารด้วย ID: ${id}`);

    // ✅ ลบเอกสารออกจาก Firestore
    await deleteDoc(washDocRef);
    console.log(`✅ เอกสาร ID: ${id} ถูกลบแล้ว.`);

    // ✅ ปิด modal
    closeModal(button);

    // 🔄 รีเฟรชตารางและอัปเดตสรุป
    await renderTable();
    await updateSummary();

    // ✅ แสดงแจ้งเตือนสำเร็จ
    showNotificationModal("ข้อมูลถูกลบเรียบร้อยแล้ว!");
  } catch (error) {
    // ❌ หากเกิดปัญหา → แสดงข้อความและ log
    console.error("❌ เกิดข้อผิดพลาดในการลบเอกสาร:", error);
    showNotificationModal("❌ การลบข้อมูลล้มเหลว. กรุณาลองใหม่อีกครั้ง.");
  }
}

async function confirmESD(id, passed, button = null) {
  const washDocRef = doc(db, COLLECTIONS.WASHES, id);
  const washDoc = await getDoc(washDocRef);

  if (!washDoc.exists()) {
    alert("❌ ไม่พบข้อมูล Wash ที่ต้องการอัปเดต");
    if (button) closeModal(button);
    return;
  }

  const washData = washDoc.data();
  const { uniformCode, color, qty } = washData;
  let   rewashCount = washData.rewashCount || 0;
  let status = "";

  if (passed) {
    status = "Completed";
    rewashCount = 0;

    // ✅ คืนของเข้า Stock เมื่อผ่าน ESD
    await returnToStockAfterESD(id);
  } else {
    // ✅ กรณีไม่ผ่าน: เพิ่มค่า Rewash
    rewashCount += 1;

    // ✅ เพิ่มเข้า uniforms (นับรวมจาก code + color)
    await increaseRewashCount(uniformCode, color);

    if (rewashCount >= 3) {
      status = "Scrap";

      // ✅ ถ้าไม่ผ่านครบ 3 ครั้ง → Scrap
      await markAsScrap(id);
      if (button) closeModal(button);
      return;
    } else {
      status = `Rewash #${rewashCount}`;
    }
  }

  // 📝 เพิ่มข้อมูล ESD ลงใน washHistory
  const historyData = {
    ...washData,
    testResult: passed ? "Pass" : "Fail",
    testDate: new Date().toISOString(),
    status,
    rewashCount,
  };

  await setDoc(doc(db, "washHistory", id), historyData);

  // 🧹 ลบออกจาก washJobs
  await deleteDoc(washDocRef);

  if (button) closeModal(button);

  alert(`✅ ผล ESD: ${passed ? "ผ่าน" : "ไม่ผ่าน"} | สถานะ: ${status}`);
  await renderTable();
  await renderHistory();
  await updateSummary();

    console.log("🧪 กำลังตรวจสอบ Wash ID:", id); 
}

async function exportHistoryToCSV() {
  try {
    // 🔍 ดึงข้อมูลทั้งหมดจาก collection "washHistory"
    const querySnapshot = await getDocs(collection(db, "washHistory"));

    // ❌ หากไม่มีข้อมูลใน history → แจ้งเตือนและหยุดทำงาน
    if (querySnapshot.empty) {
      return alert("No history data to export.");
    }

    // 🗃 แปลงข้อมูลแต่ละเอกสารใน Firestore → Object array
    const data = querySnapshot.docs.map((doc) => doc.data());

    // 📌 สร้าง header (ชื่อคอลัมน์) จาก key ของ object แรก
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")]; // แถวแรกคือหัวตาราง CSV

    // 🧾 วนลูปข้อมูล และแปลงเป็น CSV string แต่ละแถว
    data.forEach((row) => {
      const values = headers.map(
        (header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`
      );
      csvRows.push(values.join(",")); // ต่อแถวข้อมูลเข้าไป
    });

    // 🧷 รวมทุกแถวเข้าเป็นข้อความ CSV
    const csvData = csvRows.join("\n");

    // 💾 แปลงเป็นไฟล์ Blob และดาวน์โหลด
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `wash_history_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  } catch (error) {
    console.error("❌ Error exporting history to CSV:", error);
    alert("❌ Error exporting history. Please try again.");
  }
}

// ✅ เพิ่มปุ่ม Export CSV เข้าไปในหน้า หลัง DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  // 🧱 สร้างปุ่มใหม่
  const exportBtn = document.createElement("button");
  exportBtn.className = "btn-export";
  exportBtn.innerHTML = '<i class="fas fa-file-csv"></i> Export CSV';

  // ⏯ ผูกฟังก์ชัน exportHistoryToCSV เมื่อคลิกปุ่ม
  exportBtn.onclick = exportHistoryToCSV;

  // 📦 แสดงปุ่มไว้ในพื้นที่ที่กำหนด (เช่น div#exportArea)
  document.getElementById("exportArea")?.appendChild(exportBtn);
});

async function saveWash() {
  const color = document.getElementById("color").value;
  const uniformCode = document.getElementById("uniformCode").value.trim();
  const empId = document.getElementById("empId").value.trim();
  const qty = parseInt(document.getElementById("qty").value) || 1;
  const empName = document.getElementById("empName").value.trim();

  if (!empId || !uniformCode || !qty || !color) {
    alert("⚠️ กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  const washId = `WASH-${Date.now()}`;

  try {
    // 🔍 ดึงยูนิฟอร์มจาก InventoryDB
    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const uniformSnap = await getDocs(uniformQuery);

    if (uniformSnap.empty) {
      alert("❌ ไม่พบยูนิฟอร์มนี้ใน InventoryDB");
      return;
    }

    const uniformDoc = uniformSnap.docs[0];
    const uniformData = uniformDoc.data();

    // ❌ ถ้ายูนิฟอร์มโดน Scrap หรือซักซ้ำเกิน 3
    if (uniformData.status === "scrap" || uniformData.rewashCount >= 3) {
      alert("❌ ยูนิฟอร์มนี้ถูก Scrap แล้ว หรือซักซ้ำเกิน 3 ครั้ง");
      return;
    }

    // ✅ ตรวจสอบว่ามี qty พอ
    const currentQty = uniformData.qty || 0;
    if (currentQty < qty) {
      alert(`❌ จำนวนคงเหลือไม่พอ (มีอยู่ ${currentQty} ชุด)`);
      return;
    }

    // ✅ ตรวจสอบซ้ำ: ห้ามซ้ำกัน (empId + uniformCode + color)
    const duplicateCheck = query(
      collection(db, COLLECTIONS.WASHES),
      where("empId", "==", empId),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const duplicateSnap = await getDocs(duplicateCheck);
    if (!duplicateSnap.empty) {
      alert("⚠️ พนักงานนี้มีชุดนี้ในระบบแล้ว");
      return;
    }

    // ✅ ดึงค่า rewashCount จาก InventoryDB
    let rewashCount = uniformData.rewashCount || 0;

    // ✅ บันทึกข้อมูลงานซัก
    await setDoc(doc(db, COLLECTIONS.WASHES, washId), {
      washId,
      empId,
      empName,
      uniformCode,
      color,
      qty,
      createdAt: new Date().toISOString(),
      status: "Waiting to Send",
      rewashCount
    });

    // ✅ ตัดยอด qty จาก InventoryDB และเปลี่ยนสถานะเป็นกำลังซัก
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, uniformDoc.id), {
      qty: increment(-qty),
      employeeId: empId,
      employeeName: empName,
      status: "in-use/washing",
      washStatus: "washing"
    });

    toggleModal(false);
    await renderTable();
    await updateSummary();

    alert("✅ บันทึกงานซักสำเร็จแล้ว");
  } catch (error) {
    console.error("❌ saveWash error:", error);
    alert("❌ เกิดข้อผิดพลาดในการบันทึกงานซัก");
  }
}



async function loadColorsForUniform() {
  const uniformCode = document.getElementById("uniformCode").value.trim();
  const colorSelect = document.getElementById("color");

  // ❌ ถ้ายังไม่ได้กรอกรหัสยูนิฟอร์ม → เคลียร์ dropdown และปิดการใช้งาน
  if (!uniformCode) {
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colorSelect.disabled = true;
    return;
  }

  try {
    // 🔍 ค้นหา uniform ทั้งหมดที่ตรงกับรหัส
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.UNIFORMCODES),
        where("uniformCode", "==", uniformCode)
      )
    );

    // ✅ ถ้าพบข้อมูล
    if (!querySnapshot.empty) {
      // 🔄 ดึงเฉพาะข้อมูล "color" และทำให้ไม่ซ้ำ
      const colors = querySnapshot.docs.map((doc) => doc.data().color);
      const uniqueColors = [...new Set(colors)];

      // 🧩 เติม dropdown ใหม่จากสีที่ได้
      colorSelect.innerHTML = '<option value="">Select Color</option>';
      uniqueColors.forEach((color) => {
        const option = document.createElement("option");
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
      });

      colorSelect.disabled = false;
    } else {
      // ❌ ถ้าไม่พบ uniform ตามรหัส → แจ้งเตือน + ปิด dropdown
      alert("❌ ไม่พบ UniformCode นี้ในระบบ");
      colorSelect.innerHTML = '<option value="">No Color Available</option>';
      colorSelect.disabled = true;
    }
  } catch (err) {
    console.error("❌ Error loading colors:", err);
    alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูลสี");
  }
}

async function fetchEmployeeByColor() {
  const uniformCode = document.getElementById("uniformCode").value.trim();
  const color = document.getElementById("color").value;

  // ⚠️ ต้องกรอกทั้งรหัสและเลือกสีให้ครบก่อน
  if (!uniformCode || !color) return;

  try {
    // 🔍 ค้นหา uniform ที่มีรหัสและสีตรงกัน
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.UNIFORMCODES),
        where("uniformCode", "==", uniformCode),
        where("color", "==", color)
      )
    );

    // ✅ ถ้ามีเจ้าของชุด → ดึงข้อมูลพนักงานมาแสดง
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      document.getElementById("empId").value = data.employeeId || "-";
      document.getElementById("empName").value = data.employeeName || "-";
      document.getElementById("qty").value = data.qty || 1;
    } else {
      // ❌ ถ้าไม่พบเจ้าของ → ล้างค่า
      alert("⚠️ ไม่พบข้อมูลเจ้าของชุดนี้ในระบบ");
      document.getElementById("empId").value = "";
      document.getElementById("empName").value = "";
      document.getElementById("qty").value = 1;
    }
  } catch (err) {
    console.error("❌ Error fetching employee:", err);
    alert("❌ เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน");
  }
}


async function shiftWashDate(washId, dayOffset) {
  try {
    const washRef = doc(db, COLLECTIONS.WASHES, washId);
    const snap = await getDoc(washRef);
    if (!snap.exists()) {
      alert("❌ ไม่พบข้อมูล Wash");
      return;
    }

    const washData = snap.data();
    const currentStatus = washData.status || "Waiting to Send";
    const currentCreatedAt = new Date(washData.createdAt || new Date());
    const originalDate = new Date(currentCreatedAt); // 📌 วันที่ก่อนเลื่อน

    // 🧮 คำนวณวันใหม่ตาม offset (เช่น -1 หรือ +1)
    const newDate = new Date(currentCreatedAt);
    newDate.setDate(newDate.getDate() + dayOffset);
    const newDateISO = newDate.toISOString();
    const formattedNewDate = newDate.toLocaleDateString("th-TH");

    // ❓ แจ้งเตือนผู้ใช้ก่อนเลื่อนวัน
    const confirmChange = confirm(
      `คุณต้องการเลื่อนวันที่จาก ${originalDate.toLocaleDateString(
        "th-TH"
      )} ไปเป็น ${formattedNewDate} หรือไม่?\n(สถานะอาจเปลี่ยนหากปัจจุบันคือ 'Waiting to Send' หรือ 'Washing')`
    );
    if (!confirmChange) return;

    let statusToUpdate = currentStatus; // เริ่มต้นด้วยสถานะเดิม

    // 🔄 คำนวณสถานะใหม่จากเวลาเฉพาะสถานะที่ขึ้นกับเวลา
    const currentStatusLower = currentStatus.toLowerCase();
    const timeDependentStatuses = ["waiting to send", "washing"];

    if (timeDependentStatuses.includes(currentStatusLower)) {
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 🟢 เกิน 3 วัน → ถือว่า Completed
      if (diffDays >= 3) {
        statusToUpdate = "Completed";
      }
      // 🔵 เกิน 1 วัน → Washing
      else if (diffDays >= 1) {
        statusToUpdate = "Washing";
      }
      // 🟡 ภายในวันเดียวกัน → Waiting
      else {
        statusToUpdate = "Waiting to Send";
      }

      console.log(
        `Date shifted. Recalculated time-based status to: ${statusToUpdate}`
      );
    } else {
      console.log(
        `Date shifted. Status '${currentStatus}' is not time-dependent, keeping current status.`
      );
    }

    // ✏️ บันทึกวันที่ใหม่และสถานะใหม่เข้า Firebase
    await updateDoc(washRef, {
      createdAt: newDateISO,
      status: statusToUpdate,
    });

    // ✅ แจ้งผลผู้ใช้
    alert(
      `✅ วันที่ถูกเลื่อนเป็น ${formattedNewDate} ${
        statusToUpdate !== currentStatus
          ? `และสถานะอัปเดตเป็น '${statusToUpdate}'`
          : "(สถานะเดิม)"
      }`
    );

    await renderTable();
    await updateSummary();
  } catch (error) {
    console.error("❌ Error shifting wash date and updating status:", error);
    alert("❌ ไม่สามารถเลื่อนเวลาและอัปเดตสถานะได้: " + error.message);
  }
}

async function markReadyForTest(washId) {
  // 🔒 แจ้งยืนยันก่อนดำเนินการเปลี่ยนสถานะ
  const confirmed = confirm(
    `ต้องการยืนยันว่า Wash ID: ${washId} ซักเสร็จและพร้อมทดสอบ ESD หรือไม่?`
  );
  if (!confirmed) return; // ❌ ผู้ใช้กดยกเลิก

  try {
    const washDocRef = doc(db, COLLECTIONS.WASHES, washId);

    // ✅ อัปเดตสถานะให้เป็น "Ready for Test"
    await updateDoc(washDocRef, { status: "Ready for Test" });

    alert(`สถานะของ Wash ID: ${washId} ถูกอัปเดตเป็น 'Ready for Test' เรียบร้อยแล้ว`);
    await renderTable();     // 🔁 รีเฟรชตาราง
    await updateSummary();   // 🔁 รีเฟรชสรุป
  } catch (error) {
    console.error("❌ Error marking wash as Ready for Test:", error);
    alert("❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + error.message);
  }
}


async function returnToStockAfterESD(washId) {
  // 📌 1. ดึงข้อมูลการซักจาก washJobs
  const washRef = doc(db, COLLECTIONS.WASHES, washId);
  const washSnap = await getDoc(washRef);
  if (!washSnap.exists()) {
    alert(`❌ ไม่พบข้อมูลซักรหัส ${washId}`);
    return;
  }

  const washData = washSnap.data();
  const { uniformCode, color, qty } = washData;

  // 📌 2. ดึงข้อมูลยูนิฟอร์มที่ตรงกับรหัสและสี
  const uniformQuery = query(
    collection(db, COLLECTIONS.UNIFORMCODES),
    where("uniformCode", "==", uniformCode),
    where("color", "==", color)
  );
  const uniformSnap = await getDocs(uniformQuery);
  if (uniformSnap.empty) {
    alert(`❌ ไม่พบข้อมูลสต็อกยูนิฟอร์ม: ${uniformCode} (${color})`);
    return;
  }

  const uniformDoc = uniformSnap.docs[0];
  const uniformId = uniformDoc.id;

  // 📌 3. คืนของเข้า stock → เพิ่ม availableQty, ลด washingQty, ล้าง status
  await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, uniformId), {
    availableQty: increment(qty),
    washingQty: increment(-qty),
    "status.assign": deleteField(),
    "status.washing": deleteField(),
  });

  // 📌 4. ลบ job ซักออก
  await deleteDoc(washRef);

  // 📌 5. คำนวณ totalQty ใหม่หลังจากคืนของ
  await updateTotalQty(uniformCode, color);

  alert(`✅ คืนยูนิฟอร์มเข้าสต็อกแล้ว (${uniformCode} | ${color})`);
  await renderTable();
  await updateSummary();
}

async function markAsScrap(washId) {
  try {
    const washRef = doc(db, COLLECTIONS.WASHES, washId);
    const washSnap = await getDoc(washRef);
    if (!washSnap.exists()) {
      alert(`❌ ไม่พบข้อมูลซักรหัส ${washId}`);
      return;
    }

    const washData = washSnap.data();
    const { uniformCode, color } = washData;

    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );

    const uniformSnap = await getDocs(uniformQuery);
    if (uniformSnap.empty) {
      alert(`❌ ไม่พบข้อมูลยูนิฟอร์ม ${uniformCode} (${color})`);
      return;
    }

    const uniformDoc = uniformSnap.docs[0];
    const uniformId = uniformDoc.id;

    // ✅ อัปเดตสถานะเป็น scrap (แต่ **ไม่ลบ** employeeId / employeeName)
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, uniformId), {
      "status.assign": deleteField(),
      "status.washing": deleteField(),
      status: "scrap",
      usageStatus: "scrap"
    });

    // ✅ บันทึกลง washHistory ด้วยสถานะ Scrap
    const historyData = {
      ...washData,
      testResult: "Fail",
      testDate: new Date().toISOString(),
      status: "Scrap",
    };

    await setDoc(doc(db, "washHistory", washId), historyData);

    // ✅ ลบจาก washJobs
    await deleteDoc(washRef);

    alert(`⚠️ ยูนิฟอร์ม ${uniformCode} ถูก Scrap แล้ว`);
    await renderTable();
    await updateSummary();
    await renderHistory();
  } catch (error) {
    console.error("❌ markAsScrap Error:", error);
    alert("❌ ไม่สามารถ Scrap ยูนิฟอร์มได้");
  }
}

function showESDModal(id) {
  // ✅ สร้าง overlay modal สำหรับยืนยันผล ESD
  const modal = document.createElement("div");
  modal.className = "overlay";

  // ✅ HTML ของ modal พร้อมปุ่ม OK / NG
  modal.innerHTML = `
    <div class="confirm-box">
      <h3>ESD Result Confirmation</h3>
      <p>Did this uniform pass the ESD test?</p>
      <div>
        <button class="btn-yes" onclick="confirmESD('${id}', true, this)">OK</button>
        <button class="btn-no" onclick="confirmESD('${id}', false, this)">NG</button>
      </div>
    </div>
  `;

  // ✅ แสดง modal บนหน้า
  document.body.appendChild(modal);

  // ✅ ปิด modal ถ้าคลิกนอกกล่อง
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(e.target);
    }
  });
}

// ===========================================================
// 🧽 รีเซ็ตค่าฟอร์มใน Modal → ใช้ตอนเปิดฟอร์มใหม่หรือล้างข้อมูลเก่า
// ===========================================================
function clearForm() {
  // ล้างค่าทุกช่อง text ที่ใช้ในฟอร์ม
  ["empId", "empName", "uniformCode", "qty", "editIndex"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // ล้าง dropdown สี (reset เป็นค่าเริ่มต้น)
  const colorSelect = document.getElementById("color");
  if (colorSelect) {
    colorSelect.value = "";
    colorSelect.selectedIndex = 0;
  }
}

async function updateTotalQty(uniformCode, color) {
  try {
    // 🔍 ดึงชุดยูนิฟอร์มที่ตรงกับรหัสและสี
    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const uniformSnap = await getDocs(uniformQuery);

    if (uniformSnap.empty) {
      console.warn("⚠️ ไม่พบยูนิฟอร์ม:", uniformCode, color);
      return;
    }

    const docSnap = uniformSnap.docs[0];
    const docId = docSnap.id;
    const data = docSnap.data();

    // 📊 รวมค่าจากแต่ละหมวด: available + washing + scrap
    const available = data.availableQty || 0;
    const washing = data.washingQty || 0;
    const scrap = data.scrapQty || 0;

    const totalQty = available + washing + scrap;

    // ✅ อัปเดต totalQty
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, docId), {
      totalQty: totalQty
    });

    console.log(`🔄 ปรับ totalQty = ${totalQty} สำหรับ ${uniformCode} (${color})`);
  } catch (error) {
    console.error("❌ ไม่สามารถอัปเดต totalQty ได้:", error);
  }
}

function showNotificationModal(message) {
  const modal = document.createElement("div");
  modal.className = "overlay";
  modal.innerHTML = `
    <div class="confirm-box">
      <p>${message}</p>
      <div style="text-align: center; margin-top: 10px;">
        <button class="btn-yes">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector(".btn-yes").addEventListener("click", () => {
    modal.remove();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ดึง rewashCount จาก uniform ตาม code + color
async function getRewashCount(uniformCode, color) {
  const uniformQuery = query(
    collection(db, COLLECTIONS.UNIFORMCODES),
    where("uniformCode", "==", uniformCode),
    where("color", "==", color)
  );

  const snapshot = await getDocs(uniformQuery);
  if (snapshot.empty) return 0;

  const data = snapshot.docs[0].data();
  return data.rewashCount || 0;
}

// เซ็ตค่าใหม่ให้ rewashCount
async function setRewashCount(uniformCode, color, count) {
  const uniformQuery = query(
    collection(db, COLLECTIONS.UNIFORMCODES),
    where("uniformCode", "==", uniformCode),
    where("color", "==", color)
  );

  const snapshot = await getDocs(uniformQuery);
  if (!snapshot.empty) {
    const docId = snapshot.docs[0].id;
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, docId), {
      rewashCount: count
    });
  }
}

async function increaseRewashCount(uniformCode, color) {
  try {
    const q = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const snap = await getDocs(q);

    // ⚠️ ถ้าไม่มี document → สร้างใหม่
    if (snap.empty) {
      const docId = `${uniformCode}-${color}-${Date.now()}`;
      await setDoc(doc(db, COLLECTIONS.UNIFORMCODES, docId), {
        uniformCode,
        color,
        rewashCount: 1,
      });
      console.warn("⚠️ Document not found, created new with rewashCount = 1");
      return;
    }

    // ✅ ถ้ามี → update เพิ่ม 1
    const docId = snap.docs[0].id;
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, docId), {
      rewashCount: increment(1),
    });

    console.log(`🔁 เพิ่ม rewashCount ให้ ${uniformCode} (${color})`);
  } catch (error) {
    console.error("❌ increaseRewashCount error:", error.message);
  }
}


async function returnUniform(washId) {
  try {
    const washRef = doc(db, COLLECTIONS.WASHES, washId);
    const washSnap = await getDoc(washRef);

    if (!washSnap.exists()) {
      alert(`❌ ไม่พบข้อมูลการซักรหัส ${washId}`);
      return;
    }

    const washData = washSnap.data();
    const { uniformCode, color } = washData;

    // 🔍 ค้นหา Uniform ใน InventoryDB
    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const uniformSnap = await getDocs(uniformQuery);

    if (uniformSnap.empty) {
      alert(`❌ ไม่พบข้อมูลยูนิฟอร์ม: ${uniformCode} (${color})`);
      return;
    }

    const uniformDoc = uniformSnap.docs[0];
    const uniformId = uniformDoc.id;

    // ✅ คืนค่ากลับไปยัง InventoryDB → ผูกกลับกับพนักงานเดิม
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, uniformId), {
      employeeId: washData.previousOwner?.employeeId || null,
      employeeName: washData.previousOwner?.employeeName || null,
      status: "in-use",
      washStatus: null
      // ❌ ไม่เพิ่ม qty
    });

    // 🧹 ลบงานซักออก (เพราะคืนแล้ว)
    await deleteDoc(washRef);

    alert(`✅ ส่งคืนยูนิฟอร์ม ${uniformCode} (${color}) เรียบร้อยแล้ว`);
    await renderTable();
    await updateSummary();
  } catch (error) {
    console.error("❌ returnUniform error:", error);
    alert("❌ ไม่สามารถส่งคืนยูนิฟอร์มได้");
  }
}

async function fullyReturnToOwner(washId) {
  try {
    const washRef = doc(db, COLLECTIONS.WASHES, washId);
    const washSnap = await getDoc(washRef);
    if (!washSnap.exists()) {
      alert("❌ ไม่พบรายการซักนี้");
      return;
    }

    const washData = washSnap.data();
    const { uniformCode, color, empId, empName, qty } = washData;

    // 🔍 ดึงข้อมูลจาก UniformCode
    const uniformQuery = query(
      collection(db, COLLECTIONS.UNIFORMCODES),
      where("uniformCode", "==", uniformCode),
      where("color", "==", color)
    );
    const uniformSnap = await getDocs(uniformQuery);

    if (uniformSnap.empty) {
      alert("❌ ไม่พบข้อมูล UniformCode ที่ต้องการคืน");
      return;
    }

    const uniformDoc = uniformSnap.docs[0];
    const uniformId = uniformDoc.id;

    // ✅ คืนค่ากลับให้เจ้าของ
    await updateDoc(doc(db, COLLECTIONS.UNIFORMCODES, uniformId), {
      qty: increment(qty),              // ✅ คืนจำนวน
      employeeId: empId,                // ✅ คืนเจ้าของ
      employeeName: empName,
      status: "in-use",                 // ✅ กลับไปใช้งาน
      washStatus: null                  // ✅ ล้างสถานะซัก
    });

    // ✅ ย้ายเข้าประวัติ
    await addDoc(collection(db, COLLECTIONS.WASHHISTORY), {
      ...washData,
      returnedAt: new Date().toISOString(),
      action: "returned"
    });

    // ✅ ลบจากงานซักปัจจุบัน
    await deleteDoc(washRef);

    await renderTable();
    await renderHistory();
    await updateSummary();

    alert("✅ คืนชุดให้เจ้าของเรียบร้อยแล้ว");
  } catch (error) {
    console.error("❌ fullyReturnToOwner error:", error);
    alert("❌ เกิดข้อผิดพลาดในการคืนชุด");
  }
}

async function confirmESDResult(washId, result) {
  if (result === "pass") {
    // ✅ ผ่าน ESD → คืนอัตโนมัติ
    await fullyReturnToOwner(washId);
  } else {
    // ❌ ไม่ผ่าน → เรียก rewash logic
    await handleRewashLogic(washId);
  }
}


// ทำให้เรียกจาก HTML ได้
window.markReadyForTest = markReadyForTest;
window.openForm = openForm;
window.showDeleteModal = showDeleteModal;
window.confirmDelete = confirmDelete;
window.showESDModal = showESDModal;
window.confirmESD = confirmESD;
window.saveWash = saveWash;
window.exportHistoryToCSV = exportHistoryToCSV;
window.toggleModal = toggleModal;
window.shiftWashDate = shiftWashDate;
window.loadColorsForUniform = loadColorsForUniform;
window.fetchEmployeeByColor = fetchEmployeeByColor;
window.updateTotalQty = updateTotalQty;
window.showNotificationModal = showNotificationModal;
window.increaseRewashCount = increaseRewashCount;
