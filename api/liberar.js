/**
 * Valida uma compra na API da Kiwify e devolve os links do pack.
 *
 * POST /api/liberar  { "email": "comprador@exemplo.com" }
 *   200 -> { ok: true, arquivos: [{ nome, url }] }
 *   404 -> { ok: false, erro: "..." }
 *
 * Variaveis de ambiente (painel da Vercel, Settings > Environment Variables):
 *   KIWIFY_CLIENT_ID       credenciais da API (Kiwify > Apps > API)
 *   KIWIFY_CLIENT_SECRET
 *   KIWIFY_ACCOUNT_ID      id da conta, vai no header x-kiwify-account-id
 *   KIWIFY_PRODUCT_ID      id do produto do pack
 *   PACK_LINKS             JSON: [{"nome":"01 - Kits","url":"https://..."}]
 *
 * Nenhuma delas aparece no HTML: o navegador so recebe os links, e so
 * depois da compra ser confirmada.
 */

const API = "https://public-api.kiwify.com/v1";
const STATUS_VALIDOS = ["paid", "approved", "authorized"];
const JANELA_DIAS = 89; // a API limita o intervalo a 90 dias
const JANELAS = 5; // ~15 meses de historico
const MAX_PAGINAS = 10;

// O token dura 24h; guardamos entre invocacoes enquanto a funcao ficar quente.
let tokenCache = { valor: null, expiraEm: 0 };

// Freio simples de forca bruta. E por instancia e some quando a funcao
// esfria, entao nao e seguranca de verdade - so atrapalha tentativa em massa.
const tentativas = new Map();

function limitar(ip) {
  const agora = Date.now();
  const reg = tentativas.get(ip);
  if (!reg || agora > reg.zeraEm) {
    tentativas.set(ip, { n: 1, zeraEm: agora + 10 * 60 * 1000 });
    return true;
  }
  reg.n += 1;
  return reg.n <= 20;
}

async function pegarToken() {
  if (tokenCache.valor && Date.now() < tokenCache.expiraEm) return tokenCache.valor;

  const corpo = new URLSearchParams({
    client_id: process.env.KIWIFY_CLIENT_ID,
    client_secret: process.env.KIWIFY_CLIENT_SECRET,
  });
  const r = await fetch(API + "/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: corpo,
  });
  if (!r.ok) throw new Error("oauth " + r.status);

  const j = await r.json();
  tokenCache = {
    valor: j.access_token,
    // renova com folga de 5 minutos
    expiraEm: Date.now() + (Number(j.expires_in || 86400) - 300) * 1000,
  };
  return tokenCache.valor;
}

function data(d) {
  return d.toISOString().slice(0, 10);
}

/* A API ainda esta em evolucao e ja mudou de formato; procuramos o e-mail
   e o produto nos caminhos mais provaveis em vez de fixar um so. */
function emailDa(venda) {
  return (
    venda?.customer?.email ||
    venda?.Customer?.email ||
    venda?.customer_email ||
    ""
  ).toLowerCase().trim();
}

function produtoDa(venda) {
  return venda?.product?.id || venda?.product_id || venda?.Product?.id || "";
}

function statusDa(venda) {
  return String(venda?.status || "").toLowerCase();
}

async function procurarCompra(email) {
  const token = await pegarToken();
  const cabecalho = {
    Authorization: "Bearer " + token,
    "x-kiwify-account-id": process.env.KIWIFY_ACCOUNT_ID,
  };
  const produtoEsperado = process.env.KIWIFY_PRODUCT_ID;

  let fim = new Date();
  for (let janela = 0; janela < JANELAS; janela++) {
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - JANELA_DIAS);

    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const q = new URLSearchParams({
        start_date: data(inicio),
        end_date: data(fim),
        page_size: "100",
        page_number: String(pagina),
        view_full_sale_details: "true",
      });
      if (produtoEsperado) q.set("product_id", produtoEsperado);

      const r = await fetch(API + "/sales?" + q, { headers: cabecalho });
      if (!r.ok) throw new Error("sales " + r.status);

      const j = await r.json();
      const vendas = j.data || [];

      for (const venda of vendas) {
        if (emailDa(venda) !== email) continue;
        if (!STATUS_VALIDOS.includes(statusDa(venda))) continue;
        if (produtoEsperado && produtoDa(venda) && produtoDa(venda) !== produtoEsperado) continue;
        return venda;
      }

      if (vendas.length < 100) break; // ultima pagina desta janela
    }

    fim = new Date(inicio);
  }
  return null;
}

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, erro: "Metodo nao permitido." });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "desconhecido";
  if (!limitar(ip)) {
    return res
      .status(429)
      .json({ ok: false, erro: "Muitas tentativas. Espere alguns minutos." });
  }

  let email = "";
  try {
    const corpo = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    email = String(corpo.email || "").toLowerCase().trim();
  } catch (e) {
    return res.status(400).json({ ok: false, erro: "Requisicao invalida." });
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ ok: false, erro: "Digite um e-mail valido." });
  }

  let arquivos;
  try {
    arquivos = JSON.parse(process.env.PACK_LINKS || "[]");
  } catch (e) {
    arquivos = [];
  }
  if (!arquivos.length) {
    console.error("PACK_LINKS vazio ou invalido");
    return res
      .status(500)
      .json({ ok: false, erro: "Entrega nao configurada. Fale com o suporte." });
  }

  try {
    const venda = await procurarCompra(email);
    if (!venda) {
      return res.status(404).json({
        ok: false,
        erro:
          "Nao encontramos uma compra aprovada com esse e-mail. " +
          "Use o mesmo e-mail que voce digitou no checkout. " +
          "Se pagou por boleto, a liberacao pode levar ate 2 dias uteis.",
      });
    }

    // Nada de cache: a resposta carrega os links do produto.
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, arquivos });
  } catch (erro) {
    console.error("falha ao consultar a Kiwify:", erro.message);
    return res.status(502).json({
      ok: false,
      erro: "Nao conseguimos confirmar sua compra agora. Tente de novo em instantes.",
    });
  }
};
