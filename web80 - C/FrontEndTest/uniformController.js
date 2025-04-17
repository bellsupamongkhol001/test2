import { UniformModel } from './uniformModel.js';
import { UniformView } from './uniformView.js';

let selectedUniformId = null;

window.addEventListener('DOMContentLoaded', async () => {
  await reloadTable();
  setupEvents();
});

async function reloadTable() {
  const uniforms = await UniformModel.fetchAllUniforms();
  UniformView.renderTable(uniforms);
}

function generateUniformID(existingList = []) {
  const prefix = "Uniform-";
  const numbers = existingList
    .map((u) => parseInt(u.uniformID?.replace(prefix, "") || "0"))
    .filter((n) => !isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const nextNumber = (max + 1).toString().padStart(3, "0");
  return prefix + nextNumber;
}

function setupEvents() {
  document.querySelector('.btn-add')?.addEventListener('click', async () => {
    selectedUniformId = null;
    UniformView.resetForm();

    const uniforms = await UniformModel.fetchAllUniforms();
    const newID = generateUniformID(uniforms);
    const idInput = document.getElementById("uniformID");
    if (idInput) {
      idInput.value = newID;
      idInput.disabled = true;
    }

    UniformView.setModalTitle('Add Uniform', 'fas fa-plus');
    UniformView.toggleModal('uniformModal', true);
    UniformView.initDropzone();
  });

  document.querySelector('#cancelBtn')?.addEventListener('click', () => {
    UniformView.toggleModal('uniformModal', false);
  });

  document.querySelector('.btn-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const records = UniformModel.parseCSV(text);

      const previewHtml = records.map((r) =>
        `<tr><td>${r.uniformID}</td><td>${r.uniformType}</td><td>${r.uniformSize}</td><td>${r.uniformColor}</td></tr>`
      ).join('');

      const result = await Swal.fire({
        title: 'Preview Import',
        html: '<table border="1" style="width:100%;font-size:0.9rem">' +
              '<thead><tr><th>ID</th><th>Type</th><th>Size</th><th>Color</th></tr></thead>' +
              '<tbody>' + previewHtml + '</tbody></table>',
        showCancelButton: true,
        confirmButtonText: 'Import Now',
        cancelButtonText: 'Cancel',
        width: 600
      });

      if (result.isConfirmed) {
        let count = 0;
        for (const item of records) {
          if (UniformModel.isValidUniform(item)) {
            item.uniformQty = parseInt(item.uniformQty || '0');
            item.img = '';
            await UniformModel.createUniform(item);
            count++;
          }
        }
        Swal.fire({ icon: 'success', title: `✅ Imported ${count} records`, timer: 2000, showConfirmButton: false });
        await reloadTable();
      }
    });
    input.click();
  });

  document.querySelector('.btn-export')?.addEventListener('click', async () => {
    UniformView.setFormLoading(true);
    const uniforms = await UniformModel.fetchAllUniforms();
    const result = await Swal.fire({
      title: 'Export CSV?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Export',
      cancelButtonText: 'Cancel'
    });
    if (result.isConfirmed) {
      const url = UniformModel.exportCSV(uniforms, ['uniformID', 'uniformType', 'uniformSize', 'uniformColor', 'uniformQty']);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uniforms.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
    UniformView.setFormLoading(false);
  });

  document.querySelector('#searchUniform')?.addEventListener('input', async (e) => {
    const keyword = e.target.value.toLowerCase();
    const uniforms = await UniformModel.fetchAllUniforms();
    const filtered = uniforms.filter(u =>
      u.uniformType?.toLowerCase().includes(keyword) ||
      u.uniformSize?.toLowerCase().includes(keyword) ||
      u.uniformColor?.toLowerCase().includes(keyword)
    );
    UniformView.renderTable(filtered);
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
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      UniformView.setFormLoading(false);
    }
  });
}

window.handleEditUniform = async (uniformID) => {
  const uniform = await UniformModel.fetchUniformById(uniformID);
  if (!uniform) return;
  selectedUniformId = uniformID;
  const form = document.querySelector('#uniformForm');
  form.uniformID.value = uniform.uniformID;
  form.uniformID.disabled = true;
  form.uniformType.value = uniform.uniformType;
  form.uniformSize.value = uniform.uniformSize;
  form.uniformColor.value = uniform.uniformColor;
  form.uniformQty.value = uniform.uniformQty || 0;

  const preview = document.getElementById('previewPhoto');
  if (uniform.img) {
    preview.src = uniform.img;
    preview.style.display = 'block';
  }

  UniformView.setModalTitle('Edit Uniform', 'fas fa-edit');
  UniformView.toggleModal('uniformModal', true);
  UniformView.initDropzone();
};

window.promptDeleteUniform = async (uniformID) => {
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
    Swal.fire({ icon: 'success', title: 'ลบเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });
  }
};

window.reloadUniformTable = reloadTable;
