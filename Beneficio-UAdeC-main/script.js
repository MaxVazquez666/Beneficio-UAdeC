const credentialNotice = "Promoción válida únicamente presentando credencial UAdeC vigente.";
const LOCAL_BENEFITS_KEY = "uadec-beneficios-locales";
const BASE_EDITS_KEY = "uadec-beneficios-editados";


function getBaseBenefitEdits(){
  try{
    const saved = JSON.parse(localStorage.getItem(BASE_EDITS_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  }catch(error){
    console.warn("No se pudieron leer ediciones de beneficios base.", error);
    return {};
  }
}

function applyBaseBenefitEdits(items){
  const edits = getBaseBenefitEdits();
  return items.map((item, index) => {
    const id = item.id || `base-${index}`;
    return {...item, id, ...(edits[id] || {})};
  });
}

function getLocalBenefits(){
  try{
    const saved = JSON.parse(localStorage.getItem(LOCAL_BENEFITS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  }catch(error){
    console.warn("No se pudieron leer beneficios locales.", error);
    return [];
  }
}

let benefits = [];
const perPage = 3;
let selectedUnit = "sureste";
let currentPage = 1;

const fallbackBenefits = [
  { unit:"sureste", unitLabel:"Unidad Sureste", title:"KFC", category:"Restaurante", image:"assets/beneficios/kfc.jpeg", text:"Beneficio para comunidad universitaria en restaurante participante.", search:"kfc comida restaurante pollo saltillo sureste" },
  { unit:"sureste", unitLabel:"Unidad Sureste", title:"Tacos", category:"Restaurante", image:"assets/beneficios/tacos.jpeg", text:"Beneficio de alimentos para estudiantes, docentes y personal.", search:"tacos restaurante comida saltillo sureste" },
  { unit:"sureste", unitLabel:"Unidad Sureste", title:"Pampas", category:"Restaurante", image:"assets/beneficios/pampas.jpeg", text:"Beneficio en restaurante participante.", search:"pampas buffet restaurante comida sureste" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"Pampas", category:"Restaurante", image:"assets/beneficios/pampas.jpeg", text:"Beneficio en restaurante participante.", search:"pampas buffet restaurante comida laguna" },
  { unit:"norte", unitLabel:"Unidad Norte", title:"Pampas", category:"Restaurante", image:"assets/beneficios/pampas.jpeg", text:"Beneficio en restaurante participante.", search:"pampas buffet restaurante comida norte" },
  { unit:"sureste", unitLabel:"Unidad Sureste", title:"Boliche", category:"Entretenimiento", image:"assets/beneficios/boliche.jpeg", text:"Promoción en entretenimiento para comunidad UAdeC.", search:"boliche entretenimiento diversion sureste" },
  { unit:"sureste", unitLabel:"Unidad Sureste", title:"Padel", category:"Deporte", image:"assets/beneficios/padel.jpeg", text:"Beneficio deportivo para comunidad universitaria.", search:"padel deporte fitness sureste" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"City Express", category:"Hotel", image:"assets/beneficios/city-express.jpeg", text:"Beneficio de hospedaje para comunidad universitaria.", search:"city express hotel hospedaje torreon laguna" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"Suites", category:"Hotel", image:"assets/beneficios/suites.jpeg", text:"Beneficio de hospedaje en establecimiento aliado.", search:"suites hotel hospedaje laguna" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"Senda", category:"Transporte", image:"assets/beneficios/senda.jpeg", text:"Beneficio en transporte para la comunidad universitaria.", search:"senda transporte viajes laguna" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"KFC Nuevo León", category:"Restaurante", image:"assets/beneficios/kfc-nuevo-leon.jpeg", text:"Beneficio en restaurante participante de la Unidad Laguna.", search:"kfc nuevo leon restaurante comida laguna" },
  { unit:"laguna", unitLabel:"Unidad Laguna", title:"Tim Hortons", category:"Cafetería", image:"assets/beneficios/tim-hortons.jpeg", text:"Beneficio en cafetería para comunidad universitaria.", search:"tim hortons cafe cafeteria restaurante laguna" }
];

const unitButtons = document.querySelectorAll(".unit-card");
const grid = document.querySelector("#benefit-grid");
const resultsMessage = document.querySelector("#results-message");
const currentUnitLabel = document.querySelector("#current-unit-label");
const pageNumbers = document.querySelector("#page-numbers");
const prevPage = document.querySelector("#prev-page");
const nextPage = document.querySelector("#next-page");
const modal = document.querySelector("#image-modal");
const modalImage = document.querySelector("#modal-image");
const modalCaption = document.querySelector("#modal-caption");
const modalClose = document.querySelector(".modal-close");

const normalizeText = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function escapeHtml(value){
  return String(value || "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

async function loadBenefits(){
  try{
    const response = await fetch("data/beneficios.json", {cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar data/beneficios.json");
    benefits = applyBaseBenefitEdits(await response.json());
  }catch(error){
    console.warn("Usando beneficios de respaldo. Para editar fácilmente usa Live Server o GitHub Pages.", error);
    benefits = applyBaseBenefitEdits(fallbackBenefits);
  }

  benefits = [...benefits, ...getLocalBenefits()];
  render();
}

function getFilteredBenefits(){
  return benefits.filter(item => item.unit === selectedUnit);
}

function render(){
  if(!grid) return;
  const filtered = getFilteredBenefits();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const unitName = benefits.find(item => item.unit === selectedUnit)?.unitLabel || "Unidad";

  currentUnitLabel.textContent = unitName;
  resultsMessage.textContent = filtered.length ? `${filtered.length} beneficios disponibles · página ${currentPage} de ${totalPages}` : "No hay beneficios disponibles en esta unidad.";

  grid.innerHTML = pageItems.length ? pageItems.map(item => {
    const caption = `${item.unitLabel} · ${item.category} · ${item.text} ${credentialNotice}`;
    return `
      <article class="benefit-card">
        <button type="button" class="zoom-trigger" data-image="${escapeHtml(item.image)}" data-title="${escapeHtml(item.title)}" data-caption="${escapeHtml(caption)}">
          <figure><img src="${escapeHtml(item.image)}" alt="Beneficio ${escapeHtml(item.title)} ${escapeHtml(item.unitLabel)}" loading="lazy"></figure>
          <div class="card-body">
            <span class="badge">${escapeHtml(item.unitLabel)}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
            <p class="credential-warning">${credentialNotice}</p>
          </div>
        </button>
      </article>`;
  }).join("") : `<div class="empty-state"><strong>Sin beneficios disponibles.</strong><br>Selecciona otra unidad regional.</div>`;

  renderPagination(totalPages);
}

function renderPagination(totalPages){
  prevPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === totalPages;
  pageNumbers.innerHTML = Array.from({length: totalPages}, (_, index) => {
    const page = index + 1;
    return `<button type="button" class="${page === currentPage ? "active" : ""}" data-page="${page}" aria-label="Ir a página ${page}">${page}</button>`;
  }).join("");
}

unitButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedUnit = button.dataset.unit;
    currentPage = 1;
    unitButtons.forEach(item => item.classList.toggle("active", item === button));
    document.querySelector("#beneficios").scrollIntoView({behavior:"smooth", block:"start"});
    render();
  });
});

if(prevPage){
  prevPage.addEventListener("click", () => { if(currentPage > 1){ currentPage--; render(); } });
}
if(nextPage){
  nextPage.addEventListener("click", () => { currentPage++; render(); });
}
if(pageNumbers){
  pageNumbers.addEventListener("click", event => {
    const button = event.target.closest("button[data-page]");
    if(!button) return;
    currentPage = Number(button.dataset.page);
    render();
  });
}
if(grid){
  grid.addEventListener("click", event => {
    const trigger = event.target.closest(".zoom-trigger");
    if(!trigger) return;
    modalImage.src = trigger.dataset.image;
    modalImage.alt = `Vista ampliada de ${trigger.dataset.title}`;
    modalCaption.textContent = trigger.dataset.caption;
    modal.showModal();
  });
}
if(modalClose){ modalClose.addEventListener("click", () => modal.close()); }
if(modal){ modal.addEventListener("click", event => { if(event.target === modal) modal.close(); }); }

loadBenefits();
