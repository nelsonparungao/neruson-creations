/* ==========================================================================
   NERUSON CREATIONS — secret admin access
   Triple-clicking the "NERUSON CREATIONS" mark in the footer opens a
   username/password modal that authenticates against the site's real
   protection: HTTP Basic Auth, enforced by the Vercel Edge Middleware
   (middleware.js) in front of /admin.html and /api/*.

   Basic Auth needs an Authorization header, not a JSON POST, so this does
   two things a normal login form can't:
     1. Verifies the credentials itself with a fetch() carrying a manual
        "Authorization: Basic base64(user:pass)" header, so a wrong
        password shows an inline error in this modal instead of the
        browser's native auth popup.
     2. On success, redirects to admin.html with the credentials embedded
        in the URL (https://user:pass@host/admin.html). That's the one
        reliable way to make a browser cache Basic Auth credentials for
        the origin from a link/script instead of a native prompt — once
        cached, the browser resends them automatically to every /api/*
        call admin.js makes afterward, same as if you'd typed them into
        the browser's own dialog. location.replace() is used (not
        location.href) so the credential-bearing URL doesn't sit in
        browser history.
   ========================================================================== */

(function(){
  const CLICKS_NEEDED = 3;
  const CLICK_WINDOW_MS = 900; // max gap between clicks for them to count as one sequence

  function ready(fn){ document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn); }

  ready(() => {
    injectMarkup();
    wireBrandTrigger();

    const overlay = document.getElementById("adminLoginOverlay");
    const card = overlay.querySelector(".admin-login-card");
    const form = document.getElementById("adminLoginForm");
    const errorEl = document.getElementById("adminLoginError");
    const userInput = document.getElementById("adminLoginUser");
    const passInput = document.getElementById("adminLoginPassword");
    const submitBtn = form.querySelector(".admin-login-submit");

    function openModal(){
      overlay.classList.add("open");
      errorEl.textContent = "";
      form.reset();
      document.addEventListener("keydown", onKey);
      setTimeout(() => userInput.focus(), 150);
    }
    function closeModal(){
      overlay.classList.remove("open");
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e){ if(e.key === "Escape") closeModal(); }
    window.__openAdminLogin = openModal;

    document.getElementById("adminLoginClose").addEventListener("click", closeModal);
    document.getElementById("adminLoginCancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if(e.target === overlay) closeModal(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = userInput.value;
      const pass = passInput.value;
      if(!user || !pass) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Checking…";
      errorEl.textContent = "";

      try{
        // Ask for admin.html with the credentials attached by hand. If
        // they're right the middleware returns the page (200); if not,
        // it returns 401 — either way no native browser prompt appears,
        // because we supplied an Authorization header ourselves.
        const res = await fetch("/admin.html", {
          headers: { Authorization: "Basic " + b64(user + ":" + pass) },
          cache: "no-store"
        });

        if(res.ok){
          // Hand off to the browser's own Basic Auth cache so every
          // request admin.js makes afterward (including /api/*) is
          // authenticated automatically, exactly like a native login.
          const dest = `${location.protocol}//${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${location.host}/admin.html`;
          window.location.replace(dest);
          return;
        }

        errorEl.textContent = (res.status === 401 || res.status === 403)
          ? "Incorrect username or password."
          : "Something went wrong — try again.";
      }catch(err){
        errorEl.textContent = "Couldn't reach the server — check your connection.";
      }

      card.classList.remove("shake");
      void card.offsetWidth; // restart the animation
      card.classList.add("shake");
      submitBtn.disabled = false;
      submitBtn.textContent = "Enter";
      passInput.value = "";
      passInput.focus();
    });
  });

  // Three clicks on the footer's "NERUSON CREATIONS" mark, each within
  // CLICK_WINDOW_MS of the last, opens the login modal. Any pause longer
  // than that resets the count, so idly clicking around doesn't trigger it.
  function wireBrandTrigger(){
    const mark = document.querySelector("footer .foot-mark");
    if(!mark) return;
    let count = 0;
    let lastClick = 0;
    mark.addEventListener("click", () => {
      const now = Date.now();
      count = (now - lastClick > CLICK_WINDOW_MS) ? 1 : count + 1;
      lastClick = now;
      if(count >= CLICKS_NEEDED){
        count = 0;
        window.__openAdminLogin && window.__openAdminLogin();
      }
    });
  }

  function b64(str){
    // btoa only handles Latin1; this keeps usernames/passwords with
    // non-ASCII characters from silently corrupting.
    return btoa(unescape(encodeURIComponent(str)));
  }

  function injectMarkup(){
    const overlay = document.createElement("div");
    overlay.id = "adminLoginOverlay";
    overlay.className = "admin-login-overlay";
    overlay.innerHTML = `
      <div class="admin-login-card">
        <button type="button" class="admin-login-close" id="adminLoginClose" aria-label="Close">✕</button>
        <div class="admin-login-mark">Neruson Creations</div>
        <h3 class="admin-login-title">Admin access</h3>
        <form id="adminLoginForm" autocomplete="off">
          <div class="admin-login-field">
            <label for="adminLoginUser">Username</label>
            <input type="text" id="adminLoginUser" name="username" required autocomplete="username">
          </div>
          <div class="admin-login-field">
            <label for="adminLoginPassword">Password</label>
            <input type="password" id="adminLoginPassword" name="password" required autocomplete="current-password">
          </div>
          <div class="admin-login-error" id="adminLoginError"></div>
          <div class="admin-login-actions">
            <button type="button" class="admin-login-cancel" id="adminLoginCancel">Cancel</button>
            <button type="submit" class="admin-login-submit">Enter</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
  }
})();