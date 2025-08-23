
# Painel DO-AGA — SPA (Single-Page Application)

Esta versão converte o projeto para **SPA de página única**, mantendo **o mesmo layout e o mesmo CSS**.
O roteamento é feito no **hash da URL** (`#/login` e `#/home`) com **guardas de rota** baseadas na autenticação do Supabase.

## Estrutura
- `index.html`: única página, contém as duas *views* (`#view-login` e `#view-home`).
- `app.js`: roteador por hash, integração com Supabase, login/logout, busca de NUP.
- `style.css`: ajustes menores de formatação.
- `README.md`: este arquivo.

## Rotas
- `#/login`: mostra o formulário de login.
- `#/home`: mostra a home com saudação, botão de sair e busca por NUP.
  - Se o usuário **não** estiver autenticado, é redirecionado para `#/login`.
  - Se o usuário **já** estiver autenticado, `#/login` redireciona para `#/home`.

## Como usar
1. Abra `index.html` em um servidor estático (ou direto no navegador).
2. Faça login com e-mail/senha do Supabase.
3. Use a rota `#/home` para buscar NUPs (tabela `processos`).
4. Clique em **Sair** para retornar a `#/login`.

## Observações
- **CSS e HTML de cada view** foram preservados a partir dos arquivos originais (sem alterações visuais).
- As credenciais de `window.APP_ENV` continuam no `index.html`.
- A biblioteca `@supabase/supabase-js@2` está incluída via CDN, como no original.
