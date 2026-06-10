const form = document.querySelector('#benefit-form');
const formTitle = document.querySelector('#benefit-form-title');
const statusBox = document.querySelector('#admin-status');
const list = document.querySelector('#generated-list');
const clearButton = document.querySelector('#clear-list');
const cancelButton = document.querySelector('#cancel-button');
const cancelEditButton = document.querySelector('#cancel-edit-button');
const saveBenefitButton = document.querySelector('#save-benefit-button');
const fileInput = document.querySelector('#image-file');
const previewCard = document.querySelector('#preview-card');
const previewImage = document.querySelector('#image-preview');

const STORAGE_KEY = 'uadec-beneficios-locales';
const BASE_EDITS_KEY = 'uadec-beneficios-editados';
let baseBenefits = [];
let savedBenefits = readJson(STORAGE_KEY, []);
let baseEdits = readJson(BASE_EDITS_KEY, {});
let selectedImage = '';
let editing = null;

function readJson(key, fallback){
  try{
    const saved = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return saved || fallback;
  }catch(error){
    console.warn(`No se pudo leer ${key}.`, error);
    return fallback;
  }
}

function normalize(value){
  return String(value || '').trim();
}

function escapeHtml(value){
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
  }[char]));
}

function showStatus(message, type = 'success'){
  if(!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `status-message ${type}`;
  statusBox.hidden = false;
  setTimeout(() => { statusBox.hidden = true; }, 3600);
}

function saveLocalBenefits(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedBenefits));
}

function saveBaseEdits(){
  localStorage.setItem(BASE_EDITS_KEY, JSON.stringify(baseEdits));
}

function getBaseId(item, index){
  return item.id || `base-${index}`;
}

function getUnitLabelFromValue(value){
  if(value === 'sureste') return 'Unidad Sureste';
  if(value === 'laguna') return 'Unidad Laguna';
  if(value === 'norte') return 'Unidad Norte';
  return 'Unidad';
}

function getBaseBenefitsWithEdits(){
  return baseBenefits.map((item, index) => {
    const id = getBaseId(item, index);
    return {...item, id, ...(baseEdits[id] || {}), source:'base'};
  });
}

function getAllBenefits(){
  return [
    ...getBaseBenefitsWithEdits(),
    ...savedBenefits.map(item => ({...item, source:'local'}))
  ];
}

async function loadBaseBenefits(){
  try{
    const response = await fetch('data/beneficios.json', {cache:'no-store'});
    if(!response.ok) throw new Error('No se pudo cargar data/beneficios.json');
    baseBenefits = await response.json();
  }catch(error){
    console.warn('No se pudieron cargar los beneficios base.', error);
    baseBenefits = [];
  }
  renderList();
}

function renderList(){
  const items = getAllBenefits();
  list.innerHTML = items.length ? items.map((item, index) => {
    const isBase = item.source === 'base';
    const baseChanged = isBase && baseEdits[item.id];
    return `
      <div class="admin-list-item local-benefit-item">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.unitLabel)} · ${escapeHtml(item.category)}</span>
          <div class="mini-actions">
            <button type="button" class="mini-edit" data-source="${escapeHtml(item.source)}" data-id="${escapeHtml(item.id)}">Editar</button>
            ${isBase ? (baseChanged ? `<button type="button" class="mini-delete" data-restore-id="${escapeHtml(item.id)}">Restaurar</button>` : '') : `<button type="button" class="mini-delete" data-local-id="${escapeHtml(item.id)}">Eliminar</button>`}
          </div>
        </div>
      </div>`;
  }).join('') : '<p>No hay beneficios para mostrar.</p>';
}

function resetForm(){
  form.reset();
  selectedImage = '';
  editing = null;
  previewImage.src = '';
  previewCard.hidden = true;
  formTitle.textContent = 'Nuevo beneficio';
  saveBenefitButton.textContent = 'Aceptar y agregar beneficio';
  cancelEditButton.hidden = true;
  fileInput.required = false;
}

function readImageAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fillForm(item){
  document.querySelector('#title').value = item.title || '';
  document.querySelector('#category').value = item.category || '';
  document.querySelector('#unit').value = item.unit || '';
  document.querySelector('#text').value = item.text || '';
  selectedImage = item.image || '';
  previewImage.src = selectedImage;
  previewCard.hidden = !selectedImage;
  formTitle.textContent = `Editando: ${item.title}`;
  saveBenefitButton.textContent = 'Guardar cambios del beneficio';
  cancelEditButton.hidden = false;
  fileInput.required = false;
  form.scrollIntoView({behavior:'smooth', block:'start'});
}

