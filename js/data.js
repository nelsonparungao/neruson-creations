/* ==========================================================================
   NERUSON CREATIONS — data store
   Content lives in Supabase (a shared, hosted Postgres database) so every
   visitor and every device sees the same thing. Reads go straight to
   Supabase using the public anon key below (safe to expose — Row Level
   Security only allows it to SELECT). Writes go through /api/content,
   a protected serverless function that uses a private service-role key.
   main.js / admin.js don't know or care about any of this — they just
   call store.settings(), store.upsertWork(), etc. as before.
   ========================================================================== */

// ---- fill these in from your Supabase project (Settings -> API) ----
// Both are safe to keep in this public file: the URL isn't secret, and
// the "anon" key is designed to be exposed to browsers — Row Level
// Security policies (set up in Supabase) are what actually restrict it
// to read-only. Never put the "service_role" key here.
const SUPABASE_URL = "https://bvislmgbpjqxojewfkgl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aXNsbWdicGpxeG9qZXdma2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE0MDQsImV4cCI6MjEwMTg3NzQwNH0.UAC-E-6oxnN34gY1ibD3JvmSi5XJWu7eJqMzipXmRH8";

const DEFAULT_DATA = {
  settings: {
    artistName: "Neruson",
    brandLine: "Creations",
    tagline: "Black lines. Human stories.",
    heroSubtitle: "Drawn in monochrome.",
    heroArtworkId: "w1",
    footerPhrase: "Drawn by hand. Remembered in monochrome.",
    logoImage: "",
    aboutTitle: "About Neruson",
    aboutText:
      "Neruson Creations is a personal collection of monochrome drawings exploring people, expressions, identity, and the quiet details of everyday life.\n\nMost of the works begin with a photograph or personal reference and are translated into black and white through pencil, ink, and drawing.\n\nWhat started as simple drawings became a way of documenting people, moments, and perspectives through lines.",
    aboutPortraitId: "w3",
    aboutPortraitImage: "",
    social: {
      instagram: "https://instagram.com/neruson.creations",
      facebook: "https://facebook.com/nerusoncreations",
      email: "hello@nerusoncreations.com",
      other: ""
    },
    siteText: {
      heroParagraph: "Personal drawings of people the artist admires, is close to, or sees in the mirror — translated into graphite and ink.",
      worksEyebrow: "01 — Gallery",
      worksTitle: "Selected Works",
      worksNote: "A running collection of portraits, studies, and self-portraits — each one begins with a real reference and ends in graphite or ink.",
      latestEyebrow: "02 — The Latest",
      collectionsEyebrow: "03 — Collections",
      collectionsTitle: "Grouped by Subject",
      collectionsNote: "Every drawing belongs somewhere — a person, a self, a study, or the archive it grew out of.",
      aboutEyebrow: "04 — About",
      processEyebrow: "05 — Process",
      processTitle: "From Reference to Drawing",
      processIntro: "Every piece begins as a photograph — a real moment, a real person. Drag the line to see where the drawing takes over.",
      processCaption: "Drag horizontally, or hover on desktop — reference photo on the left, finished drawing on the right.",
      archiveEyebrow: "06 — Archive",
      archiveTitle: "The Full Catalog",
      archiveNote: "Every piece, chronologically. Filter by year, category, or medium to find your way through.",
      contactTitle: "Let's Talk",
      metaTitle: "Neruson Creations — Black lines. Human stories.",
      metaDescription: "Neruson Creations — a personal collection of black-and-white pencil and ink drawings exploring people, expression, and identity."
    }
  },

  collections: [
    { id: "c1", name: "Portraits", description: "People drawn in monochrome.", order: 1 },
    { id: "c2", name: "Self", description: "Self-portraits and personal studies.", order: 2 },
    { id: "c3", name: "People", description: "Drawings based on people who inspire the artist.", order: 3 },
    { id: "c4", name: "Studies", description: "Experimental sketches, anatomy, expressions, hands, eyes.", order: 4 },
    { id: "c5", name: "Archive", description: "Older works, kept for the record.", order: 5 }
  ],

  works: [
    { id:"w1", title:"Portrait 07", date:"2026", medium:"Graphite on paper", category:"Portrait", collection:"c1",
      tags:["portrait","graphite","people"], referenceType:"Personal", referenceName:"", description:"A graphite study built from long, patient contour lines — an attempt to hold onto a single expression before it changed.",
      image:"assets/works/work-01.svg", refImage:"assets/refs/ref-01.svg", featured:true, hidden:false, order:1 },
    { id:"w2", title:"Self Study 03", date:"2026", medium:"Ink on paper", category:"Self", collection:"c2",
      tags:["self-portrait","ink","study"], referenceType:"Self", referenceName:"", description:"Third in an ongoing series of self-portraits made without looking down at the page.",
      image:"assets/works/work-02.svg", refImage:"assets/refs/ref-02.svg", featured:true, hidden:false, order:2 },
    { id:"w3", title:"Portrait 06", date:"2026", medium:"Graphite on paper", category:"Portrait", collection:"c1",
      tags:["portrait","graphite","friend"], referenceType:"Friend", referenceName:"", description:"Drawn from a photo taken on an ordinary afternoon that turned out to hold an extraordinary expression.",
      image:"assets/works/work-03.svg", refImage:"assets/refs/ref-03.svg", featured:false, hidden:false, order:3 },
    { id:"w4", title:"Quiet Study", date:"2025", medium:"Charcoal on paper", category:"Study", collection:"c4",
      tags:["study","charcoal","expression"], referenceType:"Personal", referenceName:"", description:"An experiment in shadow — how little line is needed before a face still reads as a face.",
      image:"assets/works/work-04.svg", refImage:"assets/refs/ref-04.svg", featured:false, hidden:false, order:4 },
    { id:"w5", title:"Portrait 05", date:"2025", medium:"Graphite on paper", category:"Portrait", collection:"c1",
      tags:["portrait","graphite","admired"], referenceType:"Someone admired", referenceName:"", description:"A tribute portrait, drawn slowly over several evenings.",
      image:"assets/works/work-05.svg", refImage:"assets/refs/ref-05.svg", featured:false, hidden:false, order:5 },
    { id:"w6", title:"Hands, Study II", date:"2025", medium:"Pencil on paper", category:"Study", collection:"c4",
      tags:["study","hands","pencil"], referenceType:"Personal", referenceName:"", description:"Hands are harder than faces. This is the second attempt at admitting that on paper.",
      image:"assets/works/work-06.svg", refImage:"assets/refs/ref-06.svg", featured:false, hidden:false, order:6 },
    { id:"w7", title:"Portrait 04", date:"2025", medium:"Ink on paper", category:"Portrait", collection:"c3",
      tags:["portrait","ink","people"], referenceType:"Friend", referenceName:"", description:"Ink doesn't forgive mistakes, which is exactly why this one was drawn in it.",
      image:"assets/works/work-07.svg", refImage:"assets/refs/ref-07.svg", featured:false, hidden:false, order:7 },
    { id:"w8", title:"Self Study 02", date:"2024", medium:"Graphite on paper", category:"Self", collection:"c2",
      tags:["self-portrait","graphite"], referenceType:"Self", referenceName:"", description:"Second self-portrait in the collection, drawn a year before the first was finished.",
      image:"assets/works/work-08.svg", refImage:"assets/refs/ref-08.svg", featured:false, hidden:false, order:8 },
    { id:"w9", title:"Portrait 03", date:"2024", medium:"Graphite on paper", category:"Portrait", collection:"c5",
      tags:["portrait","graphite","archive"], referenceType:"Personal", referenceName:"", description:"An early piece, kept in the archive as a record of where the line work started.",
      image:"assets/works/work-09.svg", refImage:"assets/refs/ref-09.svg", featured:false, hidden:false, order:9 },
    { id:"w10", title:"Eyes, Study I", date:"2024", medium:"Pencil on paper", category:"Study", collection:"c4",
      tags:["study","eyes","pencil"], referenceType:"Personal", referenceName:"", description:"The first of many attempts to draw an eye that actually looks back.",
      image:"assets/works/work-10.svg", refImage:"assets/refs/ref-10.svg", featured:false, hidden:false, order:10 },
    { id:"w11", title:"Portrait 02", date:"2024", medium:"Charcoal on paper", category:"Portrait", collection:"c5",
      tags:["portrait","charcoal","archive"], referenceType:"Someone admired", referenceName:"", description:"An early portrait, heavier in charcoal than anything made since.",
      image:"assets/works/work-11.svg", refImage:"assets/refs/ref-11.svg", featured:false, hidden:false, order:11 },
    { id:"w12", title:"Portrait 01", date:"2023", medium:"Graphite on paper", category:"Portrait", collection:"c5",
      tags:["portrait","graphite","first"], referenceType:"Personal", referenceName:"", description:"The first drawing in the collection. Everything else grew out of this one.",
      image:"assets/works/work-12.svg", refImage:"assets/refs/ref-12.svg", featured:false, hidden:false, order:12 }
  ]
};

