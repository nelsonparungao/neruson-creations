/* ==========================================================================
   NERUSON CREATIONS — site logic
   Renders every dynamic section from NerusonStore and wires up the
   cinematic interactions: boot sequence, custom cursor, scroll reveal,
   masonry gallery + lightbox, collection filters, and the reference/
   drawing compare slider.
   ========================================================================== */

(function(){
  const store = NerusonStore;
  const $ = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("neruson:change", () => { renderAll(); });

  let state = { filterCollection: "all", archiveFilters:{ year:"all", category:"all", medium:"all" }, lightboxIndex:0, lightboxSet:[] };

  function init(){
    renderNav();
    renderSiteText();
    renderHero();
    renderGallery();
    renderLatest();
    renderCollections();
    renderAbout();
    renderProcess();
    renderArchive();
    renderContact();
    renderFooter();

    setupBoot();
    setupCursor();
    setupStickyNav();
    setupMobileMenu();
    setupScrollReveal();
    setupLightbox();
  }

  function renderAll(){
    renderNav(); renderSiteText(); renderHero(); renderGallery(); renderLatest(); renderCollections();
    renderAbout(); renderProcess(); renderArchive(); renderContact(); renderFooter();
    setupScrollReveal();
  }

  /* -------------------------------------------------- nav -------------------------------------------------- */
  function renderNav(){
    const s = store.settings();
    $$(".js-artist-name").forEach(el => el.textContent = s.artistName.toUpperCase());
    $$(".js-brand-line").forEach(el => el.textContent = s.brandLine.toUpperCase());

    const logo = $(".js-nav-logo");
    const mark = $(".js-nav-mark");
    if(logo && mark){
      if(s.logoImage){
        logo.src = s.logoImage;
        logo.alt = s.artistName;
        logo.hidden = false;
        mark.classList.add("has-logo");
      } else {
        logo.hidden = true;
        mark.classList.remove("has-logo");
      }
    }
  }

  /* -------------------------------------------------- page text (headings, intros, meta) -------------------------------------------------- */
  function renderSiteText(){
    const t = store.settings().siteText || {};
    const set = (sel, val) => { if(val == null) return; const el = $(sel); if(el) el.textContent = val; };

    set(".js-hero-paragraph", t.heroParagraph);
    set(".js-works-eyebrow", t.worksEyebrow);
    set(".js-works-title", t.worksTitle);
    set(".js-works-note", t.worksNote);
    set(".js-latest-eyebrow", t.latestEyebrow);
    set(".js-collections-eyebrow", t.collectionsEyebrow);
    set(".js-collections-title", t.collectionsTitle);
    set(".js-collections-note", t.collectionsNote);
    set(".js-about-eyebrow", t.aboutEyebrow);
    set(".js-process-eyebrow", t.processEyebrow);
    set(".js-process-title", t.processTitle);
    set(".js-process-intro", t.processIntro);
    set(".js-process-caption", t.processCaption);
    set(".js-archive-eyebrow", t.archiveEyebrow);
    set(".js-archive-title", t.archiveTitle);
    set(".js-archive-note", t.archiveNote);
    set(".js-contact-title", t.contactTitle);

    if(t.metaTitle) document.title = t.metaTitle;
    if(t.metaDescription){
      $('meta[name="description"]')?.setAttribute("content", t.metaDescription);
      $('meta[property="og:description"]')?.setAttribute("content", t.metaDescription);
    }
    if(t.metaTitle) $('meta[property="og:title"]')?.setAttribute("content", t.metaTitle);
  }

  function setupStickyNav(){
    const nav = $(".site-nav");
    if(!nav) return;
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive:true });
  }

  function setupMobileMenu(){
    const toggle = $(".nav-toggle");
    const menu = $(".mobile-menu");
    if(!toggle || !menu) return;
    const open = () => { menu.classList.add("open"); document.body.classList.add("no-scroll"); };
    const close = () => { menu.classList.remove("open"); document.body.classList.remove("no-scroll"); };
    toggle.addEventListener("click", open);
    $(".mm-close", menu)?.addEventListener("click", close);
    $$("a", menu).forEach(a => a.addEventListener("click", close));
  }

  /* -------------------------------------------------- hero -------------------------------------------------- */
  function renderHero(){
    const s = store.settings();
    const heroWork = store.workById(s.heroArtworkId) || store.works()[0];
    const img = $(".hero-media img");
    if(img && heroWork) { img.src = heroWork.image; img.alt = heroWork.title; }
    const sub = $(".js-hero-sub"); if(sub) sub.textContent = s.heroSubtitle;
  }

  function setupBoot(){
    const boot = $(".hero-boot");
    const hero = $(".hero");
    window.addEventListener("load", () => {
      setTimeout(() => {
        boot?.classList.add("hidden");
        hero?.classList.add("loaded");
      }, 1400);
    });
    // fallback in case load already fired
    setTimeout(() => { boot?.classList.add("hidden"); hero?.classList.add("loaded"); }, 2600);
  }

  /* -------------------------------------------------- gallery -------------------------------------------------- */
  function renderGallery(){
    const grid = $(".js-gallery"); if(!grid) return;
    let works = store.works();
    if(state.filterCollection !== "all") works = works.filter(w => w.collection === state.filterCollection);
    state.lightboxSet = works;

    grid.innerHTML = works.map((w,i) => cardHTML(w, i)).join("");
    $$(".art-card", grid).forEach(card => {
      card.addEventListener("click", () => openLightbox(works, parseInt(card.dataset.i,10)));
    });
    requestObserve(grid);

    // filter chips
    const chipsWrap = $(".js-coll-filters");
    if(chipsWrap){
      const colls = store.collections();
      chipsWrap.innerHTML = ['<button class="filter-chip'+(state.filterCollection==="all"?" active":"")+'" data-c="all">All Works</button>']
        .concat(colls.map(c => `<button class="filter-chip${state.filterCollection===c.id?" active":""}" data-c="${c.id}">${escapeHTML(c.name)}</button>`)).join("");
      $$(".filter-chip", chipsWrap).forEach(btn => {
        btn.addEventListener("click", () => {
          state.filterCollection = btn.dataset.c;
          renderGallery();
        });
      });
    }
  }

  function cardHTML(w, i){
    return `<div class="art-card reveal${w.featured?" featured":""}" data-i="${i}">
      <div class="frame js-cursor-view"><img src="${w.image}" alt="${escapeHTML(w.title)}" loading="lazy"></div>
      <div class="meta"><span class="t">${escapeHTML(w.title)}</span><span class="y">${escapeHTML(w.date)}</span></div>
      <div class="medium">${escapeHTML(w.medium)}</div>
    </div>`;
  }

  /* -------------------------------------------------- latest -------------------------------------------------- */
  function renderLatest(){
    const wrap = $(".js-latest"); if(!wrap) return;
    const featured = store.works().find(w => w.featured) || store.works()[0];
    if(!featured){ wrap.style.display = "none"; return; }
    $(".js-latest-img", wrap).src = featured.image;
    $(".js-latest-img", wrap).alt = featured.title;
    $(".js-latest-title", wrap).textContent = featured.title;
    $(".js-latest-meta", wrap).textContent = `${featured.date} — ${featured.medium}`;
    $(".js-latest-desc", wrap).textContent = featured.description || "";
    wrap.querySelector(".js-latest-view").onclick = () => openLightbox(store.works(), store.works().findIndex(w=>w.id===featured.id));
  }

  /* -------------------------------------------------- collections -------------------------------------------------- */
  function renderCollections(){
    const grid = $(".js-collections"); if(!grid) return;
    const colls = store.collections();
    grid.innerHTML = colls.map((c,i) => {
      const worksIn = store.works().filter(w => w.collection === c.id);
      const cover = worksIn[0]?.image || store.works()[0]?.image || "";
      return `<div class="coll-card reveal" data-c="${c.id}">
        <img src="${cover}" alt="${escapeHTML(c.name)}">
        <span class="ccount">${String(worksIn.length).padStart(2,"0")} works</span>
        <div class="coll-inner">
          <span class="cnum">${String(i+1).padStart(2,"0")}</span>
          <h3>${escapeHTML(c.name)}</h3>
          <p>${escapeHTML(c.description||"")}</p>
        </div>
      </div>`;
    }).join("");
    $$(".coll-card", grid).forEach(card => {
      card.addEventListener("click", () => {
        state.filterCollection = card.dataset.c;
        renderGallery();
        document.getElementById("works")?.scrollIntoView({ behavior:"smooth" });
      });
    });
    requestObserve(grid);
  }

  /* -------------------------------------------------- about -------------------------------------------------- */
  function renderAbout(){
    const wrap = $(".js-about"); if(!wrap) return;
    const s = store.settings();
    $(".js-about-title", wrap).textContent = s.aboutTitle;
    $(".js-about-text", wrap).innerHTML = s.aboutText.split(/\n{2,}/).map(p => `<p>${escapeHTML(p)}</p>`).join("");
    if(s.aboutPortraitImage){
      $(".js-about-img", wrap).src = s.aboutPortraitImage;
      $(".js-about-img", wrap).alt = s.aboutTitle || "Portrait";
    } else {
      const portrait = store.workById(s.aboutPortraitId);
      if(portrait) { $(".js-about-img", wrap).src = portrait.image; $(".js-about-img", wrap).alt = portrait.title; }
    }
  }

  /* -------------------------------------------------- process compare -------------------------------------------------- */
  function renderProcess(){
    const wrap = $(".js-compare"); if(!wrap) return;
    const pair = store.works().find(w => w.refImage) || store.works()[0];
    if(!pair) return;
    $(".js-compare-before", wrap).src = pair.refImage || pair.image;
    $(".js-compare-after", wrap).src = pair.image;

    const handle = $(".handle", wrap);
    const afterWrap = $(".after-wrap", wrap);
    let dragging = false;

    function setPos(clientX){
      const rect = wrap.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      handle.style.left = pct + "%";
      afterWrap.style.clipPath = `inset(0 ${100-pct}% 0 0)`;
    }
    setPos(wrap.getBoundingClientRect().left + wrap.getBoundingClientRect().width/2);

    const start = (e) => { dragging = true; move(e); };
    const move = (e) => { if(!dragging) return; const x = e.touches ? e.touches[0].clientX : e.clientX; setPos(x); };
    const end = () => dragging = false;

    wrap.addEventListener("mousedown", start);
    wrap.addEventListener("mousemove", (e)=>{ if(dragging) move(e); });
    window.addEventListener("mouseup", end);
    wrap.addEventListener("touchstart", start, { passive:true });
    wrap.addEventListener("touchmove", move, { passive:true });
    window.addEventListener("touchend", end);
  }

  /* -------------------------------------------------- archive -------------------------------------------------- */
  function renderArchive(){
    const wrap = $(".js-archive"); if(!wrap) return;
    const filtersWrap = $(".js-archive-filters");
    const all = store.works();

    const years = [...new Set(all.map(w=>w.date))].sort((a,b)=>b.localeCompare(a));
    const cats = [...new Set(all.map(w=>w.category))].sort();
    const mediums = [...new Set(all.map(w=>w.medium))].sort();

    if(filtersWrap){
      filtersWrap.innerHTML = [
        filterGroup("Year", "year", years),
        filterGroup("Category", "category", cats),
        filterGroup("Medium", "medium", mediums)
      ].join("");
      $$(".filter-chip", filtersWrap).forEach(btn => {
        btn.addEventListener("click", () => {
          const group = btn.dataset.group, val = btn.dataset.v;
          state.archiveFilters[group] = val;
          renderArchive();
        });
      });
    }

    let list = all;
    const f = state.archiveFilters;
    if(f.year !== "all") list = list.filter(w=>w.date===f.year);
    if(f.category !== "all") list = list.filter(w=>w.category===f.category);
    if(f.medium !== "all") list = list.filter(w=>w.medium===f.medium);

    const byYear = {};
    list.forEach(w => { (byYear[w.date] = byYear[w.date] || []).push(w); });
    const orderedYears = Object.keys(byYear).sort((a,b)=>b.localeCompare(a));

    wrap.innerHTML = orderedYears.map(year => {
      const items = byYear[year];
      return `<div class="archive-year reveal">
        <div class="archive-year-head">${year} <span class="count">${String(items.length).padStart(2,"0")} pieces</span></div>
        ${items.map((w,idx) => `<div class="archive-row" data-id="${w.id}">
            <span class="an">${String(idx+1).padStart(2,"0")}</span>
            <span class="at">${escapeHTML(w.title)}</span>
            <span class="am">${escapeHTML(w.medium)}</span>
            <span class="atags">${escapeHTML(w.category)}</span>
          </div>`).join("")}
      </div>`;
    }).join("") || `<p class="section-note" style="text-align:left;max-width:none;padding:40px 0;">No works match these filters yet.</p>`;

    $$(".archive-row", wrap).forEach(row => {
      row.addEventListener("click", () => {
        const id = row.dataset.id;
        const idx = list.findIndex(w=>w.id===id);
        openLightbox(list, idx);
      });
    });
    requestObserve(wrap);
  }

  function filterGroup(label, key, values){
    const current = state.archiveFilters[key];
    return `<div class="af-group">
      <span class="af-label">${label}</span>
      <div class="af-options">
        <button class="filter-chip${current==="all"?" active":""}" data-group="${key}" data-v="all">All</button>
        ${values.map(v => `<button class="filter-chip${current===v?" active":""}" data-group="${key}" data-v="${escapeHTML(v)}">${escapeHTML(v)}</button>`).join("")}
      </div>
    </div>`;
  }

  /* -------------------------------------------------- contact -------------------------------------------------- */
  function renderContact(){
    const wrap = $(".js-contact"); if(!wrap) return;
    const s = store.settings().social;
    const links = [
      { label:"Instagram", href:s.instagram },
      { label:"Facebook", href:s.facebook },
      { label:"Email", href:s.email ? `mailto:${s.email}` : "" },
      { label:"Other", href:s.other }
    ].filter(l => l.href);
    wrap.innerHTML = links.map(l => `<a class="contact-link" href="${l.href}" target="_blank" rel="noopener">${l.label}<span class="arrow">↗</span></a>`).join("");
  }

  /* -------------------------------------------------- footer -------------------------------------------------- */
  function renderFooter(){
    const s = store.settings();
    $$(".js-foot-phrase").forEach(el => el.textContent = s.footerPhrase);
    $$(".js-foot-year").forEach(el => el.textContent = new Date().getFullYear());
  }

  /* -------------------------------------------------- lightbox -------------------------------------------------- */
  function setupLightbox(){
    const lb = $(".lightbox"); if(!lb) return;
    $(".js-lb-close", lb).addEventListener("click", closeLightbox);
    $(".js-lb-prev", lb).addEventListener("click", () => step(-1));
    $(".js-lb-next", lb).addEventListener("click", () => step(1));
    lb.addEventListener("click", (e) => { if(e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if(!lb.classList.contains("open")) return;
      if(e.key === "Escape") closeLightbox();
      if(e.key === "ArrowRight") step(1);
      if(e.key === "ArrowLeft") step(-1);
    });
  }

  function openLightbox(set, index){
    state.lightboxSet = set; state.lightboxIndex = index;
    renderLightbox();
    $(".lightbox").classList.add("open");
    document.body.classList.add("no-scroll");
  }
  function closeLightbox(){
    $(".lightbox").classList.remove("open");
    document.body.classList.remove("no-scroll");
  }
  function step(dir){
    const len = state.lightboxSet.length;
    state.lightboxIndex = (state.lightboxIndex + dir + len) % len;
    renderLightbox();
  }
  function renderLightbox(){
    const w = state.lightboxSet[state.lightboxIndex]; if(!w) return;
    const lb = $(".lightbox");
    const img = $(".js-lb-img", lb);
    img.classList.remove("show");
    setTimeout(() => { img.src = w.image; img.alt = w.title; img.classList.add("show"); }, 120);
    $(".js-lb-title", lb).textContent = w.title;
    $(".js-lb-meta", lb).textContent = `${w.date} — ${w.medium}${w.referenceName ? " — " + w.referenceName : ""}`;
    $(".js-lb-desc", lb).textContent = w.description || "";
    $(".js-lb-tags", lb).innerHTML = (w.tags||[]).map(t=>`<span>${escapeHTML(t)}</span>`).join("");
    $(".js-lb-counter", lb).textContent = `${String(state.lightboxIndex+1).padStart(2,"0")} / ${String(state.lightboxSet.length).padStart(2,"0")}`;
  }

  /* -------------------------------------------------- cursor -------------------------------------------------- */
  function setupCursor(){
    if(window.matchMedia("(pointer: coarse)").matches) return; // disable on touch/mobile
    document.documentElement.classList.add("has-custom-cursor");
    const cursor = document.createElement("div");
    cursor.className = "cursor";
    cursor.innerHTML = '<span class="cursor-label">View</span>';
    document.body.appendChild(cursor);

    let x=0,y=0,cx=0,cy=0;
    window.addEventListener("mousemove", e => { x=e.clientX; y=e.clientY; });
    function loop(){
      cx += (x-cx)*0.22; cy += (y-cy)*0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener("mouseover", e => {
      if(e.target.closest(".js-cursor-view")) cursor.classList.add("view");
      else if(e.target.closest("a, button")) cursor.classList.add("link");
      else if(e.target.closest(".js-compare")) cursor.classList.add("drag");
    });
    document.addEventListener("mouseout", e => {
      if(e.target.closest(".js-cursor-view")) cursor.classList.remove("view");
      if(e.target.closest("a, button")) cursor.classList.remove("link");
      if(e.target.closest(".js-compare")) cursor.classList.remove("drag");
    });
  }

  /* -------------------------------------------------- scroll reveal -------------------------------------------------- */
  let observer;
  function setupScrollReveal(){
    if(observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if(entry.isIntersecting){ entry.target.classList.add("in"); observer.unobserve(entry.target); } });
    }, { threshold:0.12 });
    $$(".reveal").forEach(el => observer.observe(el));
  }
  function requestObserve(container){
    requestAnimationFrame(() => {
      if(!observer) return;
      $$(".reveal", container).forEach(el => observer.observe(el));
    });
  }

  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
})();