import { InventoryModel } from "../Models/inventoryModel.js";

export const InventoryView = {
  currentPage: 1,
  rowsPerPage: 6,

  async refreshAll() {
    const uniforms = await InventoryModel.fetchUniforms();
    const inventory = await InventoryModel.fetchInventoryItems();
    await this.renderUniformBaseCards(uniforms);
    await this.renderInventoryCards(inventory);
  },

  async reloadDetailModal(uniformId) {
    const items = await InventoryModel.getAllCodesByUniformID(uniformId);
    const tbody = document.getElementById("codeListBody");
  
    if (tbody) {
      tbody.innerHTML = "";

      if (items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; color: #999;">🚫 ไม่มีข้อมูล Uniform Code</td>
          </tr>`;
        return;
      }
    }

    this.fillDetailModal(items);

    const first = items[0] || {};
    const uId = document.getElementById("detailUniformId");
    const uType = document.getElementById("detailUniformType");
    const uSize = document.getElementById("detailUniformSize");
    const uColor = document.getElementById("detailUniformColor");

    if (uId) uId.textContent = first.UniformID || "-";
    if (uType) uType.textContent = first.UniformType || "-";
    if (uSize) uSize.textContent = first.UniformSize || "-";
    if (uColor) uColor.textContent = first.UniformColor || "-";
  },

  async renderUniformBaseCards(uniforms = []) {
    const container = document.getElementById("uniformBaseList");
    if (!container) return;
    container.innerHTML = "";

    if (!uniforms || uniforms.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:#888;">🚫 No uniform data found</p>`;
      return;
    }

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const paginated = uniforms.slice(start, start + this.rowsPerPage);

    for (const uniform of paginated) {
      const codeCount = await InventoryModel.getUniformCodeCountById(uniform.uniformID);
      const showImage = uniform.img && uniform.img.startsWith("data:image");

      const card = document.createElement("div");
      card.className = "inventory-card";

      card.innerHTML = `
        <div class="card-header"><strong>${uniform.uniformID}</strong></div>
        <div class="card-body">
          ${showImage
            ? `<img src="${uniform.img}" alt="Uniform" />`
            : `<div class="uniform-placeholder">No Picture</div>`}
          <div class="card-details-grid">
            <p><strong>Type:</strong> ${uniform.uniformType}</p>
            <p><strong>Size:</strong> ${uniform.uniformSize}</p>
            <p><strong>Color:</strong> ${uniform.uniformColor}</p>
            <p><strong>Qty:</strong> ${codeCount}</p>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary btn-add-code" data-id="${uniform.uniformID}">➕ Add Code</button>
          <button class="btn btn-secondary btn-detail" data-id="${uniform.uniformID}">📄 Detail</button>
        </div>
        `;
      container.appendChild(card);
    }

    this.renderPagination(uniforms.length);

    container.querySelectorAll(".btn-add-code").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        window.dispatchEvent(new CustomEvent("addCodeClick", { detail: { id } }));
      });
    });

    container.querySelectorAll(".btn-detail").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        window.dispatchEvent(new CustomEvent("detailClick", { detail: { id } }));
      });
    });
  },

  async renderInventoryCards(inventoryList = []) {
    const container = document.getElementById("inventoryList");
    if (!container) return;
    container.innerHTML = "";

    if (!inventoryList || inventoryList.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:#888;">🚫 No inventory data</p>`;
      return;
    }

    for (const item of inventoryList) {
      const card = document.createElement("div");
      card.className = "inventory-card";

      card.innerHTML = `
        <div class="card-header">
          <strong contenteditable="true" onblur="updateCodeInline(this, '${item.UniformCode}')">${item.UniformCode}</strong>
          <span class="badge ${item.Status}">${item.Status.toUpperCase()}</span>
        </div>
        <div class="card-body">
          <p><strong>Type:</strong> ${item.UniformType}</p>
          <p><strong>Size:</strong> ${item.UniformSize}</p>
          <p><strong>Color:</strong> ${item.UniformColor}</p>
          <p><strong>Employee:</strong> 
            <span contenteditable="true" onblur="updateEmployeeInline(this, '${item.UniformCode}')">
              ${item.EmployeeName || '-'}
            </span>
          </p>
        </div>
        <div class="card-footer">
          ${item.Status === "available"
            ? `<button class="btn btn-primary btn-assign">Assign</button>`
            : `<button class="btn btn-warning btn-return">Return</button>`}
          <button class="btn btn-danger btn-delete">Delete</button>
        </div>
      `;
      container.appendChild(card);

      const assignBtn = card.querySelector(".btn-assign");
      const returnBtn = card.querySelector(".btn-return");
      const deleteBtn = card.querySelector(".btn-delete");

      if (assignBtn) {
        assignBtn.addEventListener("click", () => {
          window.openAssignFromCode(item.UniformCode);
        });
      }

      if (returnBtn) {
        returnBtn.addEventListener("click", () => {
          window.returnUniformByCode(item.UniformCode);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          console.log("🧨 Delete clicked (inventory card):", item.UniformCode);
          window.confirmDeleteUniform(item.UniformCode);
        });
      }
    }

    const summary = await InventoryModel.getInventorySummary();
    this.updateDashboard(summary);
  },

  fillDetailModal(items = []) {
    const tbody = document.getElementById("codeListBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(items)) items = [items];

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; color: #999;">🚫 ไม่มีข้อมูล Uniform Code</td>
        </tr>`;
      return;
    }

    for (const item of items) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.UniformCode}</td>
        <td>${item.EmployeeID || "-"}</td>
        <td>${item.EmployeeName || "-"}</td>
        <td>${item.EmployeDepartment || "-"}</td>
        <td>${item.Status}</td>
        <td>
          ${item.Status === "available"
            ? `<button class="btn btn-primary btn-assign">Assign</button>`
            : `<button class="btn btn-warning btn-return">Return</button>`}
          <button class="btn btn-danger btn-delete">Delete</button>
        </td>
      `;
      tbody.appendChild(row);

      const assignBtn = row.querySelector(".btn-assign");
      const returnBtn = row.querySelector(".btn-return");
      const deleteBtn = row.querySelector(".btn-delete");

      if (assignBtn) {
        assignBtn.addEventListener("click", () => {
          window.openAssignFromCode(item.UniformCode);
        });
      }

      if (returnBtn) {
        returnBtn.addEventListener("click", () => {
          window.returnUniformByCode(item.UniformCode);
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          console.log("🧨 Delete clicked (modal row):", item.UniformCode);
          window.confirmDeleteUniform(item.UniformCode);
        });
      }
    }
  },

  renderPagination(totalItems) {
    const container = document.getElementById("pagination");
    if (!container) return;
    container.innerHTML = "";

    const totalPages = Math.ceil(totalItems / this.rowsPerPage);
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = "pagination-btn";
      if (i === this.currentPage) btn.classList.add("active");
      btn.addEventListener("click", () => {
        this.currentPage = i;
        window.reloadUniformCards?.();
      });
      container.appendChild(btn);
    }
  },

  updateDashboard({ total, assigned, available }) {
    const totalEl = document.getElementById("totalCount");
    const assignedEl = document.getElementById("assignedCount");
    const availableEl = document.getElementById("availableCount");
    if (totalEl) totalEl.textContent = total;
    if (assignedEl) assignedEl.textContent = assigned;
    if (availableEl) availableEl.textContent = available;
  },

  toggleModal(id, show = true) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.toggle("hidden", !show);
  },

  prepareAssignForm(uniform) {
    const empIdInput = document.getElementById("assignEmployeeId");
    const empNameInput = document.getElementById("assignEmployeeName");
    const uniformCodeInput = document.getElementById("assignUniformCode");

    if (empIdInput) empIdInput.value = "";
    if (empNameInput) empNameInput.value = "";
    if (uniformCodeInput) uniformCodeInput.value = "";

  },

  previewImportData(data = [], onConfirm = () => {}) {
    const rows = data.map(d => `
      <tr>
        <td>${d.UniformCode}</td>
        <td>${d.EmployeeID}</td>
        <td>${d.EmployeeName}</td>
        <td>${d.UniformType}</td>
        <td>${d.UniformSize}</td>
        <td>${d.UniformColor}</td>
        <td>${d.Status}</td>
      </tr>`).join("");

    Swal.fire({
      title: "📥 Preview Import",
      html: `
        <div class="preview-scroll">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Code</th><th>ID</th><th>Name</th><th>Type</th><th>Size</th><th>Color</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "✅ Import",
      cancelButtonText: "❌ Cancel"
    }).then(result => {
      if (result.isConfirmed) onConfirm();
    });
  }
};

window.reloadUniformCards = async () => {
  await InventoryView.refreshAll();
};