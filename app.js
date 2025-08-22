/* app.js — SPA com roteamento por hash (#/login, #/home), guardas Supabase
   Mantém o mesmo layout e CSS; reaproveita os IDs e marcações originais. */
(function () {
  const env = (window.APP_ENV || {});
  if (!window.supabase) { console.error("Biblioteca @supabase/supabase-js não carregada."); return; }
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) { console.error("Credenciais do Supabase ausentes em window.APP_ENV."); return; }

  // Cliente Supabase compartilhado
  window.sb = window.sb || supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const sb = window.sb;
  // Gerenciar fonte Inter como no projeto original:
  // - home.html carregava o Google Fonts; index.html não.
  function ensureInterFont(shouldHave) {
    const id = "gf-inter";
    const existing = document.getElementById(id);
    if (shouldHave) {
      if (!existing) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
        document.head.appendChild(link);
      }
    } else {
      if (existing) existing.remove();
    }
  }


  // Utilitário: definir info de build
  function setBuildInfo() {
    try {
      const el = document.getElementById("build-info");
      if (el) {
        const now = new Date();
        const ts = now.toISOString().slice(0,19).replace('T',' ');
        el.textContent = `Build AGA • ${ts}`;
      }
    } catch (_) {}
  }

  // Util: helper para (re)adicionar event listener sem duplicar
  function replaceAndBind(el, type, handler) {
    if (!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener(type, handler);
    return clone;
  }

  // Views
  var $loginView = function(){ return document.getElementById("view-login"); };
  var $homeView  = function(){ return document.getElementById("view-home"); };
  var $body = function(){ return document.body; };

  async function getUser() {
    try {
      const { data: { user } } = await sb.auth.getUser();
      return user || null;
    } catch { return null; }
  }

  // Guardas de rota + renderização
  async function render(route) {
    setBuildInfo();

    // Normalizar rota
    route = route || (location.hash.replace(/^#/, '') || '/login');
    if (route !== '/login' && route !== '/home') {
      route = '/login';
    }

    const user = await getUser();

    // Guardas
    if (route === '/home' && !user) {
      route = '/login';
      location.hash = '#/login';
    }
    if (route === '/login' && user) {
      route = '/home';
      location.hash = '#/home';
    }

    // Visibility das views
    const show = (v) => v.style.display = '';
    const hide = (v) => v.style.display = 'none';
    if (route === '/login') {
      ensureInterFont(false);
      show($loginView()); hide($homeView());
      $body().className = 'login-page';    // manter classe original da página de login
      mountLogin();
    } else {
      ensureInterFont(true);
      show($homeView()); hide($loginView());
      $body().className = 'shell';         // manter classe original da home
      mountHome(user);
    }
    document.body.setAttribute('data-route', route);
  }

  // Montagem da view de login (eventos)
  function mountLogin() {
    const hello = document.getElementById("hello");
    if (hello) hello.textContent = "";

    const form = document.getElementById("login-form");
    if (!form) return;

    // Importante: não capturar referências internas ANTES do clone
    replaceAndBind(form, "submit", async (e) => {
      e.preventDefault();
      const formEl = e.currentTarget || document.getElementById("login-form");
      const email = formEl ? formEl.querySelector("#email") : document.getElementById("email");
      const password = formEl ? formEl.querySelector("#password") : document.getElementById("password");
      const msg = formEl ? formEl.querySelector("#login-msg") : document.getElementById("login-msg");

      if (msg) msg.textContent = "";
      const mail = ((email && email.value) || "").trim();
      const pass = ((password && password.value) || "").trim();
      if (!mail || !pass) {
        if (msg) msg.textContent = "Informe e-mail e senha.";
        return;
      }
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email: mail, password: pass });
        if (error) throw error;
        location.hash = '#/home';
      } catch (err) {
        console.error("Falha no login:", err);
        if (msg) msg.textContent = "Falha no login. Verifique suas credenciais.";
      }
    });
  }

  // Montagem da view home (saudação, logout, busca NUP)
  function mountHome(user) {
    const hello = document.getElementById("hello");
    if (hello) {
      if (user) hello.textContent = `Autenticado como ${user.email}`;
      else hello.textContent = "";
    }

    const btnLogout = document.getElementById("logout");
    if (btnLogout) {
      replaceAndBind(btnLogout, "click", async () => {
        try { await sb.auth.signOut(); } catch(_) {}
        try { sessionStorage.clear(); } catch(_) {}
        location.hash = '#/login';
      });
    }

    // Busca por NUP (tabela 'processos')
    const searchForm = document.getElementById("search-nup-form");
    if (!searchForm) return;

    const el = (tag, className, text) => {
      const x = document.createElement(tag);
      if (className) x.className = className;
      if (text != null) x.textContent = text;
      return x;
    };

    function renderRows(data) {
      const resultBox = document.getElementById("search-nup-result");
      if (!resultBox) return;
      resultBox.innerHTML = "";
      data.forEach(row => {
        const card = el("div", "vstack gap");
        const head = el("div", "row-between");
        head.appendChild(el("strong", "", `${row.nup||"-"}`));
        head.appendChild(el("span", "status", row.status || "-"));
        const meta = document.createElement("div");
        meta.className = "muted";
        meta.innerHTML = [
          `<b>Tipo:</b> ${row.tipo||"-"}`,
          `<b>1ª Entrada no Regional:</b> ${row.entrada_regional||"-"}`
        ].join(" &nbsp;•&nbsp; ");
        card.appendChild(head);
        card.appendChild(meta);
        resultBox.appendChild(card);
        resultBox.appendChild(el("hr", ""));
      });
    }

    async function fetchAllTramitando() {
      const msg = document.getElementById("search-nup-msg");
      const resultBox = document.getElementById("search-nup-result");
      if (msg) msg.textContent = "";
      if (resultBox) resultBox.innerHTML = "";
      try {
        const { data, error } = await sb
          .from("processos").select("*")
          .neq("status", "Concluído")
          .limit(200);
        if (error) throw error;
        if (!data || data.length === 0) {
          if (msg) msg.textContent = "Nenhum processo tramitando no momento.";
          return;
        }
        renderRows(data);
      } catch (err) {
        console.error("Erro ao carregar processos tramitando:", err);
        const msg2 = document.getElementById("search-nup-msg");
        if (msg2) msg2.textContent = "Erro ao listar processos. Verifique sua conexão/políticas do banco.";
      }
    }

    async function runSearch(q) {
      const msg = document.getElementById("search-nup-msg");
      const resultBox = document.getElementById("search-nup-result");
      if (msg) msg.textContent = "";
      if (resultBox) resultBox.innerHTML = "";

      try {
        const { data, error } = await sb
          .from("processos").select("*")
          .ilike("nup", `%${q}%`)
          .limit(200);
        if (error) throw error;
        if (!data || data.length === 0) {
          if (msg) msg.textContent = "Nenhum processo encontrado para o NUP informado.";
          return;
        }
        renderRows(data);
      } catch (err) {
        console.error("Erro na busca:", err);
        const msg2 = document.getElementById("search-nup-msg");
        if (msg2) msg2.textContent = "Erro ao buscar. Verifique sua conexão/políticas do banco.";
      }
    }

    // Submit de busca
    replaceAndBind(searchForm, "submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("search-nup");
      const q = ((input && input.value) || "").trim();
      if (!q) {
        await fetchAllTramitando();
        return;
      }
      await runSearch(q);
    });
    // Botão Limpar (bind após o clone do form)
    {
      const clearBtn = document.getElementById("clear-search");
      if (clearBtn) {
        replaceAndBind(clearBtn, "click", async () => {
          const input = document.getElementById("search-nup");
          const msg = document.getElementById("search-nup-msg");
          if (input) input.value = "";
          if (msg) msg.textContent = "";
          await fetchAllTramitando();
          if (input) input.focus();
        });
      }
    }


    // Auto-carregar 'tramitando' se não houver termo na chegada na home
    const initialQ = (function(){var __el=document.getElementById("search-nup"); return ((__el && __el.value) || "").trim();})();
    if (initialQ) runSearch(initialQ);
    else fetchAllTramitando();
  }

  // Roteamento por hash
  window.addEventListener("hashchange", function(){ render(location.hash.replace(/^#/, '')); });

  // Estado inicial: decide rota por sessão
  document.addEventListener("DOMContentLoaded", async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!location.hash) {
      location.hash = user ? '#/home' : '#/login';
    } else {
      ensureInterFont(true);
      render(location.hash.replace(/^#/, ''));
    }
  });
})();