class NerusonStoreImpl {
  constructor(){
    // Paint instantly with defaults, then swap in real content once
    // Supabase responds — main.js re-renders automatically on
    // "neruson:change", so this needs no special handling elsewhere.
    this._data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.ready = this._init();
  }

  async _init(){
    try{
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_content?id=eq.main&select=data`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if(!res.ok) throw new Error("Supabase read failed: " + res.status);
      const rows = await res.json();
      if(rows && rows[0] && rows[0].data){
        const remote = rows[0].data;
        // backfill fields added in later versions so upgrading never
        // blanks out content saved before this version of the store.
        remote.settings = remote.settings || {};
        remote.settings.siteText = { ...DEFAULT_DATA.settings.siteText, ...(remote.settings.siteText||{}) };
        this._data = remote;
        window.dispatchEvent(new CustomEvent("neruson:change"));
      } else {
        // First run — no row in Supabase yet. Seed it with the defaults
        // so the dashboard and site agree on a starting point.
        this._persist(this._data);
      }
    }catch(e){
      console.warn("Neruson store: could not reach Supabase, showing local defaults.", e);
    }
  }

  async _persist(data){
    try{
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });
      if(!res.ok) throw new Error("Save failed: " + res.status);
    }catch(e){
      console.error("Neruson store: could not save to Supabase.", e);
      window.dispatchEvent(new CustomEvent("neruson:savefail", { detail: e }));
    }
  }

  _save(data){
    this._data = data;
    window.dispatchEvent(new CustomEvent("neruson:change"));
    this._persist(data); // fire-and-forget; failures surface via neruson:savefail
  }

  // ---- reads ----
  all(){ return this._data; }
  settings(){ return this._data.settings; }
  collections(){ return [...this._data.collections].sort((a,b)=>a.order-b.order); }
  works({ includeHidden=false } = {}){
    let list = [...this._data.works];
    if(!includeHidden) list = list.filter(w=>!w.hidden);
    return list.sort((a,b)=>a.order-b.order);
  }
  workById(id){ return this._data.works.find(w=>w.id===id); }
  collectionById(id){ return this._data.collections.find(c=>c.id===id); }

  // ---- writes ----
  updateSettings(patch){
    this._data.settings = { ...this._data.settings, ...patch,
      social: { ...this._data.settings.social, ...(patch.social||{}) },
      siteText: { ...this._data.settings.siteText, ...(patch.siteText||{}) } };
    this._save(this._data);
  }

  upsertWork(work){
    const idx = this._data.works.findIndex(w=>w.id===work.id);
    if(idx===-1){
      work.id = work.id || ("w" + Date.now());
      work.order = this._data.works.length + 1;
      this._data.works.push(work);
    } else {
      this._data.works[idx] = { ...this._data.works[idx], ...work };
    }
    this._save(this._data);
    return work.id;
  }

  deleteWork(id){
    this._data.works = this._data.works.filter(w=>w.id!==id);
    this._save(this._data);
  }

  reorderWorks(orderedIds){
    orderedIds.forEach((id,i)=>{
      const w = this._data.works.find(x=>x.id===id);
      if(w) w.order = i+1;
    });
    this._save(this._data);
  }

  toggleFeatured(id){
    const w = this.workById(id); if(!w) return;
    w.featured = !w.featured; this._save(this._data);
  }
  toggleHidden(id){
    const w = this.workById(id); if(!w) return;
    w.hidden = !w.hidden; this._save(this._data);
  }

  upsertCollection(coll){
    const idx = this._data.collections.findIndex(c=>c.id===coll.id);
    if(idx===-1){
      coll.id = coll.id || ("c" + Date.now());
      coll.order = this._data.collections.length + 1;
      this._data.collections.push(coll);
    } else {
      this._data.collections[idx] = { ...this._data.collections[idx], ...coll };
    }
    this._save(this._data);
    return coll.id;
  }
  deleteCollection(id){
    this._data.collections = this._data.collections.filter(c=>c.id!==id);
    this._save(this._data);
  }
  reorderCollections(orderedIds){
    orderedIds.forEach((id,i)=>{
      const c = this._data.collections.find(x=>x.id===id);
      if(c) c.order = i+1;
    });
    this._save(this._data);
  }

  // ---- utility ----
  resetToDefaults(){ this._save(JSON.parse(JSON.stringify(DEFAULT_DATA))); }
  exportJSON(){ return JSON.stringify(this._data, null, 2); }
  importJSON(json){
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    this._save(parsed);
  }
}

const NerusonStore = new NerusonStoreImpl();