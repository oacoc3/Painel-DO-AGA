/* app.js — login funcional com Supabase; sem auto-registro; sem mudanças visuais */
(function(){
  const env = (window.APP_ENV||{});
  if (!window.supabase) {
    console.error("Biblioteca @supabase/supabase-js não carregada.");
    return;
  }
  window.sb = window.sb || supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  const sb = window.sb;

  document.addEventListener("DOMContentLoaded", () => {
    // Footer versão/build (mantém comportamento existente se houver #build-info)
    try {
      const el = document.getElementById("build-info");
      if (el) {
        const now = new Date();
        const pad = n => String(n).padStart(2,"0");
        const version = `${now.getFullYear()}.${pad(now.getMonth()+1)}.${pad(now.getDate())}`;
        const build = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        el.textContent = `Portal DO-AGA - Versão ${version} - Build ${build}`;
      }
    } catch(e){}

    const form = document.getElementById("login-form");
    if (!form) return; // página não é de login

    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const msg = document.getElementById("login-msg");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const mail = (email?.value||"").trim();
      const pass = password?.value||"";
      if (!mail || !pass) {
        if (msg) msg.textContent = "Informe e-mail e senha.";
        return;
      }
      if (msg) msg.textContent = "Entrando...";
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email: mail, password: pass });
        if (error) throw error;
        // sessão criada; redireciona para home
        window.location.href = "home.html";
      } catch (err) {
        console.warn("Falha no login:", err);
        if (msg) msg.textContent = "Falha no login. Verifique suas credenciais.";
      }
    });
  });
})();