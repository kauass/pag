# Pack Eletrofunk GYN — página de vendas

Landing page estática (HTML/CSS/JS puro, sem build) para o Pack Eletrofunk GYN 2026 + Curso FL Studio Mobile.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | A página de vendas completa |
| `termos.html` | Termos de uso, licença dos samples e política de reembolso |
| `vercel.json` | Configuração de deploy (URLs limpas + headers de segurança) |

## Rodar localmente

```bash
npx serve .
# abre em http://localhost:3000
```

## Deploy na Vercel

**Opção A — pelo site (mais fácil):**
1. Acesse https://vercel.com/new
2. Importe o repositório `kauass/pag`
3. Framework Preset: **Other** · Build Command: *(vazio)* · Output Directory: *(vazio)*
4. Deploy. Todo `git push` na `main` publica automaticamente.

**Opção B — pelo terminal:**
```bash
npm i -g vercel
vercel login
vercel --prod
```

## ⚠️ Antes de anunciar

1. **Domínio** — trocar `https://eletrofunk-gyn.vercel.app/` nas tags `canonical`, Open Graph e JSON-LD pelo domínio final.
2. **Imagem social (`og.png`)** — criar uma imagem 1200×630 e colocar na raiz do projeto. Sem ela, o link compartilhado no WhatsApp/Instagram aparece sem prévia.
3. **Números do curso** — os totais (120+ samples, 1h51, contagens por pasta) e o valor somado de R$ 341 precisam bater com o produto real.

Não há WhatsApp nem e-mail de contato na página: todo o suporte é direcionado para a resposta ao e-mail de confirmação da compra. Se quiser adicionar um canal depois, é só me pedir.

Não há seção de depoimentos. Quando tiver depoimentos **reais** de alunos, dá pra incluir — depoimento inventado é propaganda enganosa (CDC art. 37) e derruba conta de anúncio no Meta e no Google.

## Analytics

Os botões de compra já disparam eventos. Basta colar o script do GA4 e/ou do Meta Pixel no `<head>` — o código detecta `gtag` e `fbq` sozinho e envia:
- GA4: evento `click_cta` com o parâmetro `cta_location` (`header`, `hero`, `pricing`, `sticky`, `final`)
- Meta Pixel: `InitiateCheckout` com valor R$ 45

## Checkout

O botão principal aponta para o checkout da Kiwify:
`https://pay.kiwify.com.br/a0GKsLJ`

A Kiwify cuida da cobrança, da hospedagem do pack, da área de membros e do
e-mail de liberação — não há nada de entrega para configurar neste projeto.

Os demais botões da página ("Quero o pack", "Garantir meu acesso", a barra fixa
do celular) levam para a âncora `#preco`, para o visitante ver a oferta antes de
ir ao checkout. Só o botão dentro do bloco de preço vai direto para a Kiwify.

Para rastrear as vendas na Utmify, ligue a integração no painel da Kiwify
(Apps/Integrações → Utmify). É colar o token lá; não precisa de código no site.
