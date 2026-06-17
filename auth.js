(() => {
  const ADMIN_EMAIL = "angelamolinaarriaga@uadec.edu.mx";
  const INSTITUTIONAL_DOMAIN = "@uadec.edu.mx";
  const ROLE_KEY = "uadec-session-role";
  const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  function normalizeEmail(value){
    return String(value || "").trim().toLowerCase();
  }

  function setRole(role){
    sessionStorage.setItem(ROLE_KEY, role);
  }

  function getRole(){
    return sessionStorage.getItem(ROLE_KEY);
  }

  function clearSession(){
    sessionStorage.removeItem(ROLE_KEY);
  }

  function goToLogin(){
    location.href = "index.html";
  }

  function goToPortal(){
    location.href = "portal.html";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.querySelector("#login-form");
    const loginEmail = document.querySelector("#login-email");
    const loginError = document.querySelector("#login-error");

    if(loginForm){
      clearSession();
      loginForm.reset();
      if(loginEmail){
        loginEmail.value = "";
        setTimeout(() => loginEmail.value = "", 150);
      }

      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = normalizeEmail(loginEmail?.value);
        if(!email || !email.includes("@") || !(email === ADMIN_EMAIL || email.endsWith(INSTITUTIONAL_DOMAIN))){
          if(loginError) loginError.hidden = false;
          if(loginEmail) loginEmail.value = "";
          return;
        }

        if(loginError) loginError.hidden = true;
        setRole(email === ADMIN_EMAIL ? "admin" : "consulta");
        if(loginEmail) loginEmail.value = "";
        goToPortal();
      });
      return;
    }

    const role = getRole();

    if(!role){
      goToLogin();
      return;
    }

    if((currentPage === "admin.html" || currentPage === "registro.html") && role !== "admin"){
      goToPortal();
      return;
    }

    document.querySelectorAll("[data-admin-only]").forEach((element) => {
      if(role !== "admin") element.remove();
    });

    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", () => {
        clearSession();
        goToLogin();
      });
    });
  });
})();
