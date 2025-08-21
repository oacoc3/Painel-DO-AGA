# Painel DO-AGA (reinício do zero) — v2

SPA estática (HTML/CSS/JS) + Supabase (auth + dados).

## Como usar
1) Edite `index.html` e `home.html` para colocar suas credenciais do Supabase em `window.APP_ENV`.
2) No Supabase (SQL Editor), rode em ordem:
   - `(seu script de schema da tabela `processos` com os 14 status)` (usa os 14 status que você definiu)
   - (Opcional) adicione políticas extras; por padrão, o front exige autenticação.
3) Abra `index.html`, faça login e acesse `home.html` para usar a busca por NUP.
