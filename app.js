/* app.js — login + busca NUP (Supabase); sem mudanças visuais */
(function () {
  const env = (window.APP_ENV || {});
  if (!window.supabase) {
    console.error("Biblioteca @supabase/supabase-js não carregada.");
    return;
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error("Credenciais do Supabase ausentes em window.APP_ENV.");
    return;
  }
  // Cliente compartilhado
  window.sb = window.sb || supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const sb = window.sb;

  function setBuildInfo() {
    const el = document.getElementById("build-info");
    if (!el) return;
    // Pequeno carimbo para depuração
    const dt = new Date();
    const stamp = dt.toISOString().replace('T',' ').substring(0,19);
    el.textContent = `build ${stamp}`;
  }

  // Aux: cria um elemento com classes
  function el(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html != null) e.innerHTML = html;
    return e;
  }

  document.addEventListener("DOMContentLoaded", () => {
    setBuildInfo();

    // Estado de sessão (saudação + proteção da home)
    (async () => {
      try {
        const { data: { user } } = await sb.auth.getUser();
        const hello = document.getElementById("hello");
        if (hello) {
          if (user) hello.textContent = `Autenticado como ${user.email}`;
          else hello.textContent = "";
        }
        // Se estiver na tela de login e já autenticado, siga para home
        if (document.getElementById("login-form") && user) {
          window.location.href = "home.html";
          return;
        }
        // Se a página tem recursos de home (busca/saída) e não há usuário, volte ao login
        if ((document.getElementById("search-nup-form") || document.getElementById("logout")) && !user) {
          window.location.href = "index.html";
          return;
        }
      } catch (_) { /* ignore */ }
    })();

    // Sair
    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
      btnLogout.addEventListener("click", async () => {
        try { await sb.auth.signOut(); } catch (_) {}
        try { sessionStorage.clear(); } catch (_) {}
        window.location.href = "index.html";
      });
    }

    // Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const msg = document.getElementById("login-msg");
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const mail = (email?.value || "").trim();
        const pass = (password?.value || "");
        if (!mail || !pass) {
          if (msg) msg.textContent = "Informe e-mail e senha.";
          return;
        }
        if (msg) msg.textContent = "Entrando...";
        try {
          const { error } = await sb.auth.signInWithPassword({ email: mail, password: pass });
          if (error) throw error;
          window.location.href = "home.html";
        } catch (err) {
          console.warn("Falha no login:", err);
          if (msg) msg.textContent = "Falha no login. Verifique suas credenciais.";
        }
      });
    }

    // Buscar NUP
    const searchForm = document.getElementById("search-nup-form");
    if (searchForm) {
      const input = document.getElementById("search-nup");
      const msg = document.getElementById("search-nup-msg");
      const resultBox = document.getElementById("search-nup-result");

      async function runSearch(q) {
        resultBox.innerHTML = "";
        if (msg) msg.textContent = "Buscando...";
        try {
          // Consulta com filtro parcial (ILIKE) e limite para evitar sobrecarga
          const { data, error } = await sb
            .from("processos")
            .select("nup,tipo,entrada_regional,status")
            .ilike("nup", `%${q}%`)
            .order("nup", { ascending: false })
            .limit(50);

          if (error) throw error;

          if (!data || data.length === 0) {
            if (msg) msg.textContent = "Nenhum processo encontrado.";
            return;
          }
          if (msg) msg.textContent = `${data.length} registro(s) encontrado(s).`;

          // Renderização simples (sem alterar estilos existentes)
          data.forEach(row => {
            const card = el("div", "vstack gap");
            const head = el("div", "row-between");
            head.appendChild(el("strong", "", `${row.nup||"-"}`));
            head.appendChild(el("span", "status", row.status || "-"));
            const meta = el("div", "muted");
            const fmt = (d) => d ? new Date(d).toLocaleString() : "-";
            meta.innerHTML = [
              `<b>Tipo:</b> ${row.tipo||"-"}`,
              `<b>Entrada/Regional:</b> ${row.entrada_regional||"-"}`,
             ].join(" &nbsp;•&nbsp; ");
            card.appendChild(head);
            card.appendChild(meta);
            resultBox.appendChild(card);
            // separador sutil
            resultBox.appendChild(el("hr", ""));
          });
        } catch (err) {
          console.error("Erro na busca:", err);
          if (msg) msg.textContent = "Erro ao buscar. Verifique sua conexão/políticas do banco.";
        }
      }

      searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = (input?.value || "").trim();
        if (!q) {
          if (msg) msg.textContent = "Informe um NUP (completo ou parcial).";
          return;
        }
        await runSearch(q);
      });
    }
  });
})();
