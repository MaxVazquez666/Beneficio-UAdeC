const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || "main";
const AFFILIATIONS_PATH = process.env.AFFILIATIONS_PATH || "data/afiliaciones.json";

function send(res, status, data){
  res.status(status).json(data);
}

function setCors(req, res){
  const allowed = (process.env.ALLOWED_ORIGIN || "*").trim();
  res.setHeader("Access-Control-Allow-Origin", allowed || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function clean(value, maxLength){
  return String(value || "").trim().slice(0, maxLength);
}

async function githubRequest(path, options = {}){
  const token = process.env.GITHUB_TOKEN;
  if(!token) throw new Error("Falta configurar GITHUB_TOKEN en Vercel.");

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2022-11-28",
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};
  try{ data = text ? JSON.parse(text) : {}; }catch{ data = {message:text}; }

  return {response, data};
}

export default async function handler(req, res){
  setCors(req, res);
  if(req.method === "OPTIONS") return res.status(204).end();
  if(req.method !== "POST") return send(res, 405, {ok:false, error:"Método no permitido."});

  try{
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if(!owner || !repo) throw new Error("Falta configurar GITHUB_OWNER o GITHUB_REPO.");

    const website = clean(req.body?.website, 120);
    if(website){
      return send(res, 200, {ok:true, message:"Registro recibido."});
    }

    const record = {
      id:`empresa-${Date.now()}`,
      fecha:new Date().toISOString(),
      empresa:clean(req.body?.empresa, 120),
      contacto:clean(req.body?.contacto, 120),
      correo:clean(req.body?.correo, 160).toLowerCase(),
      telefono:clean(req.body?.telefono, 40),
      estatus:"Pendiente"
    };

    if(!record.empresa || !record.contacto || !record.correo || !record.telefono){
      return send(res, 400, {ok:false, error:"Completa todos los campos obligatorios."});
    }

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.correo)){
      return send(res, 400, {ok:false, error:"Escribe un correo válido."});
    }

    const filePath = encodeURIComponent(AFFILIATIONS_PATH).replace(/%2F/g, "/");
    const current = await githubRequest(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(DEFAULT_BRANCH)}`
    );

    let items = [];
    let sha;

    if(current.response.ok){
      sha = current.data.sha;
      const decoded = Buffer.from(current.data.content || "", "base64").toString("utf8");
      try{
        const parsed = JSON.parse(decoded);
        items = Array.isArray(parsed) ? parsed : [];
      }catch{
        items = [];
      }
    }else if(current.response.status !== 404){
      throw new Error(current.data.message || `GitHub respondió ${current.response.status}`);
    }

    items.push(record);
    if(items.length > 5000) items = items.slice(-5000);

    const content = Buffer.from(JSON.stringify(items, null, 2) + "\n", "utf8").toString("base64");
    const payload = {
      message:`Registrar empresa: ${record.empresa}`,
      content,
      branch:DEFAULT_BRANCH
    };
    if(sha) payload.sha = sha;

    const saved = await githubRequest(`/repos/${owner}/${repo}/contents/${filePath}`, {
      method:"PUT",
      body:JSON.stringify(payload)
    });

    if(!saved.response.ok){
      throw new Error(saved.data.message || `GitHub respondió ${saved.response.status}`);
    }

    return send(res, 200, {
      ok:true,
      message:"Empresa registrada correctamente.",
      id:record.id
    });
  }catch(error){
    console.error(error);
    return send(res, 500, {
      ok:false,
      error:error.message || "No se pudo registrar la empresa."
    });
  }
}
