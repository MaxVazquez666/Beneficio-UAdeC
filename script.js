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
    const response = await fetch(`data/beneficios.json?t=${new Date().getTime()}`, {
      cache: "no-store",
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if(!response.ok) throw new Error("No se pudo cargar data/beneficios.json");
    benefits = applyBaseBenefitEdits(await response.json());
  }catch(error){
    console.error("Error al cargar JSON de beneficios:", error);
    benefits = [];
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
    const caption = `${item.unitLabel} · ${item.category}`;
    return `
      <article class="benefit-card">
        <button type="button" class="zoom-trigger" data-image="${escapeHtml(item.image)}" data-title="${escapeHtml(item.title)}" data-caption="${escapeHtml(caption)}">
          <figure><img src="${escapeHtml(item.image)}" alt="Beneficio ${escapeHtml(item.title)} ${escapeHtml(item.unitLabel)}" loading="lazy"></figure>
          <div class="card-body">
            <span class="badge">${escapeHtml(item.unitLabel)}</span>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
        </button>
      </article>`;
  }).join("") : `<div class="empty-state"><strong>Sin beneficios disponibles.</strong><br>Selecciona otra unidad regional.</div>`;

  renderPagination(totalPages);
}

function renderPagination(totalPages){
  if(!prevPage || !nextPage || !pageNumbers) return;
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
    document.querySelector("#beneficios")?.scrollIntoView({behavior:"smooth", block:"start"});
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