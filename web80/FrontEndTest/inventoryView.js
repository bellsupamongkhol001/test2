import { InventoryModel } from "./inventoryModel.js";

export const InventoryView = {
  currentPage: 1,
  rowsPerPage: 6,

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
          ${
            showImage
              ? `<img src="${uniform.img}" width="80" style="border-radius:8px;margin-bottom:8px;border:1px solid #ccc;" />`
              : `<div style="width:80px;height:80px;background:#eee;border-radius:8px;
                        display:flex;align-items:center;justify-content:center;
                        color:#888;font-size:0.8rem;margin-bottom:8px;border:1px solid #ccc;">
                  No Picture
                 </div>`
          }
          ${uniform.uniformName ? `<p><strong>Name:</strong> ${uniform.uniformName}</p>` : ""}
          <p><strong>Type:</strong> ${uniform.uniformType}</p>
          <p><strong>Size:</strong> ${uniform.uniformSize}</p>
          <p><strong>Color:</strong> ${uniform.uniformColor}</p>
          <p><strong>Total Codes:</strong> ${codeCount}</p>
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

    inventoryList.forEach(item => {
      const card = document.createElement("div");
      card.className = "inventory-card";
      card.innerHTML = `
        <div class="card-header">
          <strong contenteditable="true" onblur="updateCodeInline(this, '${item.UniformCode}')">${item.UniformCode}</strong>
          <span class="badge ${item.Status}">${item.Status.toUpperCase()}</span>
        </div>
        <div class="card-body">
          ${item.UniformName ? `<p><strong>Name:</strong> ${item.UniformName}</p>` : ""}
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
            ? `<button class="btn btn-primary" onclick="openAssignFromCode('${item.UniformCode}')">Assign</button>`
            : `<button class="btn btn-warning" onclick="returnUniformByCode('${item.UniformCode}')">Return</button>`}
          <button class="btn btn-danger" onclick="confirmDeleteUniform('${item.UniformCode}')">Delete</button>
        </div>
      `;
      container.appendChild(card);
    });

    const summary = await InventoryModel.getInventorySummary();
    this.updateDashboard(summary);
  },

  fillDetailModal(items = []) {
    const tbody = document.getElementById("codeListBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(items)) items = [items];

    items.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.UniformCode}</td>
        <td>${item.EmployeeID || "-"}</td>
        <td>${item.EmployeeName || "-"}</td>
        <td>${item.EmployeDepartment || "-"}</td>
        <td>${item.Status}</td>
        <td>
          ${item.Status === "available"
            ? `<button class="btn btn-primary" onclick="openAssignFromCode('${item.UniformCode}')">Assign</button>`
            : `<button class="btn btn-warning" onclick="returnUniformByCode('${item.UniformCode}')">Return</button>`}
          <button class="btn btn-danger" onclick="confirmDeleteUniform('${item.UniformCode}')">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

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
    const label = document.getElementById("assignUniformInfo");

    if (empIdInput) empIdInput.value = "";
    if (empNameInput) empNameInput.value = "";
    if (uniformCodeInput) uniformCodeInput.value = "";
    if (label) {
      label.textContent = `${uniform.uniformType} / ${uniform.uniformSize} / ${uniform.uniformColor}`;
    }
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
  const uniforms = await InventoryModel.fetchUniforms();
  InventoryView.renderUniformBaseCards(uniforms);
  const inventory = await InventoryModel.fetchInventoryItems();
  InventoryView.renderInventoryCards(inventory);
};
