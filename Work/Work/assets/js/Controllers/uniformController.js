import { UniformModel } from '../Models/uniformModel.js';
import { UniformView } from '../Views/uniformView.js';

const DEFAULT_IMG = "https://cdn-icons-png.flaticon.com/512/892/892458.png";
let selectedUniformId = null;

export async function initUniformPage() {
  try {
    UniformView.showLoading(true);
    setupEvents();
    const uniforms = await UniformModel.fetchAllUniforms();
    UniformView.renderTable(uniforms);
  } catch (err) {
    console.error("❌ UniformPage Error:", error);
    Swal.fire({
      icon: "error",
      title: "❌ โหลดข้อมูลล้มเหลว",
      text: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล",
    });
  } finally {
    UniformView.hideLoading(false);
  }
}

async function reloadTable() {
  try {
    const uniforms = await UniformModel.fetchAllUniforms();
    UniformView.renderTable(uniforms);
  } catch (err) {
    console.error("❌ reloadTable error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถโหลดข้อมูลชุดได้",
    });
  }
}
window.reloadUniformTable = reloadTable;

function setupEvents() {
  document.querySelector('.btn-add')?.addEventListener('click', async () => {
    try {
      selectedUniformId = null;
      UniformView.resetForm();
      UniformView.setModalTitle('Add Uniform', 'fas fa-plus');
      UniformView.toggleModal('uniformModal', true);
      UniformView.initDropzone();
  
      const uniforms = await UniformModel.fetchAllUniforms();
      const newID = generateUniformID(uniforms);
  
      const idInput = document.getElementById("uniformID");
      if (idInput) {
        idInput.value = newID;
        idInput.disabled = true;
      }
    } catch (err) {
      console.error("❌ Error on Add Uniform:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถเปิดฟอร์มเพิ่มยูนิฟอร์มได้",
        customClass: {
          popup: "swal-on-top"
        }
      });
    }
  });

  document.querySelector('#cancelBtn')?.addEventListener('click', () => {
    try {
      UniformView.toggleModal('uniformModal', false);
    } catch (err) {
      console.error("❌ ปิด Modal ไม่สำเร็จ:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถปิดหน้าต่างได้",
      });
    }
  });

  document.querySelector("#searchUniform")?.addEventListener("input", async (e) => {
    try {
      const keyword = e.target.value.toLowerCase().trim();
      const uniforms = await UniformModel.fetchAllUniforms();
  
      const filtered = !keyword
        ? uniforms
        : uniforms.filter(
            (u) =>
              u.uniformID?.toLowerCase().includes(keyword) ||
              u.uniformType?.toLowerCase().includes(keyword) ||
              u.uniformSize?.toLowerCase().includes(keyword) ||
              u.uniformColor?.toLowerCase().includes(keyword)
          );
  
      UniformView.renderTable(filtered);
    } catch (err) {
      console.error("❌ Search Uniform Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการค้นหา",
        text: err.message || "ไม่สามารถค้นหายูนิฟอร์มได้",
      });
    }
  });
  
  document.querySelector('.btn-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
  
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      try {
        const text = await file.text();
        const records = UniformModel.parseCSV(text);
  
        const previewHtml = records.map((r) =>
          `<tr>
            <td>${r.uniformID}</td>
            <td>${r.uniformType}</td>
            <td>${r.uniformSize}</td>
            <td>${r.uniformColor}</td>
          </tr>`
        ).join('');
  
        const result = await Swal.fire({
          title: 'Preview Import',
          html: `<table border="1" style="width:100%;font-size:0.9rem">
                  <thead><tr><th>ID</th><th>Type</th><th>Size</th><th>Color</th></tr></thead>
                  <tbody>${previewHtml}</tbody>
                </table>`,
          showCancelButton: true,
          confirmButtonText: 'Import Now',
          cancelButtonText: 'Cancel',
          width: 600
        });
  
        if (!result.isConfirmed) return;
  
        let imported = 0;
        let duplicates = 0;
  
        for (const item of records) {
          if (UniformModel.isValidUniform(item)) {
            const exists = await UniformModel.fetchUniformById(item.uniformID);
            if (exists) {
              duplicates++;
              continue;
            }
  
            item.uniformQty = parseInt(item.uniformQty || '0');
            item.img = '';
            await UniformModel.createUniform(item);
            imported++;
          }
        }
  
        let message = `✅ นำเข้า ${imported} รายการสำเร็จ`;
        if (duplicates > 0) message += `\n⚠️ ข้าม ${duplicates} รายการที่ซ้ำ`;
  
        Swal.fire({
          icon: 'success',
          title: 'ผลการนำเข้า',
          text: message,
          confirmButtonText: 'ปิด',
        });
  
        await reloadTable();
  
      } catch (err) {
        console.error("❌ CSV Import Error:", err);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: err.message || "ไม่สามารถนำเข้าข้อมูลได้",
        });
      }
    });
  
    input.click();
  });

  document.querySelector('.btn-export')?.addEventListener('click', async () => {
    try {
      UniformView.setFormLoading(true);
  
      const uniforms = await UniformModel.fetchAllUniforms();
  
      if (!uniforms || uniforms.length === 0) {
        return Swal.fire({
          icon: "info",
          title: "ไม่มีข้อมูลยูนิฟอร์ม",
          text: "ไม่พบข้อมูลที่สามารถส่งออกได้",
        });
      }
  
      const result = await Swal.fire({
        title: "ต้องการส่งออกข้อมูลยูนิฟอร์มหรือไม่?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "ส่งออก",
        cancelButtonText: "ยกเลิก",
      });
  
      if (result.isConfirmed) {
        const url = UniformModel.exportCSV(uniforms, [
          "uniformID",
          "uniformType",
          "uniformSize",
          "uniformColor",
          "uniformQty",
        ]);
        const link = document.createElement("a");
        link.href = url;
        link.download = "uniforms.csv";
        link.click();
        URL.revokeObjectURL(url);
  
        Swal.fire({
          icon: "success",
          title: "ส่งออกข้อมูลสำเร็จ",
          text: `รวมทั้งหมด ${uniforms.length} รายการ`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
  
    } catch (err) {
      console.error("❌ Export Uniform Error:", err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถส่งออกข้อมูลได้",
      });
    } finally {
      UniformView.setFormLoading(false);
    }
  });
  
  document.querySelector('#uniformForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const file = document.getElementById('uniformPhoto')?.files[0];
    const uniformData = {
      uniformID: form.uniformID.value.trim(),
      uniformType: form.uniformType.value.trim(),
      uniformSize: form.uniformSize.value.trim(),
      uniformColor: form.uniformColor.value.trim(),
      uniformQty: parseInt(form.uniformQty.value || '0'),
      img: '',
    };

    if (!UniformModel.isValidUniform(uniformData)) {
      return Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบ', timer: 2000, showConfirmButton: false });
    }

    UniformView.setFormLoading(true);
    try {
      if (file) {
        uniformData.img = await UniformModel.toBase64(file);
      }
      if (selectedUniformId) {
        await UniformModel.updateUniform(selectedUniformId, uniformData);
      } else {
        await UniformModel.createUniform(uniformData);
      }
      await reloadTable();
      UniformView.toggleModal('uniformModal', false);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถบันทึกข้อมูลได้",
      });
    } finally {
      UniformView.setFormLoading(false);
    }
  });
}

