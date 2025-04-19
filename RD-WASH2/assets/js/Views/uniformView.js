import { UniformModel } from "../Models/uniformModel.js";

// ============================ 🧥 UNIFORM VIEW ============================
// 👉 จัดการ UI สำหรับหน้า Uniform Management (Render Table, Modal, Pagination, Dropzone ฯลฯ)

const DEFAULT_IMG = "https://cdn-icons-png.flaticon.com/512/892/892458.png";

export const UniformView = {
  // ============================ 🔢 STATE ============================
  currentPage: 1,
  rowsPerPage: 10,

  // ============================ 📋 RENDER TABLE ============================
  renderTable(uniforms) {
    const tbody = document.getElementById("uniformTableBody");
    const loading = document.getElementById("loadingOverlay");
    const tableWrapper = document.querySelector(".table-wrapper");

    // 🔄 เคลียร์ข้อมูลเดิม
    tbody.innerHTML = "";
    loading?.classList.add("hidden");
    tableWrapper?.classList.remove("hidden");

    // ❌ กรณีไม่มีข้อมูล
    if (!uniforms || uniforms.length === 0) {
      tbody.innerHTML = `<tr>
      <td colspan="7" style="text-align:center;padding:20px;color:#888;">
        🚫 No data found
      </td>
    </tr>`;
      this.renderPagination(0);
      return;
    }

    // 📊 แสดงเฉพาะข้อมูลในหน้าปัจจุบัน
    const start = (this.currentPage - 1) * this.rowsPerPage;
    const paginated = uniforms.slice(start, start + this.rowsPerPage);

    // 🖼️ Default รูปภาพ
    const DEFAULT_IMG = "https://cdn-icons-png.flaticon.com/512/892/892458.png";

    // 🧾 วนแสดงข้อมูลทีละรายการ
    paginated.forEach((u) => {
      const img =
        u.img?.startsWith("data:image") || u.img?.startsWith("http")
          ? u.img
          : DEFAULT_IMG;

      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>${u.uniformID}</td>
      <td>${u.uniformType}</td>
      <td>${u.uniformSize}</td>
      <td>${u.uniformColor}</td>
      <td>${u.uniformQty}</td>
      <td>
        <img src="${img}" width="40" height="40" style="object-fit:cover;border-radius:8px;border:1px solid #ccc;" />
      </td>
      <td>
        <button class="btn action-btn edit" data-id="${u.uniformID}" style="background:orange;color:#fff">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn action-btn delete" data-id="${u.uniformID}" style="background:red;color:#fff">
          <i class="fas fa-trash"></i>
        </button>
      </td>`;
      tbody.appendChild(tr);
    });

    // ✏️ เพิ่ม event ให้ปุ่ม Edit
    document.querySelectorAll(".action-btn.edit").forEach((btn) => {
      btn.addEventListener("click", () =>
        window.handleEditUniform?.(btn.dataset.id)
      );
    });

    // 🗑️ เพิ่ม event ให้ปุ่ม Delete
    document.querySelectorAll(".action-btn.delete").forEach((btn) => {
      btn.addEventListener("click", () =>
        window.promptDeleteUniform?.(btn.dataset.id)
      );
    });

    // 🔢 สร้าง Pagination
    this.renderPagination(uniforms.length);
  },

  // ============================ 🔢 RENDER PAGINATION ============================
  renderPagination(totalItems) {
    const container = document.getElementById("pagination");
    if (!container) return;

    // ♻️ เคลียร์ปุ่มเดิม
    container.innerHTML = "";

    // 📦 คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(totalItems / this.rowsPerPage);
    if (totalPages <= 1) return;

    // 🔁 สร้างปุ่ม pagination ตามจำนวนหน้า
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.classList.add("pagination-btn");

      // ⭐ ไฮไลต์ปุ่มหน้าปัจจุบัน
      if (i === this.currentPage) {
        btn.classList.add("active");
      }

      // 🖱️ เปลี่ยนหน้าปัจจุบันเมื่อคลิก
      btn.onclick = () => {
        this.currentPage = i;
        window.reloadUniformTable?.();
      };

      container.appendChild(btn);
    }
  },

  // ============================ 🧹 RESET FORM ============================
  resetForm() {
    // 🔄 เคลียร์ค่าฟอร์มในแต่ละ input field
    const fields = [
      "uniformID",
      "uniformType",
      "uniformSize",
      "uniformColor",
      "uniformQty",
      "uniformPhoto",
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // ✅ เปิดใช้งานช่องกรอก UniformID ใหม่อีกครั้ง
    const idField = document.getElementById("uniformID");
    if (idField) idField.disabled = false;

    // 🧼 ล้างรูปภาพตัวอย่าง
    const preview = document.getElementById("previewPhoto");
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
  },

  // ============================ 🚪 TOGGLE MODAL ============================
  /**
   * แสดงหรือซ่อน Modal ตาม ID ที่ระบุ
   * @param {string} id - ID ของ modal ที่ต้องการแสดง/ซ่อน
   * @param {boolean} show - ถ้า true จะแสดง modal, ถ้า false จะซ่อน
   */
  toggleModal(id, show = true) {
    const modal = document.getElementById(id);
    if (!modal) {
      console.warn(`⚠️ toggleModal: ไม่พบ modal ที่มี id = "${id}"`);
      return;
    }

    modal.classList.toggle("hidden", !show);
  },

  // ============================ 🖼️ SHOW PREVIEW IMAGE ============================
  /**
   * แสดงรูปภาพพรีวิวจากไฟล์ที่ผู้ใช้เลือก (Base64)
   * @param {File} file - ไฟล์รูปภาพที่เลือก
   */
  showPreviewImage(file) {
    const preview = document.getElementById("previewPhoto");

    // 🔍 ถ้าไม่มีรูปหรือ DOM ไม่เจอ ให้ return ทันที
    if (!file || !preview) return;

    // 🧪 แปลงรูปเป็น Base64 แล้วแสดงใน <img>
    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  // ============================ 🏷️ SET MODAL TITLE ============================
  /**
   * ตั้งค่าหัวข้อ Modal (พร้อมไอคอน)
   * @param {string} title - ข้อความหัวข้อ Modal
   * @param {string} icon - ชื่อคลาสไอคอน FontAwesome
   */
  setModalTitle(title = "Add Uniform", icon = "fas fa-plus") {
    const titleEl = document.querySelector("#uniformModal h3");

    // 🎯 ถ้าเจอหัวข้อ modal → แสดง icon + title
    if (titleEl) {
      titleEl.innerHTML = `<i class="${icon}"></i> ${title}`;
    }
  },

  // ============================ ⏳ FORM LOADING ============================
  /**
   * แสดงสถานะกำลังบันทึกบนปุ่ม Save
   * @param {boolean} isLoading - true = กำลังโหลด / false = โหลดเสร็จ
   */
  setFormLoading(isLoading = false) {
    const saveBtn = document.querySelector(".btn-save");

    // ❌ ถ้าไม่เจอปุ่ม ไม่ต้องทำอะไร
    if (!saveBtn) return;

    // 🔁 ปิดปุ่ม + เปลี่ยนข้อความระหว่างโหลด
    saveBtn.disabled = isLoading;
    saveBtn.innerHTML = isLoading
      ? '<i class="fas fa-spinner fa-spin"></i> Saving...'
      : '<i class="fas fa-save"></i> Save';
  },

  // ============================ 🖼️ DROPZONE INIT ============================
  /**
   * ตั้งค่า Dropzone สำหรับอัปโหลดรูปยูนิฟอร์ม
   * - รองรับทั้ง Click, Drag & Drop
   * - แสดง Preview ทันทีเมื่อเลือกรูป
   */
  initDropzone() {
    const dropZone = document.getElementById("dropZone");
    const inputFile = document.getElementById("uniformPhoto");
    const previewImg = document.getElementById("previewPhoto");

    // 🚫 ถ้าไม่มี DOM ครบ ไม่ต้องทำงาน
    if (!dropZone || !inputFile || !previewImg) return;

    // 🖱️ คลิก DropZone เพื่อเปิด File Picker
    dropZone.addEventListener("click", () => inputFile.click());

    // 🖐️ ลากไฟล์เข้ามา = Highlight
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    });

    // ❌ ลากออก = เอา highlight ออก
    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("dragover");
    });

    // 📂 วางไฟล์ = แสดง Preview
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        inputFile.files = e.dataTransfer.files; // 🗂️ ตั้งค่าให้เหมือนเลือกเอง
        this.showPreviewImage(file);
      }
    });

    // 📸 เมื่อเลือกรูปผ่าน File Picker
    inputFile.addEventListener("change", () => {
      const file = inputFile.files[0];
      this.showPreviewImage(file);
    });

    // ============================ 🔁 RELOAD UNIFORM TABLE ============================
    /**
     * โหลดข้อมูลยูนิฟอร์มทั้งหมดใหม่ และแสดงผลบนตาราง
     * - ใช้แสดงผลหลัง Import, Save, หรือ Delete
     */
    window.reloadUniformTable = async () => {
      try {
        UniformView.setFormLoading(true); // ⏳ แสดงสถานะกำลังโหลดปุ่ม Save
        const uniforms = await UniformModel.fetchAllUniforms(); // 📥 ดึงข้อมูลทั้งหมด
        UniformView.renderTable(uniforms); // 🧾 แสดงผลบนตาราง
      } catch (err) {
        console.error("❌ reloadUniformTable error:", err);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: err.message || "ไม่สามารถโหลดข้อมูลยูนิฟอร์มได้",
        });
      } finally {
        UniformView.setFormLoading(false); // ✅ ปิดสถานะโหลด
      }
    };
  },
};
