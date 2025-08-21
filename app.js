/* global window, document, supabase */
(() => {
  const env = window.APP_ENV || {};
  // Cliente Supabase global
  window.sb = window.sb || supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const sb = window.sb;

  // Política de sessão: recarregar mantém login; fechar aba/janela desloga
  const RELOAD_FLAG = "aga_reload_flag";
  window.addEventListener("beforeunload", () => {
    try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch {}
  });
  (async () => {
    try {
      const navType = (performance.getEntriesByType?.("navigation")?.[0]?.type) || "";
      const isReload = sessionStorage.getItem(RELOAD_FLAG) === "1" || navType === "reload";
      sessionStorage.removeItem(RELOAD_FLAG);

      const { data: { session } } = await sb.auth.getSession();

      const path = location.pathname.replace(/\/+/g,'/');
      const onIndex = /\/index\.html$|\/$/.test(path);
      const onHome = /\/home\.html$/.test(path);

      if (onIndex) {
        wireLogin(sb);
      } else if (onHome) {
        if (!session) { location.href = "/index.html"; return; }
        wireHome(sb);
      }

      if (!isReload && onIndex) {
        await sb.auth.signOut();
      }
    } catch (e) {
      console.warn("Init falhou:", e);
    }
  })();
})();

function esc(s){ return (s??""+"").toString().replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

async function wireLogin(sb){
  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const remember = document.getElementById("remember");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Entrando...";
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });
      if (error) throw error;
      await sb.auth.setSession(data.session);
      if (!remember.checked) {
        // sessão de aba; navegadores já limpam ao fechar
      }
      location.href = "/home.html";
    } catch (err) {
      console.warn(err);
      msg.textContent = "Falha no login.";
    }
  });

// removido
  const rmsg = document.getElementById("register-msg");
  rform?.addEventListener("submit", async (e) => {
    e.preventDefault();
    rmsg.textContent = "Registrando...";
    try {
      const name = document.getElementById("name").value.trim();
      const regEmail = document.getElementById("reg-email").value.trim();
      const { error } = await sb.auth.signUp({ email: regEmail, password: crypto.randomUUID(), options: { data: { name } } });
      if (error) throw error;
      rmsg.textContent = "Registro iniciado. Verifique seu e-mail.";
    } catch (err) {
      console.warn(err);
      rmsg.textContent = "Falha no registro.";
    }
  });
}

async function wireHome(sb){
  try {
    const { data } = await sb.auth.getUser();
    const name = data?.user?.user_metadata?.name || data?.user?.email || "Usuário";
    const hello = document.getElementById("hello"); if (hello) hello.textContent = `Olá, ${name}!`;
  } catch {}

  document.getElementById("logout")?.addEventListener("click", async () => {
    await sb.auth.signOut(); location.href = "/index.html";
  });

  const form = document.getElementById("search-nup-form"); if (!form) return;
  const input = document.getElementById("search-nup");
  const msg = document.getElementById("search-nup-msg");
  const result = document.getElementById("search-nup-result");

  const render = (rows) => {
    if (!rows?.length) { result.innerHTML = ""; return; }
    result.innerHTML = rows.map(r => (
      `<div class="status"><strong>${esc(r.nup||"")}</strong> — ${esc(r.status||"")} ${r.tipo?`(${esc(r.tipo)})`:""}</div>`
    )).join("");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const term = input.value.trim();
    render([]);
    if (!term){ msg.textContent = "Informe um NUP para buscar."; return; }
    msg.textContent = "Buscando...";
    try {
      const { data, error } = await sb
        .from("processos")
        .select("nup, tipo, status, entrada_regional")
        .ilike("nup", `%${term}%`)
        .limit(20);
      if (error) throw error;
      msg.textContent = data?.length ? `Encontrados ${data.length} registro(s).` : "Nenhum registro encontrado.";
      render(data||[]);
    } catch (err) {
      console.warn("Busca por NUP falhou:", err);
      msg.textContent = "Não foi possível buscar agora. Verifique a existência da tabela, políticas RLS e credenciais.";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const el = document.getElementById("build-info"); if (!el) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const version = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())}`;
    const build = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    el.textContent = `Portal DO-AGA - Versão ${version} - Build ${build}`;
  } catch (e) { console.warn("Footer build falhou:", e); }
});
