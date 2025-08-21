// app.js (trecho relevante)
// Código de login mantido, registro removido

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const msg = document.getElementById("login-msg");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "Tentando login...";
      // Aqui ficaria a chamada ao Supabase para login
      // Exemplo: await sb.auth.signInWithPassword({ email, password })
    });
  }
});