function buildBenefitFromForm(existingImage = ''){
  const title = normalize(document.querySelector('#title').value);
  const category = normalize(document.querySelector('#category').value);
  const unitSelect = document.querySelector('#unit');
  const unit = unitSelect.value;
  const unitLabel = unitSelect.options[unitSelect.selectedIndex]?.dataset.label || getUnitLabelFromValue(unit);
  const text = normalize(document.querySelector('#text').value);
  const image = selectedImage || existingImage;

  return {
    unit,
    unitLabel,
    title,
    category,
    image,
    text,
    search: `${title} ${category} ${unitLabel} ${text}`
  };
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if(!file){
    if(!editing){ selectedImage = ''; previewCard.hidden = true; }
    return;
  }

  if(file.size > 900 * 1024){
    alert('La imagen es algo pesada. Usa una imagen menor a 900 KB para que se pueda guardar correctamente.');
    fileInput.value = '';
    if(!editing){ selectedImage = ''; previewCard.hidden = true; }
    return;
  }

  selectedImage = await readImageAsDataUrl(file);
  previewImage.src = selectedImage;
  previewCard.hidden = false;
});

form.addEventListener('submit', event => {
  event.preventDefault();

  if(!selectedImage && !editing){
    alert('Sube una imagen del beneficio.');
    return;
  }

  if(editing?.source === 'base'){
    const current = getBaseBenefitsWithEdits().find(item => item.id === editing.id);
    baseEdits[editing.id] = {...buildBenefitFromForm(current?.image), id: editing.id};
    saveBaseEdits();
    renderList();
    resetForm();
    showStatus('Los cambios del beneficio han sido guardados correctamente.');
    return;
  }

  if(editing?.source === 'local'){
    const index = savedBenefits.findIndex(item => item.id === editing.id);
    if(index !== -1){
      savedBenefits[index] = {...savedBenefits[index], ...buildBenefitFromForm(savedBenefits[index].image), id: editing.id};
      saveLocalBenefits();
      renderList();
      resetForm();
      showStatus('Los cambios del beneficio han sido guardados correctamente.');
    }
    return;
  }

  const newBenefit = {
    id: `local-${Date.now()}`,
    ...buildBenefitFromForm()
  };

  savedBenefits.push(newBenefit);
  saveLocalBenefits();
  renderList();
  resetForm();

  const goToBenefits = confirm('Beneficio agregado correctamente. ¿Quieres verlo ahora en la sección de beneficios?');
  if(goToBenefits){
    window.location.href = 'index.html#beneficios';
  }else{
    showStatus('Beneficio agregado correctamente.');
  }
});

cancelButton.addEventListener('click', resetForm);
cancelEditButton.addEventListener('click', resetForm);

clearButton.addEventListener('click', () => {
  if(confirm('¿Borrar todos los beneficios agregados desde este panel? Los beneficios originales no se eliminan.')){
    savedBenefits = [];
    saveLocalBenefits();
    renderList();
    showStatus('Beneficios agregados desde este panel eliminados correctamente.');
  }
});

list.addEventListener('click', event => {
  const editButton = event.target.closest('.mini-edit');
  const deleteButton = event.target.closest('[data-local-id]');
  const restoreButton = event.target.closest('[data-restore-id]');

  if(editButton){
    const source = editButton.dataset.source;
    const id = editButton.dataset.id;
    const item = getAllBenefits().find(benefit => benefit.id === id && benefit.source === source);
    if(item){
      editing = {source, id};
      fillForm(item);
    }
    return;
  }

  if(deleteButton){
    const id = deleteButton.dataset.localId;
    if(confirm('¿Eliminar este beneficio agregado?')){
      savedBenefits = savedBenefits.filter(item => item.id !== id);
      saveLocalBenefits();
      renderList();
      showStatus('Beneficio eliminado correctamente.');
    }
    return;
  }

  if(restoreButton){
    const id = restoreButton.dataset.restoreId;
    if(confirm('¿Restaurar este beneficio a su información original?')){
      delete baseEdits[id];
      saveBaseEdits();
      renderList();
      showStatus('Beneficio restaurado correctamente.');
    }
  }
});

// ===== AFILIACIONES DE EMPRESAS: LISTA, EDICIÓN Y EXPORTACIÓN EXCEL =====
const AFFILIATES_KEY = 'uadec-afiliaciones-empresas';
const affiliateList = document.querySelector('#affiliate-list');
const exportAffiliatesButton = document.querySelector('#export-affiliates');
const clearAffiliatesButton = document.querySelector('#clear-affiliates');
const affiliateEditForm = document.querySelector('#affiliate-edit-form');
const cancelAffiliateEditButton = document.querySelector('#cancel-affiliate-edit');

