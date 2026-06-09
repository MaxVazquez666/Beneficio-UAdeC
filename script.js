const credentialNotice = "Promoción válida únicamente presentando credencial UAdeC vigente.";

const benefits = [
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

const perPage = 3;
let selectedUnit = "sureste";
let currentPage = 1;

const searchForm = document.querySelector(".search-box");
const searchInput = document.querySelector("#site-search");
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

const normalizeText = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function getFilteredBenefits(){
  const query = normalizeText(searchInput.value);
  return benefits.filter(item => {
    const inUnit = item.unit === selectedUnit;
    const haystack = normalizeText(`${item.title} ${item.unitLabel} ${item.category} ${item.text} ${item.search}`);
    return inUnit && (!query || haystack.includes(query));
  });
}

function render(){
  const filtered = getFilteredBenefits();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);
  const unitName = benefits.find(item => item.unit === selectedUnit)?.unitLabel || "Unidad";

  currentUnitLabel.textContent = unitName;
  resultsMessage.textContent = filtered.length ? `${filtered.length} beneficios encontrados · página ${currentPage} de ${totalPages}` : "No se encontraron beneficios con esa búsqueda.";

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
  }).join("") : `<div class="empty-state"><strong>Sin resultados.</strong><br>Prueba con otra marca, giro o unidad.</div>`;

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

searchInput.addEventListener("input", () => { currentPage = 1; render(); });
searchForm.addEventListener("submit", event => { event.preventDefault(); currentPage = 1; render(); });
prevPage.addEventListener("click", () => { if(currentPage > 1){ currentPage--; render(); } });
nextPage.addEventListener("click", () => { currentPage++; render(); });
pageNumbers.addEventListener("click", event => {
  const button = event.target.closest("button[data-page]");
  if(!button) return;
  currentPage = Number(button.dataset.page);
  render();
});

grid.addEventListener("click", event => {
  const trigger = event.target.closest(".zoom-trigger");
  if(!trigger) return;
  modalImage.src = trigger.dataset.image;
  modalImage.alt = `Vista ampliada de ${trigger.dataset.title}`;
  modalCaption.textContent = trigger.dataset.caption;
  modal.showModal();
});

modalClose.addEventListener("click", () => modal.close());
modal.addEventListener("click", event => { if(event.target === modal) modal.close(); });

render();