function generateUniformID(existingList = []) {
  const prefix = "Uniform-";
  try {
    const numbers = existingList
      .map((u) => parseInt(u.uniformID?.replace(prefix, "") || "0"))
      .filter((n) => !isNaN(n));
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = (max + 1).toString().padStart(3, "0");
    return `${prefix}${nextNumber}`;
  } catch (error) {
    console.error("❌ generateUniformID error:", error);
    return `${prefix}001`;
  }
}

window.handleEditUniform = async (uniformID) => {
  try {
    const uniform = await UniformModel.fetchUniformById(uniformID);
    if (!uniform) {
      return Swal.fire({
        icon: "warning",
        title: "ไม่พบข้อมูล",
        text: `ไม่พบยูนิฟอร์มที่มี ID: ${uniformID}`,
      });
    }

    selectedUniformId = uniformID;

    const form = document.querySelector("#uniformForm");
    form.uniformID.value = uniform.uniformID;
    form.uniformID.disabled = true;
    form.uniformType.value = uniform.uniformType;
    form.uniformSize.value = uniform.uniformSize;
    form.uniformColor.value = uniform.uniformColor;
    form.uniformQty.value = uniform.uniformQty || 0;

    const preview = document.getElementById("previewPhoto");
    if (uniform.img) {
      preview.src = uniform.img;
      preview.style.display = "block";
    } else {
      preview.src = "";
      preview.style.display = "none";
    }

    UniformView.setModalTitle("Edit Uniform", "fas fa-edit");
    UniformView.toggleModal("uniformModal", true);
    UniformView.initDropzone();

  } catch (err) {
    console.error("❌ Edit error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถโหลดข้อมูลยูนิฟอร์มได้",
    });
  }
};


window.promptDeleteUniform = async (uniformID) => {
  try {
    const result = await Swal.fire({
      title: 'ลบข้อมูล?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      await UniformModel.deleteUniform(uniformID);
      await reloadTable();

      Swal.fire({
        icon: 'success',
        title: 'ลบเรียบร้อยแล้ว',
        timer: 1500,
        showConfirmButton: false
      });
    }

  } catch (err) {
    console.error("❌ Delete Uniform Error:", err);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: err.message || "ไม่สามารถลบข้อมูลได้",
    });
  }
};