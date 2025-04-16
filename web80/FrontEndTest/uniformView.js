import { UniformModel } from './uniformModel.js';

const DEFAULT_IMG = 'https://cdn-icons-png.flaticon.com/512/892/892692.png';

export const UniformView = {
  currentPage: 1,
  rowsPerPage: 5,

  renderTable(uniforms) {
    const tbody = document.getElementById("uniformTableBody");
    const loading = document.getElementById("loadingOverlay");
    const tableWrapper = document.querySelector(".table-wrapper");
    tbody.innerHTML = "";
    loading?.classList.add("hidden");
    tableWrapper?.classList.remove("hidden");

    if (!uniforms || uniforms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">🚫 No data found</td></tr>`;
      this.renderPagination(0);
      return;
    }

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const paginated = uniforms.slice(start, start + this.rowsPerPage);

    paginated.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.uniformID}</td>
        <td>${u.uniformType}</td>
        <td>${u.uniformSize}</td>
        <td>${u.uniformColor}</td>
        <td>${u.uniformQty}</td>
        <td><img src="${u.img || DEFAULT_IMG}" width="40" height="40" style="object-fit:cover;border-radius:8px;border:1px solid #ccc;" /></td>
        <td>
          <button class="btn action-btn edit" data-id="${u.uniformID}" style="background:orange;color:#fff"><i class="fas fa-edit"></i></button>
          <button class="btn action-btn delete" data-id="${u.uniformID}" style="background:red;color:#fff"><i class="fas fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".action-btn.edit").forEach((btn) => {
      btn.addEventListener("click", () => window.handleEditUniform?.(btn.dataset.id));
    });

    document.querySelectorAll(".action-btn.delete").forEach((btn) => {
      btn.addEventListener("click", () => window.promptDeleteUniform?.(btn.dataset.id));
    });

    this.renderPagination(uniforms.length);
  },

  renderPagination(totalItems) {
    const container = document.getElementById("pagination");
    if (!container) return;
    container.innerHTML = "";
    const totalPages = Math.ceil(totalItems / this.rowsPerPage);
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.classList.add("pagination-btn");
      if (i === this.currentPage) btn.classList.add("active");
      btn.onclick = () => {
        this.currentPage = i;
        window.reloadUniformTable?.();
      };
      container.appendChild(btn);
    }
  },

  resetForm() {
    ["uniformID", "uniformType", "uniformSize", "uniformColor", "uniformQty", "uniformPhoto"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const idField = document.getElementById("uniformID");
    if (idField) idField.disabled = false;
    const preview = document.getElementById("previewPhoto");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
  },

  toggleModal(id, show = true) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.toggle("hidden", !show);
  },

  showPreviewImage(file) {
    const preview = document.getElementById("previewPhoto");
    if (!file || !preview) return;
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  setModalTitle(title = "Add Uniform", icon = "fas fa-plus") {
    const titleEl = document.querySelector("#uniformModal h3");
    if (titleEl) titleEl.innerHTML = `<i class="${icon}"></i> ${title}`;
  },

  setFormLoading(isLoading = false) {
    const saveBtn = document.querySelector(".btn-save");
    if (!saveBtn) return;
    saveBtn.disabled = isLoading;
    saveBtn.innerHTML = isLoading
      ? '<i class="fas fa-spinner fa-spin"></i> Saving...'
      : '<i class="fas fa-save"></i> Save';
  },

  initDropzone() {
    const dropZone = document.getElementById("dropZone");
    const inputFile = document.getElementById("uniformPhoto");
    const previewImg = document.getElementById("previewPhoto");

    if (!dropZone || !inputFile || !previewImg) return;

    dropZone.addEventListener("click", () => inputFile.click());
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        inputFile.files = e.dataTransfer.files;
        this.showPreviewImage(file);
      }
    });
    inputFile.addEventListener("change", () => {
      const file = inputFile.files[0];
      this.showPreviewImage(file);
    });
  },
};

window.reloadUniformTable = async () => {
  UniformView.setFormLoading(true);
  const uniforms = await UniformModel.fetchAllUniforms();
  UniformView.renderTable(uniforms);
  UniformView.setFormLoading(false);
};