function getAffiliates(){
  try{
    const saved = JSON.parse(localStorage.getItem(AFFILIATES_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  }catch(error){
    console.warn('No se pudieron leer afiliaciones.', error);
    return [];
  }
}

function saveAffiliates(items){
  localStorage.setItem(AFFILIATES_KEY, JSON.stringify(items));
}

function renderAffiliates(){
  if(!affiliateList) return;
  const affiliates = getAffiliates();
  affiliateList.innerHTML = affiliates.length ? affiliates.map((item, index) => `
    <div class="admin-list-item affiliate-item">
      <strong>${escapeHtml(item.empresa)}</strong>
      <span>${escapeHtml(item.contacto)} · ${escapeHtml(item.correo)}</span>
      <span>${escapeHtml(item.telefono)} · ${escapeHtml(item.fecha)}</span>
      <span><strong>Estatus:</strong> ${escapeHtml(item.estatus || 'Pendiente')}</span>
      <div class="mini-actions">
        <button type="button" class="mini-edit" data-affiliate-edit="${index}">Editar</button>
        <button type="button" class="mini-delete" data-affiliate-index="${index}">Eliminar</button>
      </div>
    </div>
  `).join('') : '<p>No hay empresas registradas todavía.</p>';
}

function fillAffiliateForm(index){
  const affiliates = getAffiliates();
  const item = affiliates[index];
  if(!item) return;
  document.querySelector('#edit-affiliate-index').value = index;
  document.querySelector('#edit-affiliate-company').value = item.empresa || '';
  document.querySelector('#edit-affiliate-contact').value = item.contacto || '';
  document.querySelector('#edit-affiliate-email').value = item.correo || '';
  document.querySelector('#edit-affiliate-phone').value = item.telefono || '';
  document.querySelector('#edit-affiliate-status').value = item.estatus || 'Pendiente';
  affiliateEditForm.hidden = false;
  affiliateEditForm.scrollIntoView({behavior:'smooth', block:'center'});
}

function excelSafe(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadAffiliateExcel(){
  const affiliates = getAffiliates();
  if(!affiliates.length){
    alert('Todavía no hay empresas registradas para exportar.');
    return;
  }

  const rows = affiliates.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${excelSafe(item.fecha)}</td>
      <td>${excelSafe(item.empresa)}</td>
      <td>${excelSafe(item.contacto)}</td>
      <td>${excelSafe(item.correo)}</td>
      <td>${excelSafe(item.telefono)}</td>
      <td style="background:#fff7df; font-weight:bold;">${excelSafe(item.estatus || 'Pendiente')}</td>
      <td></td>
    </tr>
  `).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Afiliaciones</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background:#061f49;color:#ffffff;font-weight:bold;">
              <th>#</th>
              <th>Fecha de registro</th>
              <th>Nombre de la empresa</th>
              <th>Nombre del contacto</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Estatus</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob(['\ufeff', html], {type:'application/vnd.ms-excel;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  link.href = url;
  link.download = `afiliaciones-empresas-uadec-${date}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

if(exportAffiliatesButton){
  exportAffiliatesButton.addEventListener('click', downloadAffiliateExcel);
}

if(clearAffiliatesButton){
  clearAffiliatesButton.addEventListener('click', () => {
    if(confirm('¿Borrar todos los registros de empresas guardados?')){
      saveAffiliates([]);
      renderAffiliates();
      affiliateEditForm.hidden = true;
      showStatus('Registros de empresas eliminados correctamente.');
    }
  });
}

if(affiliateList){
  affiliateList.addEventListener('click', event => {
    const editButton = event.target.closest('[data-affiliate-edit]');
    const deleteButton = event.target.closest('[data-affiliate-index]');

    if(editButton){
      fillAffiliateForm(Number(editButton.dataset.affiliateEdit));
      return;
    }

    if(deleteButton){
      const affiliates = getAffiliates();
      if(confirm('¿Eliminar este registro de empresa?')){
        affiliates.splice(Number(deleteButton.dataset.affiliateIndex), 1);
        saveAffiliates(affiliates);
        renderAffiliates();
        affiliateEditForm.hidden = true;
        showStatus('Empresa eliminada correctamente.');
      }
    }
  });
}

if(affiliateEditForm){
  affiliateEditForm.addEventListener('submit', event => {
    event.preventDefault();
    const index = Number(document.querySelector('#edit-affiliate-index').value);
    const affiliates = getAffiliates();
    if(!affiliates[index]) return;
    affiliates[index] = {
      ...affiliates[index],
      empresa: normalize(document.querySelector('#edit-affiliate-company').value),
      contacto: normalize(document.querySelector('#edit-affiliate-contact').value),
      correo: normalize(document.querySelector('#edit-affiliate-email').value),
      telefono: normalize(document.querySelector('#edit-affiliate-phone').value),
      estatus: normalize(document.querySelector('#edit-affiliate-status').value) || 'Pendiente'
    };
    saveAffiliates(affiliates);
    affiliateEditForm.hidden = true;
    renderAffiliates();
    showStatus('Los cambios de la empresa han sido guardados correctamente.');
  });
}

if(cancelAffiliateEditButton){
  cancelAffiliateEditButton.addEventListener('click', () => {
    affiliateEditForm.hidden = true;
  });
}

loadBaseBenefits();
renderAffiliates();
