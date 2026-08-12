const form = document.querySelector('#affiliate-form');
const successBox = document.querySelector('#affiliate-success');
const errorBox = document.querySelector('#affiliate-error');
const submitButton = document.querySelector('#affiliate-submit');

function normalize(value){
  return String(value || '').trim();
}

function getRegistrationEndpoint(){
  const publishEndpoint = window.UADEC_PUBLISH_CONFIG?.endpoint || '';
  if(!publishEndpoint) return '';
  return publishEndpoint.replace(/\/api\/publish-benefits\/?$/i, '/api/register-company');
}

function showError(message){
  if(successBox) successBox.hidden = true;
  if(errorBox){
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

function showSuccess(){
  if(errorBox) errorBox.hidden = true;
  if(successBox){
    successBox.hidden = false;
    successBox.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

if(form){
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const endpoint = getRegistrationEndpoint();
    if(!endpoint){
      showError('El servicio de registro aún no está configurado. Intenta más tarde.');
      return;
    }

    const record = {
      contacto: normalize(document.querySelector('#affiliate-contact')?.value),
      correo: normalize(document.querySelector('#affiliate-email')?.value),
      telefono: normalize(document.querySelector('#affiliate-phone')?.value),
      empresa: normalize(document.querySelector('#affiliate-company')?.value),
      website: normalize(document.querySelector('#affiliate-website')?.value)
    };

    if(!record.contacto || !record.correo || !record.telefono || !record.empresa){
      showError('Completa todos los campos obligatorios.');
      return;
    }

    if(submitButton){
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando registro…';
    }

    try{
      const response = await fetch(endpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(record)
      });

      const data = await response.json().catch(() => ({}));
      if(!response.ok || !data.ok){
        throw new Error(data.error || 'No fue posible enviar el registro.');
      }

      form.reset();
      showSuccess();
    }catch(error){
      console.error(error);
      showError(error.message || 'No fue posible enviar el registro. Intenta nuevamente.');
    }finally{
      if(submitButton){
        submitButton.disabled = false;
        submitButton.textContent = 'Registrar empresa';
      }
    }
  });
}
