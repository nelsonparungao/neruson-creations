/* ==========================================================================
   NERUSON CREATIONS — image cropper
   Drop-in, dependency-free crop UI. Injects its own markup on first use.

   window.openImageCropper(file, options) -> Promise<string|null>
     - resolves with a data URL (the cropped/resized image) on Apply
     - resolves with null if the user cancels or closes the dialog
     - resolves with "skip" if the user chooses "Use original, don't crop"
       (callers should fall back to their own resize/compress step)

   options:
     title            dialog heading, e.g. "Crop artwork"
     aspect           starting aspect ratio (width/height), or "native" to
                       start fit to the image's own aspect ratio (default)
     outputWidth       preferred output width in px (editable by the user)
     outputHeight      preferred output height in px (editable by the user)
     round             true = clip the output to a rounded square (favicon-
                       style) and export as PNG
     cornerRadiusRatio corner radius as a ratio of the output size when
                       round is true (default .22)
     quality           JPEG quality 0..1 (ignored when round is true)
     allowSkip         show the "use original" shortcut (default true)
   ========================================================================== */

(function(){
  const MAX_FRAME = 340; // longest side of the on-screen crop frame, in css px

  let state = null;
  let resolvePromise = null;

  function ready(fn){ document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn); }
  ready(injectMarkup);

  function injectMarkup(){
    if(document.getElementById("cropperOverlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "cropperOverlay";
    overlay.className = "cropper-overlay";
    overlay.innerHTML = `
      <div class="cropper-card">
        <div class="cropper-head">
          <h3 id="cropperTitle">Crop image</h3>
          <button type="button" class="cropper-close" id="cropperClose" aria-label="Close">✕</button>
        </div>
        <div class="cropper-body">
          <div class="cropper-frame" id="cropperFrame">
            <img id="cropperImg" src="" alt="" draggable="false">
          </div>
          <div class="cropper-controls">
            <label class="cropper-zoom-label">Zoom
              <input type="range" id="cropperZoom" min="1" max="4" step="0.01" value="1">
            </label>
            <div class="cropper-presets" id="cropperPresets">
              <button type="button" data-ratio="native">Fit original</button>
              <button type="button" data-ratio="1">Square</button>
              <button type="button" data-ratio="1.3333">4:3</button>
              <button type="button" data-ratio="0.75">3:4</button>
              <button type="button" data-ratio="1.7778">16:9</button>
            </div>
            <div class="cropper-size-fields">
              <label>Width <input type="number" id="cropperWidth" min="40" max="4000" step="1"></label>
              <span class="cropper-size-x">×</span>
              <label>Height <input type="number" id="cropperHeight" min="40" max="4000" step="1"></label>
              <span class="cropper-size-px">px, output size</span>
            </div>
            <p class="cropper-hint">Drag the image to reposition, use the slider to zoom. The width/height fields set the exact size of the saved file.</p>
          </div>
        </div>
        <div class="cropper-actions">
          <button type="button" class="cropper-skip" id="cropperSkip">Use original, don't crop</button>
          <div class="cropper-actions-right">
            <button type="button" class="cropper-cancel" id="cropperCancel">Cancel</button>
            <button type="button" class="cropper-apply" id="cropperApply">Apply</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    wireEvents();
  }

  function wireEvents(){
    const overlay = document.getElementById("cropperOverlay");
    const frame = document.getElementById("cropperFrame");
    const img = document.getElementById("cropperImg");
    const zoom = document.getElementById("cropperZoom");
    const widthInput = document.getElementById("cropperWidth");
    const heightInput = document.getElementById("cropperHeight");
    const presets = document.getElementById("cropperPresets");

    zoom.addEventListener("input", () => setZoom(parseFloat(zoom.value)));

    presets.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-ratio]"); if(!btn || !state) return;
      $$Active(presets, btn);
      const ratio = btn.dataset.ratio === "native" ? (state.naturalW / state.naturalH) : parseFloat(btn.dataset.ratio);
      applyRatio(ratio, true);
    });

    let sizeDebounce;
    function onSizeInput(){
      clearTimeout(sizeDebounce);
      sizeDebounce = setTimeout(() => {
        if(!state) return;
        let w = Math.max(40, Math.min(4000, parseInt(widthInput.value, 10) || state.outputW));
        let h = Math.max(40, Math.min(4000, parseInt(heightInput.value, 10) || state.outputH));
        widthInput.value = w; heightInput.value = h;
        setActivePreset(null);
        applyRatio(w / h, true, { w, h });
      }, 350);
    }
    widthInput.addEventListener("input", onSizeInput);
    heightInput.addEventListener("input", onSizeInput);

    document.getElementById("cropperClose").addEventListener("click", () => finish(null));
    document.getElementById("cropperCancel").addEventListener("click", () => finish(null));
    document.getElementById("cropperSkip").addEventListener("click", () => finish("skip"));
    document.getElementById("cropperApply").addEventListener("click", doApply);
    overlay.addEventListener("click", (e) => { if(e.target === overlay) finish(null); });
    document.addEventListener("keydown", (e) => {
      if(!overlay.classList.contains("open")) return;
      if(e.key === "Escape") finish(null);
    });

    // dragging to reposition
    let dragging = false, startX = 0, startY = 0, startTx = 0, startTy = 0;
    function point(e){ return e.touches && e.touches[0] ? { x:e.touches[0].clientX, y:e.touches[0].clientY } : { x:e.clientX, y:e.clientY }; }
    function down(e){
      if(!state) return;
      dragging = true;
      const p = point(e);
      startX = p.x; startY = p.y; startTx = state.tx; startTy = state.ty;
      frame.classList.add("dragging");
      e.preventDefault();
    }
    function move(e){
      if(!dragging || !state) return;
      const p = point(e);
      state.tx = startTx + (p.x - startX);
      state.ty = startTy + (p.y - startY);
      clampTranslate();
      renderTransform();
      e.preventDefault();
    }
    function up(){ dragging = false; frame.classList.remove("dragging"); }
    frame.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    frame.addEventListener("touchstart", down, { passive:false });
    window.addEventListener("touchmove", move, { passive:false });
    window.addEventListener("touchend", up);
  }

  function $$Active(container, activeBtn){
    Array.from(container.children).forEach(b => b.classList.toggle("active", b === activeBtn));
  }
  function setActivePreset(btn){
    const presets = document.getElementById("cropperPresets");
    Array.from(presets.children).forEach(b => b.classList.toggle("active", b === btn));
  }

  function applyRatio(ratio, refit, sizeOverride){
    if(!state) return;
    ratio = Math.max(0.25, Math.min(4, ratio || 1));
    const frame = document.getElementById("cropperFrame");
    let fw, fh;
    if(ratio >= 1){ fw = MAX_FRAME; fh = MAX_FRAME / ratio; }
    else { fh = MAX_FRAME; fw = MAX_FRAME * ratio; }
    frame.style.width = fw + "px";
    frame.style.height = fh + "px";
    state.frameW = fw; state.frameH = fh;

    if(sizeOverride){
      state.outputW = sizeOverride.w; state.outputH = sizeOverride.h;
    } else {
      const targetLong = Math.max(state.outputW || 0, state.outputH || 0, 800);
      if(ratio >= 1){ state.outputW = Math.round(targetLong); state.outputH = Math.round(targetLong / ratio); }
      else { state.outputH = Math.round(targetLong); state.outputW = Math.round(targetLong * ratio); }
    }
    document.getElementById("cropperWidth").value = state.outputW;
    document.getElementById("cropperHeight").value = state.outputH;

    if(refit) fitImage();
  }

  function fitImage(){
    const cover = Math.max(state.frameW / state.naturalW, state.frameH / state.naturalH);
    state.coverScale = cover;
    state.scale = cover;
    document.getElementById("cropperZoom").value = 1;
    state.tx = (state.frameW - state.naturalW * cover) / 2;
    state.ty = (state.frameH - state.naturalH * cover) / 2;
    renderTransform();
  }

  function setZoom(z){
    if(!state) return;
    const prevScale = state.scale;
    state.scale = state.coverScale * z;
    const cx = state.frameW / 2, cy = state.frameH / 2;
    const ratio = state.scale / prevScale;
    state.tx = cx - (cx - state.tx) * ratio;
    state.ty = cy - (cy - state.ty) * ratio;
    clampTranslate();
    renderTransform();
  }

  function clampTranslate(){
    const dispW = state.naturalW * state.scale;
    const dispH = state.naturalH * state.scale;
    const minTx = state.frameW - dispW, maxTx = 0;
    const minTy = state.frameH - dispH, maxTy = 0;
    state.tx = Math.min(maxTx, Math.max(minTx, state.tx));
    state.ty = Math.min(maxTy, Math.max(minTy, state.ty));
  }

  function renderTransform(){
    const img = document.getElementById("cropperImg");
    img.style.transformOrigin = "0 0";
    img.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  }

  function roundRectPath(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function doApply(){
    if(!state) return;
    const img = document.getElementById("cropperImg");
    const sx = -state.tx / state.scale;
    const sy = -state.ty / state.scale;
    const sW = state.frameW / state.scale;
    const sH = state.frameH / state.scale;

    const canvas = document.createElement("canvas");
    canvas.width = state.outputW; canvas.height = state.outputH;
    const ctx = canvas.getContext("2d");
    if(state.opts.round){
      const r = Math.min(state.outputW, state.outputH) * (state.opts.cornerRadiusRatio ?? 0.22);
      roundRectPath(ctx, 0, 0, state.outputW, state.outputH, r);
      ctx.clip();
    }
    ctx.drawImage(img, sx, sy, sW, sH, 0, 0, state.outputW, state.outputH);

    const dataUrl = state.opts.round
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL(state.opts.mime || "image/jpeg", state.opts.quality ?? 0.85);
    finish(dataUrl);
  }

  function finish(result){
    const overlay = document.getElementById("cropperOverlay");
    overlay.classList.remove("open");
    document.getElementById("cropperImg").src = "";
    if(state && state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state = null;
    if(resolvePromise){
      const r = resolvePromise;
      resolvePromise = null;
      r(result);
    }
  }

  window.openImageCropper = function(file, opts = {}){
    return new Promise((resolve) => {
      injectMarkup();
      resolvePromise = resolve;
      const overlay = document.getElementById("cropperOverlay");
      const img = document.getElementById("cropperImg");
      const objectUrl = URL.createObjectURL(file);

      document.getElementById("cropperTitle").textContent = opts.title || "Crop image";
      document.getElementById("cropperSkip").hidden = opts.allowSkip === false;
      setActivePreset(null);

      img.onload = () => {
        state = {
          naturalW: img.naturalWidth,
          naturalH: img.naturalHeight,
          outputW: opts.outputWidth || 1200,
          outputH: opts.outputHeight || 1200,
          opts, objectUrl
        };
        const ratio = (!opts.aspect || opts.aspect === "native")
          ? (state.naturalW / state.naturalH)
          : opts.aspect;
        overlay.classList.add("open");
        applyRatio(ratio, true);
      };
      img.src = objectUrl;
    });
  };
})();