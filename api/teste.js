// pages/api/teste.js

// ✅ CORS liberado para qualquer domínio
function setCorsHeaders(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Se quiser permitir cookies/credenciais: res.setHeader("Access-Control-Allow-Credentials", "true");
}

// Format CPF like 000.000.000-00
function formatCPF(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// Normalize upstream response keys to lowercase
function normalizeUpstream(obj) {
  if (!obj || typeof obj !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

export default async function handler(req, res) {
  // ✅ Sem restrição de domínio
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    let cpf = "";
    if (req.method === "GET") {
      cpf = String(req.query.cpf || "").trim();
    } else if (req.method === "POST") {
      if (req.headers["content-type"]?.includes("application/json")) {
        cpf = (req.body?.cpf) ? String(req.body.cpf).trim() : "";
      } else {
        cpf = String(req.query.cpf || "").trim();
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!cpf) {
      return res.status(400).json({ error: "Missing cpf parameter" });
    }

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
    let upstreamJson = null;
    try {
      upstreamJson = JSON.parse(text);
    } catch (e) {
      console.error("Upstream non-JSON response:", text);
    }

    if (!upstreamJson) {
      return res.status(502).json({ success: false, error: "Upstream returned non-JSON", raw: text });
    }

    if (upstreamJson.success === false) {
      return res.status(502).json({ success: false, error: upstreamJson.error || "Upstream error", upstream: upstreamJson });
    }

    const responseData = normalizeUpstream(upstreamJson.data || upstreamJson);

    const formattedResponse = {
      data: {
        DADOS_PESSOAIS: {
          PRIMEIRO_NOME: (responseData.nome || "").split(" ")[0] || "",
          NOME: responseData.nome || "",
          NOME_MAE: responseData.nome_mae || "",
          NOME_PAI: "",
          CPF: formatCPF(responseData.cpf || responseData.CPF || responseData.cpf_formatted || ""),
          SEXO: responseData.sexo || "",
          RENDA: "",
          RG: "",
          DATA_NASCIMENTO: responseData.nasc || responseData.nascimento || responseData.data_nasc || ""
        },
        TELEFONES: [],
        ENDERECOS: [],
        PARENTES: []
      }
    };

    res.status(200).json(formattedResponse);

  } catch (err) {
    console.error("Proxy/error:", err);
    res.status(500).json({ success: false, error: "Internal proxy error", detail: String(err) });
  }
}
