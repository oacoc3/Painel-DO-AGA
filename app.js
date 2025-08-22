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
        const build = env.BUILD_ID || "dev";
        const ts = (env.BUILD_TIME || new Date().toISOString())
          .slice(0, 19)
          .replace("T", " ");
        el.textContent = `Build ${build} • ${ts}`;
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
      await mountHome(user);
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
  async function mountHome(user) {
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

    // Carregar catálogo de status para mapear nome → id
    let statusMap = {};
    try {
      const { data, error } = await sb.from("status_catalog").select("id, name");
      if (error) throw error;
      // Usa nomes normalizados em minúsculas para evitar problemas de
      // correspondência com acentuação ou capitalização nos botões da UI
      statusMap = Object.fromEntries(
        (data || []).map(s => [String(s.name).toLowerCase(), s.id])
      );
    } catch (err) {
      console.error("Erro ao carregar catálogo de status:", err);
    }

     // Busca por NUP (tabela 'processos')
    const searchForm = document.getElementById("search-nup-form");
    if (!searchForm) return;

    // Processo atualmente selecionado (id + nup)
    let selectedProcess = null;

    // Botões de alteração de status
    let statusButtons = Array.from(document.querySelectorAll(".process-actions .btn"));
    function updateStatusButtons(currentStatus) {
      const cs = currentStatus ? currentStatus.toLowerCase() : null;
       statusButtons.forEach(btn => {
        const st = (btn.dataset.status || "").toLowerCase();
        if (!cs || st === cs) {
          btn.disabled = true;
          btn.classList.remove("primary");
        } else {
          btn.disabled = false;
          btn.classList.add("primary");
        }
      });
    }
    // Bind dos botões para efetuar mudança de status
    statusButtons = statusButtons.map(btn =>
      replaceAndBind(btn, "click", async e => {
        if (!selectedProcess) return;
        const newStatus = (e.currentTarget.dataset.status || "").trim();
        const statusId = statusMap[newStatus.toLowerCase()];
        try {
          const key = selectedProcess.id != null
            ? { column: "id", value: selectedProcess.id }
            : { column: "nup", value: selectedProcess.nup };

          const { error } = await sb
            .from("processos")
             .update({ status_id: statusId })
            .eq(key.column, key.value);
          if (error) throw error;

          // Registrar no histórico do processo
          try {
            if (selectedProcess.id != null) {
              await sb.from("processos_historico").insert({
                processo_id: selectedProcess.id,
                status_id: statusId,
                 // Tabela exige registro do NUP do processo no histórico
                nup: selectedProcess.nup,
                // 'changed_by' referencia a coluna 'auth.users.id' (UUID). Passar o
                // e-mail causava erro de conversão. Utilizamos sempre o ID do usuário.
                changed_by: (user && user.id) || null,
              });
            }
          } catch (errHist) {
            console.error("Erro ao registrar histórico:", errHist);
          }

           // Recarregar lista e histórico
          const rows = await runSearch(selectedProcess.nup);
          const current =
            (rows && rows[0] && rows[0].status) || newStatus;
          updateStatusButtons(current);
          if (selectedProcess.id != null) loadHistory(selectedProcess.id);
        } catch (err) {
          console.error("Erro ao atualizar status:", err);
        }
      })
    );
    updateStatusButtons(null);

    const el = (tag, className, text) => {
      const x = document.createElement(tag);
      if (className) x.className = className;
      if (text != null) x.textContent = text;
      return x;
    };

    const historySection = document.getElementById("history-section");
    const historyBox = document.getElementById("process-history");
    const historyMsg = document.getElementById("history-msg");

    async function loadHistory(id) {
      if (historySection) historySection.style.display = "block";
      if (historyBox) historyBox.innerHTML = "";
      if (historyMsg) historyMsg.textContent = "";
      try {
        const { data, error } = await sb
          .from("processos_historico")
          // utiliza created_at (timestamp automático do banco)
          .select("status:status_catalog!processos_historico_status_id_fkey(name), observacao, created_at, changed_by")
          .eq("processo_id", id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
          if (historyMsg) historyMsg.textContent = "Sem histórico.";
          return;
        }
        data.forEach(item => {
          const tr = document.createElement("tr");
           tr.appendChild(el("td", "", (item.status && item.status.name) || "-"));
          tr.appendChild(el("td", "", item.observacao || "-"));
          tr.appendChild(el("td", "", formatDateTime(item.created_at)));
          tr.appendChild(el("td", "", item.changed_by || "-"));
          historyBox.appendChild(tr);
        });
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        if (historyMsg) historyMsg.textContent = "Erro ao carregar histórico.";
      }
    }
     function formatDate(str) {
        if (!str) return "-";
        const d = new Date(str);
        if (isNaN(d)) return str;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
      }

      function formatDateTime(str) {
        if (!str) return "-";
        const d = new Date(str);
        if (isNaN(d)) return str;
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = String(d.getFullYear()).slice(-2);
        const hour = String(d.getHours()).padStart(2, "0");
        const minute = String(d.getMinutes()).padStart(2, "0");
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
     
      async function renderRows(data) {
        const resultBox = document.getElementById("search-nup-result");
        if (!resultBox) return;
        resultBox.innerHTML = "";
        updateStatusButtons(null);
        if (historySection) {
          historySection.style.display = "none";
          if (historyBox) historyBox.innerHTML = "";
          if (historyMsg) historyMsg.textContent = "";
        }
        for (const row of data) {
          let currentStatus = row.status || "-";
          let last = row.updated_at;
          try {
            const { data: hist } = await sb
              .from("processos_historico")
              .select("status:status_catalog(name), created_at")
              .eq("processo_id", row.id)
              .order("created_at", { ascending: false })
              .limit(1);
            if (hist && hist[0]) {
              currentStatus = (hist[0].status && hist[0].status.name) || currentStatus;
              last = hist[0].created_at || last;
            }
          } catch (err) {
            console.error("Erro ao obter status atual:", err);
          }
          const tr = document.createElement("tr");
          tr.appendChild(el("td", "", row.nup || "-"));
          tr.appendChild(el("td", "", row.tipo || "-"));
          tr.appendChild(el("td", "", formatDate(row.entrada_regional)));
          tr.appendChild(el("td", "status", currentStatus));
          tr.appendChild(el("td", "", formatDateTime(last)));
          tr.addEventListener("click", () => {
            const input = document.getElementById("search-nup");
            const nup = row.nup || "";
            const processId = row.id;
            selectedProcess = { id: processId, nup };
             if (input) input.value = nup;
            runSearch(nup).then(rows => {
              const cur = (rows && rows[0] && rows[0].status) || currentStatus;
              selectedProcess.status = cur;
              updateStatusButtons(cur);
              loadHistory(processId);
            });
          });
          resultBox.appendChild(tr);
        }
      }

    async function fetchAllTramitando() {
      const msg = document.getElementById("search-nup-msg");
      const resultBox = document.getElementById("search-nup-result");
      if (msg) msg.textContent = "";
      if (resultBox) resultBox.innerHTML = "";
      try {
        const concludedId = statusMap["Concluído"];
        let query = sb
          .from("processos")
         .select("id, nup, entrada_regional, updated_at, process_types(name), status_catalog(name)")
          .limit(200);
        if (concludedId !== undefined) {
          query = query.neq("status_id", concludedId);
        }
        const { data, error } = await query;
         if (error) throw error;
        const rows = (data || []).map(r => ({
          ...r,
          tipo: (r.process_types && r.process_types.name) || "",
          status: (r.status_catalog && r.status_catalog.name) || "",
        }));
        if (rows.length === 0) {
          if (msg) msg.textContent = "Nenhum processo tramitando no momento.";
          return;
        }
        await renderRows(rows);
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
          .from("processos")
          .select("id, nup, entrada_regional, updated_at, process_types(name), status_catalog(name)")
          .ilike("nup", `%${q}%`)
          .limit(200);
        if (error) throw error;
         const rows = (data || []).map(r => ({
          ...r,
          tipo: (r.process_types && r.process_types.name) || "",
          status: (r.status_catalog && r.status_catalog.name) || "",
        }));
        if (rows.length === 0) {
          await fetchAllTramitando();
          if (msg) msg.textContent = "Nenhum processo encontrado para o NUP informado.";
          return [];
        }
        await renderRows(rows);
        return rows;
      } catch (err) {
        console.error("Erro na busca:", err);
        const msg2 = document.getElementById("search-nup-msg");
        if (msg2) msg2.textContent = "Erro ao buscar. Verifique sua conexão/políticas do banco.";
        return [];
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
    setBuildInfo();
     const { data: { user } } = await sb.auth.getUser();
    if (!location.hash) {
      location.hash = user ? '#/home' : '#/login';
    } else {
      ensureInterFont(true);
      render(location.hash.replace(/^#/, ''));
    }
  });
})();
