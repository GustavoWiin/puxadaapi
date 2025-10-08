// pages/api/teste.js

// Basic CORS whitelist
const ALLOWED_ORIGINS = new Set([
  "https://vzmdad.site",
  "https://www.vzmdad.site"
]);

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // minimal CORS policy
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // allow credentials if you need: res.setHeader("Access-Control-Allow-Credentials", "true");
}

// Format CPF like 000.000.000-00
function formatCPF(raw) {
  if (!raw) return "";
  // remove non-digits
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 11) return raw; // return original if unexpected length
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
}

// Normalize upstream response keys to more convenient lowercase names
function normalizeUpstream(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

export default async function handler(req, res) {
  // Set basic CORS
  setCorsHeaders(req, res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // Accept GET with ?cpf=... from frontend (convenient), or accept POST with JSON body { cpf: '...' }
    let cpf = "";
    if (req.method === "GET") {
      cpf = String(req.query.cpf || "").trim();
    } else if (req.method === "POST") {
      // if client posts JSON body
      if (req.headers["content-type"] && req.headers["content-type"].includes("application/json")) {
        cpf = (req.body && req.body.cpf) ? String(req.body.cpf).trim() : "";
      } else {
        // fallback: check query
        cpf = String(req.query.cpf || "").trim();
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!cpf) {
      return res.status(400).json({ error: "Missing cpf parameter" });
    }

    // Prepare upstream POST JSON (the format you confirmed works)
    const upstreamRes = await fetch("https://v4.consultaoficialbr.com/api/consulta-cpf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": "https://v4.consultaoficialbr.com",
        "Referer": "https://v4.consultaoficialbr.com/",
        "User-Agent": "Mozilla/5.0"
      },
      body: JSON.stringify({ cpf })
    });

    const text = await upstreamRes.text();
    // try parse JSON, otherwise keep raw text
    let upstreamJson = null;
    try {
      upstreamJson = JSON.parse(text);
    } catch (e) {
      // upstream didn't return JSON
      console.error("Upstream non-JSON response:", text);
    }

    // If upstream indicates failure, forward meaningful error
    if (!upstreamJson) {
      // Respond with upstream raw text but as JSON for client
      return res.status(502).json({ success: false, error: "Upstream returned non-JSON", raw: text });
    }

    // If upstream reported success:false, forward readable error
    if (upstreamJson.success === false) {
      return res.status(502).json({ success: false, error: upstreamJson.error || "Upstream error", upstream: upstreamJson });
    }

    // Normalize keys (handle uppercase keys like NOME, CPF, NASC, NOME_MAE)
    const responseData = normalizeUpstream(upstreamJson.data || upstreamJson);

    // Build formattedResponse as you specified
    const formattedResponse = {
      data: {
        DADOS_PESSOAIS: {
          PRIMEIRO_NOME: (responseData.nome || "").split(" ")[0] || "",
          NOME: responseData.nome || "",
          NOME_MAE: responseData.nome_mae || "",
          NOME_PAI: "", // not provided by upstream
          CPF: formatCPF(responseData.cpf || responseData.CPF || responseData.cpf_formatted || ""),
          SEXO: responseData.sexo || "",
          RENDA: "",
          RG: "",
          DATA_NASCIMENTO: responseData.nasc || responseData.nascimento || responseData.nascimento || responseData.data_nasc || responseData.nasc || ""
        },
        TELEFONES: [],
        ENDERECOS: [],
        PARENTES: []
      }
    };

    // Return the formatted object
    res.status(200).json(formattedResponse);

  } catch (err) {
    console.error("Proxy/error:", err);
    res.status(500).json({ success: false, error: "Internal proxy error", detail: String(err) });
  }
}