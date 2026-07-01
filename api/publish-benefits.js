const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || "main";
const BENEFITS_PATH = process.env.BENEFITS_PATH || "data/beneficios.json";

function send(res, status, data){
  res.status(status).json(data);
}

function setCors(req, res){
  const allowed = (process.env.ALLOWED_ORIGIN || "*").trim();
  res.setHeader("Access-Control-Allow-Origin", allowed || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Publish-Key");
  res.setHeader("Vary", "Origin");
}

function slugify(value){
  return String(value || "beneficio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "beneficio";
}

function dataUrlParts(dataUrl){
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl || "");
  if(!match) return null;
  const type = match[2].toLowerCase() === "jpeg" ? "jpg" : match[2].toLowerCase();
  return {ext:type, content:match[3]};
}

async function gh(path, options = {}){
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
  if(!response.ok){
    throw new Error(data.message || `GitHub respondió ${response.status}`);
  }
  return data;
}

export default async function handler(req, res){
  setCors(req, res);
  if(req.method === "OPTIONS") return res.status(204).end();
  if(req.method !== "POST") return send(res, 405, {ok:false, error:"Método no permitido."});

  try{
    const expectedKey = process.env.ADMIN_PUBLISH_KEY;
    const receivedKey = req.headers["x-publish-key"];
    if(!expectedKey || !receivedKey || receivedKey !== expectedKey){
      return send(res, 401, {ok:false, error:"Clave de publicación inválida."});
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if(!owner || !repo) throw new Error("Falta configurar GITHUB_OWNER o GITHUB_REPO.");

    const rawBenefits = Array.isArray(req.body?.benefits) ? req.body.benefits : [];
    if(!rawBenefits.length) throw new Error("No se recibieron beneficios para publicar.");
    if(rawBenefits.length > 500) throw new Error("Se recibieron demasiados beneficios.");

    const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/${DEFAULT_BRANCH}`);
    const parentSha = ref.object.sha;
    const parentCommit = await gh(`/repos/${owner}/${repo}/git/commits/${parentSha}`);
    const baseTree = parentCommit.tree.sha;

    const tree = [];
    const publishedBenefits = [];
    const stamp = Date.now();

    for(let index = 0; index < rawBenefits.length; index++){
      const source = rawBenefits[index] || {};
      const item = {
        id: source.id || `benefit-${stamp}-${index}`,
        unit: String(source.unit || "").trim(),
        unitLabel: String(source.unitLabel || "").trim(),
        title: String(source.title || "").trim(),
        category: String(source.category || "").trim(),
        image: String(source.image || "").trim(),
        text: String(source.text || "").trim(),
        search: String(source.search || "").trim()
      };
      if(source.validUntil) item.validUntil = String(source.validUntil);
      if(!item.unit || !item.title || !item.category || !item.text){
        throw new Error(`El beneficio ${index + 1} tiene campos incompletos.`);
      }

      const imageParts = dataUrlParts(item.image);
      if(imageParts){
        const filename = `${slugify(item.title)}-${stamp}-${index}.${imageParts.ext}`;
        const imagePath = `assets/beneficios/publicados/${filename}`;
        const blob = await gh(`/repos/${owner}/${repo}/git/blobs`, {
          method:"POST",
          body:JSON.stringify({content:imageParts.content, encoding:"base64"})
        });
        tree.push({path:imagePath, mode:"100644", type:"blob", sha:blob.sha});
        item.image = imagePath;
      }

      item.search = item.search || `${item.title} ${item.category} ${item.unitLabel} ${item.text}`;
      publishedBenefits.push(item);
    }

    const jsonContent = JSON.stringify(publishedBenefits, null, 2) + "\n";
    const jsonBlob = await gh(`/repos/${owner}/${repo}/git/blobs`, {
      method:"POST",
      body:JSON.stringify({content:jsonContent, encoding:"utf-8"})
    });
    tree.push({path:BENEFITS_PATH, mode:"100644", type:"blob", sha:jsonBlob.sha});

    const newTree = await gh(`/repos/${owner}/${repo}/git/trees`, {
      method:"POST",
      body:JSON.stringify({base_tree:baseTree, tree})
    });
    const commit = await gh(`/repos/${owner}/${repo}/git/commits`, {
      method:"POST",
      body:JSON.stringify({
        message:`Publicar ${publishedBenefits.length} beneficios desde el panel UAdeC`,
        tree:newTree.sha,
        parents:[parentSha]
      })
    });
    await gh(`/repos/${owner}/${repo}/git/refs/heads/${DEFAULT_BRANCH}`, {
      method:"PATCH",
      body:JSON.stringify({sha:commit.sha, force:false})
    });

    send(res, 200, {
      ok:true,
      message:"Beneficios publicados correctamente en GitHub.",
      commit:commit.sha,
      benefits:publishedBenefits
    });
  }catch(error){
    console.error(error);
    send(res, 500, {ok:false, error:error.message || "No se pudieron publicar los beneficios."});
  }
}
