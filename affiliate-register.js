const AFFILIATES_KEY = 'uadec-afiliaciones-empresas';
const form = document.querySelector('#affiliate-form');
const successBox = document.querySelector('#affiliate-success');

function getAffiliates(){
  try{
    const saved = JSON.parse(localStorage.getItem(AFFILIATES_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  }catch(error){
    console.warn('No se pudieron leer las afiliaciones guardadas.', error);
    return [];
  }
}

function saveAffiliates(items){
  localStorage.setItem(AFFILIATES_KEY, JSON.stringify(items));
}

function normalize(value){
  return String(value || '').trim();
}

if(form){
  form.addEventListener('submit', event => {
    event.preventDefault();

    const record = {
      id: `empresa-${Date.now()}`,
      fecha: new Date().toLocaleString('es-MX'),
      contacto: normalize(document.querySelector('#affiliate-contact').value),
      correo: normalize(document.querySelector('#affiliate-email').value),
      telefono: normalize(document.querySelector('#affiliate-phone').value),
      empresa: normalize(document.querySelector('#affiliate-company').value),
      estatus: 'Pendiente'
    };

    const affiliates = getAffiliates();
    affiliates.push(record);
    saveAffiliates(affiliates);

    form.reset();
    successBox.hidden = false;
    successBox.scrollIntoView({behavior:'smooth', block:'center'});

    setTimeout(() => {
      window.location.href = 'index.html#inicio';
    }, 2600);
  });
}
