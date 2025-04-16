import {
    getAllInventory,
    getInventoryByUniformId,
    addInventoryCode,
    updateInventoryStatus,
    deleteInventoryCode,
  } from "../models/InventoryModel.js";
  import { getUniformById, updateUniformQty } from "../models/UniformModel.js";
  import { getEmployeeById } from "../models/EmployeeModel.js";
  import { showAlert } from "../utils/alerts.js";
  
  // ✅ ดึงข้อมูลทั้งหมดมาแสดงผลเป็นการ์ด
  export async function renderInventoryCards(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
  
    const codes = await getAllInventory();
    const uniforms = await getUniformById();
  
    uniforms.forEach((u) => {
      const related = codes.filter((c) => c.uniformId === u.uniformId);
      const used = related.filter((c) => c.status !== "available").length;
      const available = related.length - used;
  
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
    });
  }
  
  // ✅ เพิ่มโค้ดใหม่
  export async function handleAddInventoryCode(uniformId, code) {
    if (!code || !uniformId) return showAlert("⚠️ กรุณากรอกข้อมูลให้ครบ", "warning");
  
    const uniform = await getUniformById(uniformId);
    const color = uniform?.color || "Unknown";
  
    await addInventoryCode({ code, uniformId, color });
    await updateUniformQty(uniformId); // sync qty
    showAlert("✅ เพิ่มโค้ดสำเร็จ", "success");
  }
  
  // ✅ มอบชุดให้พนักงาน
  export async function assignInventoryCode(code, uniformId, employeeId) {
    const employee = await getEmployeeById(employeeId);
    if (!employee) return showAlert("❌ ไม่พบพนักงาน", "error");
  
    await updateInventoryStatus(code, {
      status: "in-use",
      employeeId,
      employeeName: employee.employeeName,
      assignedAt: new Date().toISOString(),
    });
  
    await updateUniformQty(uniformId);
    showAlert("✅ มอบชุดสำเร็จ", "success");
  }
  
  // ✅ คืนชุด
  export async function returnInventoryCode(docId, uniformId) {
    await updateInventoryStatus(docId, {
      status: "available",
      employeeId: null,
      employeeName: null,
    });
  
    await updateUniformQty(uniformId);
    showAlert("🔄 คืนชุดเรียบร้อย", "info");
  }
  
  // ✅ ลบชุด
  export async function deleteInventory(docId, uniformId) {
    await deleteInventoryCode(docId);
    await updateUniformQty(uniformId);
    showAlert("🗑️ ลบชุดเรียบร้อย", "warning");
  }
  