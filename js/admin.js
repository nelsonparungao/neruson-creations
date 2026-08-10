/* ==========================================================================
   NERUSON CREATIONS — admin dashboard logic
   Everything here reads/writes through NerusonStore (localStorage today,
   swap for real API calls later). The public site listens for
   "neruson:change" and re-renders automatically.
   ========================================================================== */

(function(){
  const store = NerusonStore;
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  let searchTerm = "";
  let likeCounts = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init(){
    // Wait for the real Supabase content to load before rendering or wiring
    // up ANY interaction (upload, edit, toggle, etc). Without this, the
    // dashboard paints the store's built-in placeholder defaults first
    // (they're set synchronously so main.js has something to show
    // instantly) and, if you touch anything before the real fetch
    // resolves, you save those placeholders — merged with your edit —
    // back over your real Supabase content.
    showLoadingState(true);
    await store.ready;
    showLoadingState(false);

    renderBrand();
    setupTabs();
    likeCounts = await store.fetchLikeCounts();
    renderWorkList();
    renderCollectionsTab();
    renderAboutForm();
    renderPageTextForm();
    renderSettingsForm();
    renderCommentsTab();
    setupUpload();
    setupWorkModal();
    setupToolbar();
    setupHeaderActions();
    setupCommentsTab();
    window.addEventListener("neruson:savefail", () =>
      toast("⚠ Could not save — check your connection and try again."));

    // Keep the artwork list honest if content changes from elsewhere
    // (another tab/device, or an import). Deliberately does NOT touch
    // the modal or the other tab's forms so it can't wipe out something
    // you're mid-way through typing.
    window.addEventListener("neruson:change", () => renderWorkList());
  }

  function showLoadingState(isLoading){
    const list = $("#workList");
    const drop = $("#uploadDrop");
    if(isLoading){
      list.innerHTML = `<p style="padding:40px 0;color:var(--mid);font-size:13px;">Loading your content from Supabase…</p>`;
      if(drop) drop.style.pointerEvents = "none", drop.style.opacity = "0.5";
    } else if(drop){
      drop.style.pointerEvents = ""; drop.style.opacity = "";
    }
  }

  function renderBrand(){
    const s = store.settings();
    $$(".js-artist-name").forEach(el => el.textContent = s.artistName.toUpperCase());
    $$(".js-brand-line").forEach(el => el.textContent = s.brandLine.toUpperCase());
  }

  function toast(msg){
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* -------------------------------------------------- tabs -------------------------------------------------- */
  function setupTabs(){
    $$(".admin-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".admin-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const name = btn.dataset.tab;
        $$(".admin-panel").forEach(p => p.hidden = p.dataset.panel !== name);
      });
    });
  }

  /* -------------------------------------------------- work list -------------------------------------------------- */
  function renderWorkList(){
    const list = $("#workList");
    let works = store.works({ includeHidden:true });
    if(searchTerm){
      const q = searchTerm.toLowerCase();
      works = works.filter(w =>
        w.title.toLowerCase().includes(q) ||
        (w.tags||[]).some(t=>t.toLowerCase().includes(q)) ||
        (w.medium||"").toLowerCase().includes(q) ||
        (w.category||"").toLowerCase().includes(q)
      );
    }
    if(!works.length){
      list.innerHTML = `<p style="padding:40px 0;color:var(--mid);font-size:13px;">No artwork yet. Upload an image above to add your first piece.</p>`;
      return;
    }
    list.innerHTML = works.map((w,i) => `
      <div class="work-row" data-id="${w.id}">
        <img class="thumb" src="${w.image}" alt="">
        <div>
          <div class="wr-title">${escapeHTML(w.title)}</div>
          <div class="wr-meta">${escapeHTML(w.date)} · ${escapeHTML(w.medium)} · ${escapeHTML(w.category)}</div>
          <div class="wr-flags">
            <span class="flag ${w.featured?"on":""}" data-action="feature">${w.featured?"Featured":"Feature"}</span>
            <span class="flag ${w.hidden?"on":""}" data-action="hide">${w.hidden?"Hidden":"Visible"}</span>
            <span class="flag heart-flag">♥ ${likeCounts[w.id] || 0}</span>
          </div>
        </div>
        <div class="wr-actions">
          <button class="icon-btn" data-action="up" ${i===0?"disabled":""} title="Move up">↑</button>
          <button class="icon-btn" data-action="down" ${i===works.length-1?"disabled":""} title="Move down">↓</button>
          <button class="icon-btn" data-action="edit">Edit</button>
        </div>
      </div>
    `).join("");

    $$(".work-row", list).forEach(row => {
      const id = row.dataset.id;
      row.addEventListener("click", (e) => {
        const action = e.target.closest("[data-action]")?.dataset.action;
        if(!action){ openWorkModal(id); return; }
        e.stopPropagation();
        if(action === "feature") store.toggleFeatured(id);
        if(action === "hide") store.toggleHidden(id);
        if(action === "edit") openWorkModal(id);
        if(action === "up" || action === "down") moveWork(id, action === "up" ? -1 : 1);
        renderWorkList();
      });
    });
  }

  function moveWork(id, dir){
    const ordered = store.works({ includeHidden:true }).map(w=>w.id);
    const idx = ordered.indexOf(id);
    const swapIdx = idx + dir;
    if(swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    store.reorderWorks(ordered);
  }

  function setupToolbar(){
    $("#workSearch").addEventListener("input", (e) => { searchTerm = e.target.value; renderWorkList(); });
    $("#newWorkBtn").addEventListener("click", () => openWorkModal(null));
  }

  /* -------------------------------------------------- upload -------------------------------------------------- */
  function setupUpload(){
    const drop = $("#uploadDrop");
    const input = $("#uploadInput");
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => handleFiles(input.files));

    ["dragenter","dragover"].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.add("drag"); }));
    ["dragleave","drop"].forEach(evt => drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.remove("drag"); }));
    drop.addEventListener("drop", e => handleFiles(e.dataTransfer.files));
  }

  function handleFiles(fileList){
    const files = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
    if(!files.length) return;
    let done = 0;
    files.forEach((file, i) => {
      readAsDataURL(file).then(dataUrl => {
        const id = "w" + Date.now() + "_" + i;
        store.upsertWork({
          id, title: "Untitled Drawing", date: String(new Date().getFullYear()),
          medium: "Graphite on paper", category: "Portrait", collection: store.collections()[0]?.id || "",
          tags: [], referenceType: "Personal", referenceName: "", description: "",
          image: dataUrl, refImage: "", featured: false, hidden: false
        });
        done++;
        if(done === files.length){
          renderWorkList();
          toast(files.length > 1 ? `${files.length} drawings added — fill in their details below.` : "Drawing added — fill in its details.");
          if(files.length === 1) openWorkModal(id);
        }
      });
    });
  }

  function readAsDataURL(file){
    return new Promise((resolve,reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* -------------------------------------------------- work modal -------------------------------------------------- */
  let pendingImage = null, pendingRef = null, clearRef = false;

  function setupWorkModal(){
    const modal = $("#workModal");
    $("#modalClose").addEventListener("click", closeWorkModal);
    modal.addEventListener("click", e => { if(e.target === modal) closeWorkModal(); });

    $("#workImgInput").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if(!file) return;
      pendingImage = await readAsDataURL(file);
      $("#workImgPreview").src = pendingImage;
    });
    $("#workRefInput").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if(!file) return;
      pendingRef = await readAsDataURL(file); clearRef = false;
      $("#workRefPreview").src = pendingRef;
      $("#refPreviewWrap").hidden = false;
    });
    $("#clearRefBtn").addEventListener("click", () => {
      pendingRef = null; clearRef = true; $("#refPreviewWrap").hidden = true;
    });

    $("#deleteWorkBtn").addEventListener("click", () => {
      const id = $("#workForm [name=id]").value;
      if(!id) return closeWorkModal();
      if(confirm("Delete this artwork? This cannot be undone.")){
        store.deleteWork(id);
        renderWorkList();
        closeWorkModal();
        toast("Artwork deleted.");
      }
    });

    $("#workForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const id = fd.get("id") || null;
      const existing = id ? store.workById(id) : null;
      const work = {
        id: id || undefined,
        title: fd.get("title").trim() || "Untitled",
        date: fd.get("date").trim(),
        medium: fd.get("medium").trim(),
        category: fd.get("category").trim(),
        collection: fd.get("collection"),
        referenceType: fd.get("referenceType"),
        referenceName: fd.get("referenceName").trim(),
        tags: fd.get("tags").split(",").map(t=>t.trim()).filter(Boolean),
        description: fd.get("description").trim(),
        featured: fd.get("featured") === "on",
        hidden: fd.get("hidden") === "on",
        image: pendingImage || existing?.image || "",
        refImage: clearRef ? "" : (pendingRef || existing?.refImage || "")
      };
      store.upsertWork(work);
      renderWorkList();
      closeWorkModal();
      toast("Artwork saved.");
    });
  }

  function fillCollectionSelect(select, selected){
    select.innerHTML = store.collections().map(c => `<option value="${c.id}" ${c.id===selected?"selected":""}>${escapeHTML(c.name)}</option>`).join("");
  }

  function openWorkModal(id){
    pendingImage = null; pendingRef = null; clearRef = false;
    const w = id ? store.workById(id) : null;
    $("#modalTitle").textContent = w ? "Edit artwork" : "New artwork";
    const form = $("#workForm");
    form.reset();
    form.id.value = w?.id || "";
    form.title.value = w?.title || "";
    form.date.value = w?.date || String(new Date().getFullYear());
    form.medium.value = w?.medium || "";
    form.category.value = w?.category || "";
    form.referenceType.value = w?.referenceType || "Personal";
    form.referenceName.value = w?.referenceName || "";
    form.tags.value = (w?.tags||[]).join(", ");
    form.description.value = w?.description || "";
    form.featured.checked = !!w?.featured;
    form.hidden.checked = !!w?.hidden;
    fillCollectionSelect(form.collection, w?.collection);

    $("#workImgPreview").src = w?.image || "assets/works/work-01.svg";
    if(w?.refImage){ $("#workRefPreview").src = w.refImage; $("#refPreviewWrap").hidden = false; }
    else { $("#refPreviewWrap").hidden = true; }

    $("#deleteWorkBtn").style.visibility = w ? "visible" : "hidden";
    $("#workModal").classList.add("open");
  }
  function closeWorkModal(){ $("#workModal").classList.remove("open"); }

  /* -------------------------------------------------- collections tab -------------------------------------------------- */
  function renderCollectionsTab(){
    const list = $("#collList");
    const colls = store.collections();
    list.innerHTML = colls.map(c => `
      <div class="coll-row" data-id="${c.id}">
        <div style="width:100%;">
          <input type="text" class="cr-name-input" value="${escapeAttr(c.name)}" placeholder="Collection name">
          <textarea class="cr-desc-input" rows="2" placeholder="Short description">${escapeHTML(c.description||"")}</textarea>
        </div>
        <div class="wr-actions" style="align-self:flex-start;">
          <button class="icon-btn" data-action="save">Save</button>
          <button class="icon-btn" data-action="delete">Delete</button>
        </div>
      </div>
    `).join("") || `<p style="padding:30px 0;color:var(--mid);font-size:13px;">No collections yet.</p>`;

    $$(".coll-row", list).forEach(row => {
      const id = row.dataset.id;
      row.querySelector("[data-action=save]").addEventListener("click", () => {
        const name = row.querySelector(".cr-name-input").value.trim();
        const description = row.querySelector(".cr-desc-input").value.trim();
        if(!name) return toast("Collection needs a name.");
        store.upsertCollection({ id, name, description });
        renderCollectionsTab();
        renderWorkList();
        toast("Collection saved.");
      });
      row.querySelector("[data-action=delete]").addEventListener("click", () => {
        if(confirm("Delete this collection? Artwork inside it will stay, just unassigned.")){
          store.deleteCollection(id);
          renderCollectionsTab();
          toast("Collection deleted.");
        }
      });
    });

    $("#newCollectionBtn").onclick = () => {
      const id = store.upsertCollection({ name:"New Collection", description:"" });
      renderCollectionsTab();
      toast("Collection added — give it a name below.");
    };
  }

  /* -------------------------------------------------- about tab -------------------------------------------------- */
  function renderAboutForm(){
    const s = store.settings();
    const form = $("#aboutForm");
    form.aboutTitle.value = s.aboutTitle;
    form.aboutText.value = s.aboutText;

    renderAboutPortraitPreview();

    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      store.updateSettings({
        aboutTitle: fd.get("aboutTitle"),
        aboutText: fd.get("aboutText")
      });
      toast("About section saved.");
    };

    $("#aboutPortraitInput").onchange = async (e) => {
      const file = e.target.files[0]; if(!file) return;
      const dataUrl = await readAsDataURL(file);
      store.updateSettings({ aboutPortraitImage: dataUrl });
      renderAboutPortraitPreview();
      toast("Portrait updated — showing on the site now.");
    };
    $("#clearAboutPortraitBtn").onclick = () => {
      if(!store.settings().aboutPortraitImage) return;
      store.updateSettings({ aboutPortraitImage: "" });
      renderAboutPortraitPreview();
      toast("Portrait removed.");
    };
  }

  function renderAboutPortraitPreview(){
    const s = store.settings();
    const img = $("#aboutPortraitPreview");
    const empty = $("#aboutPortraitPreviewEmpty");
    if(s.aboutPortraitImage){
      img.src = s.aboutPortraitImage; img.hidden = false; empty.hidden = true;
    } else {
      img.hidden = true; empty.hidden = false;
    }
  }

  /* -------------------------------------------------- page text tab -------------------------------------------------- */
  const PAGE_TEXT_FIELDS = [
    "heroParagraph","worksEyebrow","worksTitle","worksNote","latestEyebrow",
    "collectionsEyebrow","collectionsTitle","collectionsNote","aboutEyebrow",
    "processEyebrow","processTitle","processIntro","processCaption",
    "archiveEyebrow","archiveTitle","archiveNote","contactTitle",
    "metaTitle","metaDescription"
  ];

  function renderPageTextForm(){
    const t = store.settings().siteText || {};
    const form = $("#pageTextForm");
    PAGE_TEXT_FIELDS.forEach(name => { if(form[name]) form[name].value = t[name] || ""; });

    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const siteText = {};
      PAGE_TEXT_FIELDS.forEach(name => { siteText[name] = fd.get(name); });
      store.updateSettings({ siteText });
      toast("Page text saved.");
    };
  }

  /* -------------------------------------------------- comments tab -------------------------------------------------- */
  async function renderCommentsTab(){
    const list = $("#commentList"); if(!list) return;
    list.innerHTML = `<p style="padding:30px 0;color:var(--mid);font-size:13px;">Loading comments…</p>`;
    const comments = await store.fetchComments();
    if(!comments.length){
      list.innerHTML = `<p style="padding:30px 0;color:var(--mid);font-size:13px;">No comments yet.</p>`;
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment-row" data-id="${c.id}">
        <div>
          <div class="cr-head">
            <span class="cr-name">${escapeHTML(c.name || "Anonymous")}</span>
            <span class="cr-date">${formatDate(c.created_at)}</span>
          </div>
          <p class="cr-message">${escapeHTML(c.message)}</p>
        </div>
        <button class="text-btn danger" data-action="delete">Delete</button>
      </div>
    `).join("");

    $$(".comment-row [data-action=delete]", list).forEach(btn => {
      btn.addEventListener("click", async () => {
        const row = btn.closest(".comment-row");
        const id = row.dataset.id;
        if(!confirm("Delete this comment? This can't be undone.")) return;
        btn.disabled = true;
        try{
          const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
          if(!res.ok) throw new Error("Delete failed: " + res.status);
          row.remove();
          toast("Comment deleted.");
        }catch(err){
          console.error(err);
          toast("⚠ Could not delete — check your connection and try again.");
          btn.disabled = false;
        }
      });
    });
  }

  function setupCommentsTab(){
    $("#refreshCommentsBtn")?.addEventListener("click", () => renderCommentsTab());
  }

  function formatDate(iso){
    try{
      return new Date(iso).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
    }catch(e){ return ""; }
  }

  /* -------------------------------------------------- settings tab -------------------------------------------------- */
  function renderSettingsForm(){
    const s = store.settings();
    const form = $("#settingsForm");
    form.artistName.value = s.artistName;
    form.brandLine.value = s.brandLine;
    form.tagline.value = s.tagline;
    form.heroSubtitle.value = s.heroSubtitle;
    form.footerPhrase.value = s.footerPhrase;
    form.instagram.value = s.social.instagram || "";
    form.facebook.value = s.social.facebook || "";
    form.email.value = s.social.email || "";
    form.other.value = s.social.other || "";
    form.heroArtworkId.innerHTML = store.works({ includeHidden:true }).map(w =>
      `<option value="${w.id}" ${w.id===s.heroArtworkId?"selected":""}>${escapeHTML(w.title)}</option>`).join("");

    renderLogoPreview();
    setupLogoField();

    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      store.updateSettings({
        artistName: fd.get("artistName"),
        brandLine: fd.get("brandLine"),
        tagline: fd.get("tagline"),
        heroSubtitle: fd.get("heroSubtitle"),
        footerPhrase: fd.get("footerPhrase"),
        heroArtworkId: fd.get("heroArtworkId"),
        social: {
          instagram: fd.get("instagram"),
          facebook: fd.get("facebook"),
          email: fd.get("email"),
          other: fd.get("other")
        }
      });
      renderBrand();
      toast("Settings saved.");
    };

    $("#resetBtn").addEventListener("click", () => {
      if(confirm("Reset all content back to the original placeholder set? This deletes your changes.")){
        store.resetToDefaults();
        location.reload();
      }
    });
  }

  function renderLogoPreview(){
    const s = store.settings();
    const img = $("#logoPreview");
    const empty = $("#logoPreviewEmpty");
    if(s.logoImage){
      img.src = s.logoImage; img.hidden = false; empty.hidden = true;
    } else {
      img.hidden = true; empty.hidden = false;
    }
  }

  function setupLogoField(){
    $("#logoInput").addEventListener("change", async (e) => {
      const file = e.target.files[0]; if(!file) return;
      const dataUrl = await readAsDataURL(file);
      store.updateSettings({ logoImage: dataUrl });
      renderLogoPreview();
      toast("Logo updated — showing on the site now.");
    });
    $("#clearLogoBtn").addEventListener("click", () => {
      if(!store.settings().logoImage) return;
      store.updateSettings({ logoImage: "" });
      renderLogoPreview();
      toast("Logo removed — back to the text mark.");
    });
  }

  /* -------------------------------------------------- header actions -------------------------------------------------- */
  function setupHeaderActions(){
    $("#exportBtn").addEventListener("click", () => {
      const blob = new Blob([store.exportJSON()], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "neruson-creations-content.json"; a.click();
      URL.revokeObjectURL(url);
    });
    $("#importInput").addEventListener("change", (e) => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          store.importJSON(reader.result);
          toast("Content imported.");
          location.reload();
        }catch(err){ toast("Could not read that file — check it's valid JSON."); }
      };
      reader.readAsText(file);
    });
  }

  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escapeAttr(str){ return escapeHTML(str).replace(/"/g,"&quot;"); }
})();