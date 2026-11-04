(() => {
  const HOST_ID = "merch-pro-inline-listing";
  globalThis.__merchProObserver?.disconnect();
  if (globalThis.__merchProScanTimer) clearTimeout(globalThis.__merchProScanTimer);
  document.getElementById(HOST_ID)?.remove();
  if (globalThis.__merchProMessageListener) chrome.runtime.onMessage.removeListener(globalThis.__merchProMessageListener);
  const FIELD_CUES = {
    title: ["design title", "product title"],
    brand: ["brand"],
    bullet1: ["feature bullet 1", "bullet 1"],
    bullet2: ["feature bullet 2", "bullet 2"],
    description: ["product description", "description"]
  };
  let scanTimer = 0;

  const normalized = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const visible = (node) => {
    if (!node || !node.isConnected) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const controlFromLabel = (label) => {
    const id = label.htmlFor || label.getAttribute("for");
    if (id) {
      const target = document.getElementById(id);
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return target;
    }
    if (label.control) return label.control;
    const own = label.querySelector("input:not([type=hidden]), textarea");
    if (own) return own;
    let parent = label.parentElement;
    for (let i = 0; parent && i < 4; i++, parent = parent.parentElement) {
      const controls = [...parent.querySelectorAll("input:not([type=hidden]), textarea")].filter(visible);
      if (controls.length === 1) return controls[0];
    }
    return null;
  };
  const findField = (key) => {
    const cues = FIELD_CUES[key].map(normalized);
    const labels = [...document.querySelectorAll("label, legend")].filter(visible);
    for (const cue of cues) {
      const label = labels.find((node) => normalized(node.innerText || node.textContent).includes(cue));
      const control = label && controlFromLabel(label);
      if (control) return control;
    }
    const controls = [...document.querySelectorAll("input:not([type=hidden]), textarea")].filter(visible);
    for (const cue of cues) {
      const control = controls.find((node) => {
        const attrs = [node.getAttribute("aria-label"), node.getAttribute("name"), node.id, node.placeholder].map(normalized).join(" ");
        return attrs.includes(cue);
      });
      if (control) return control;
    }
    return null;
  };
  const findAllFields = () => Object.fromEntries(Object.keys(FIELD_CUES).map((key) => [key, findField(key)]));
  const hasAllFields = (fields) => Object.values(fields).every(Boolean);

  function listingContainer(fields) {
    const controls = Object.values(fields);
    let node = fields.title;
    for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
      if (!controls.every((control) => node.contains(control))) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width >= 550 && node !== document.body && node !== document.documentElement) return node;
    }
    return fields.title.parentElement?.parentElement || fields.title.parentElement;
  }

  async function resizeImageToInlineData(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const resized = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!resized) throw new Error("The artwork could not be prepared for analysis.");
      return inlineDataFromBlob(resized);
    } finally {
      bitmap.close();
    }
  }

  async function inlineDataFromBlob(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return {mime_type:"image/png", data:btoa(binary)};
  }

  const preparedFiles = new WeakMap();
  async function prepareFile(file) {
    if (!preparedFiles.has(file)) preparedFiles.set(file,resizeImageToInlineData(file));
    try { return await preparedFiles.get(file); }
    catch(error) { preparedFiles.delete(file); throw error; }
  }

  function artworkCandidates(fields) {
    const container = hasAllFields(fields) ? listingContainer(fields) : null;
    const formTop = container ? container.getBoundingClientRect().top + window.scrollY : Infinity;
    const images = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return image.complete && image.naturalWidth >= 300 && image.naturalHeight >= 300 && rect.width >= 160 && rect.height >= 160 && top < formTop;
    }).sort((a, b) => {
      const aTop = a.getBoundingClientRect().top + window.scrollY;
      const bTop = b.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(aTop - bTop) > 120) return aTop - bTop;
      return b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height;
    });
    const canvases = [...document.querySelectorAll("canvas")].filter((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return canvas.width >= 300 && canvas.height >= 300 && rect.width >= 160 && rect.height >= 160 && rect.top + window.scrollY < formTop;
    });
    return { images, canvases };
  }

  async function artworkPayload(fields) {
    const file = [...document.querySelectorAll('input[type="file"]')].map((input) => input.files?.[0]).find(Boolean);
    if (file) return { imageInlineData: await prepareFile(file), sourceName: file.name };

    const { images, canvases } = artworkCandidates(fields);
    for (const image of images) {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) return { imageInlineData: await inlineDataFromBlob(blob), sourceName: image.alt || "Uploaded artwork preview" };
      } catch (_) {
        const url = image.currentSrc || image.src;
        if (url && /^https:\/\//i.test(url)) return { imageUrl: url, sourceName: image.alt || "Artwork preview" };
      }
    }
    for (const canvas of canvases) {
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) return { imageInlineData: await resizeImageToInlineData(blob), sourceName: "Uploaded artwork preview" };
      } catch (_) {}
    }
    throw new Error("I couldn't find the uploaded artwork preview. Upload the design on this page and try again.");
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function applyListing(result) {
    const fields = findAllFields();
    if (!hasAllFields(fields)) throw new Error("Keep the Product details editor open so I can fill all five listing fields.");
    setNativeValue(fields.title, result.title.trim());
    setNativeValue(fields.brand, result.brand.trim());
    setNativeValue(fields.bullet1, result.bullet1.trim());
    setNativeValue(fields.bullet2, result.bullet2.trim());
    setNativeValue(fields.description, result.description.trim());
    await new Promise((resolve) => setTimeout(resolve, 400));
    const confirmed = findAllFields();
    if (!hasAllFields(confirmed) || Object.keys(FIELD_CUES).some((key) => confirmed[key].value !== result[key].trim())) {
      throw new Error("Amazon did not retain every field. Keep the editor open and generate again.");
    }
  }

  function reportText(result) {
    const trademark = result.trademarkReport || {};
    const copyright = result.copyrightReport || {};
    const analysis = result.analysis || {};
    const seoReport = result.seoReport;
    const intelligence = result.designIntelligence;
    const alternatives = (items) => Array.isArray(items) ? items.filter(Boolean).join(" · ") || "None suggested." : "None suggested.";
    const lines = [
      `Trademark risk: ${trademark.riskLevel || "Unrated"} — ${trademark.reasoning || "Preliminary AI review only."}`,
      `Trademark alternatives: ${alternatives(trademark.safeAlternatives)}`,
      `Copyright risk: ${copyright.riskLevel || "Unrated"} — ${copyright.reasoning || "Preliminary AI review only."}`,
      `Copyright alternatives: ${alternatives(copyright.safeAlternatives)}`,
      `Design: ${analysis.mainNiche || "—"} / ${analysis.subNiche || "—"}; ${analysis.designStyle || "—"}; ${analysis.toneVibe || "—"}`,
      `Artwork text: ${analysis.artworkText || "No visible text"} (${analysis.textConfidence || "unrated"})`,
      `English title wording: ${analysis.titleTextEnglish || "No visible text"}`,
      `Title event / theme / style: ${analysis.titleEvent || "No supported event"} / ${analysis.titleTheme || "—"} / ${analysis.titleStyle || "—"}`,
      ...(intelligence?.subject ? [
        `Visual subject: ${intelligence.subject.label}; interpretation: ${intelligence.interpretation || "—"}`,
        `Evidenced styles: ${intelligence.styles.map(item=>item.label).join(", ") || "None confirmed"}; animal treatment: ${intelligence.animalTreatment}`,
        `Ranked occasions: ${intelligence.occasions.map(item=>`${item.label} (${item.relation}; model estimate ${Math.round(item.confidence*100)}%)`).join(" · ") || "No supported occasion"}`,
        `Wearers: ${intelligence.audiences.filter(item=>item.kind === "wearer").map(item=>item.label).join(", ") || "Not established"}`,
        `Depicted people: ${intelligence.audiences.filter(item=>item.kind === "depicted").map(item=>item.label).join(", ") || "None established"}; potential recipients: ${intelligence.audiences.filter(item=>item.kind === "recipient").map(item=>item.label).join(", ") || "None established"}`,
        `Matching context: ${intelligence.familyMatching.map(item=>item.label).join(", ") || "Not established"}`,
        `Design uncertainties: ${intelligence.uncertainties.join("; ") || "None reported"}`,
        intelligence.confidenceBasis
      ] : []),
      `SEO primary: ${result.seoPlan?.primary || "—"}`,
      `SEO secondary: ${(result.seoPlan?.secondary || []).join(", ")}`,
      `SEO long-tail: ${(result.seoPlan?.longTail || []).join(", ")}`,
      ...(seoReport ? [
        `SEO Engine: ${seoReport.status} (local checks, not a ranking score)`,
        `Copy checks: lengths ${seoReport.checks.lengths ? "passed" : "needs correction"}; restricted terms ${seoReport.checks.restrictedCopy ? "passed" : "needs correction"}; description ${seoReport.checks.description ? "passed" : "needs correction"}`,
        `Keyword classification:\n${seoReport.keywords.map(item => `${item.term} — ${item.priority}; ${item.categories.join(", ")}; used in: ${item.usedIn.join(", ") || "plan only"}`).join("\n")}`,
        `Engine notes:\n${seoReport.issues.map(item => `[${item.severity}] ${item.message}`).join("\n") || "No additional copy issues found."}`,
        `Local edits: ${seoReport.changes.join(" ") || "No duplicate sentences to remove."}`,
        seoReport.basis
      ] : []),
      "Artwork-based plan; no search-volume measurements.",
      `Keywords: ${(Array.isArray(result.keywords) ? result.keywords : []).join(", ")}`,
      "AI checks are preliminary. Live trademark records were not fetched; review official USPTO records before publishing."
    ];
    return lines.join("\n\n");
  }

  function makeToolbar(container, fields) {
    if (document.getElementById(HOST_ID)) return;
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "display:block;box-sizing:border-box;width:100%;clear:both;position:relative;z-index:5;margin:12px 0 16px;";
    const shadow = host.attachShadow({ mode: "open" });
    const glyph = (name, className = "") => {
      const paths = {
        trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0V3Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-8-3h8v3H8z"/>',
        search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
        file:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
        tag:'<path d="m3 3 8 0 10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1"/>',
        settings:'<path d="m9 3-.5 2-2 1-2-.5-2 3 1.5 1.5v3L3 15l2 3 2-.5 2 1 .5 2h4l.5-2 2-1 2 .5 2-3-1.5-1.5v-3L21 9l-2-3-2 .5-2-1-.5-2Z"/><circle cx="12" cy="12" r="3"/>',
        close:'<path d="m6 6 12 12M18 6 6 18"/>',
        crown:'<path d="m3 6 4 4 5-7 5 7 4-4-2 12H5ZM6 21h12"/>',
        undo:'<path d="M8 7 3 12l5 5M3 12h10a6 6 0 0 1 6 6"/>',
        keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.1m3.9 0h.1m3.9 0h.1m3.9 0h.1M6 12h.1m3.9 0h.1m3.9 0h.1m3.9 0h.1M7 16h10"/>',
        picture:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
        shield:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',
        info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
      };
      return `<svg class="glyph ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
    };
    shadow.innerHTML = `
      <style>
        :host{all:initial;display:block;container-type:inline-size;color:#13203b;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
        *{box-sizing:border-box}[hidden]{display:none!important}button,input{font:inherit}button{cursor:pointer}.glyph{display:block;width:22px;height:22px;flex:none}
        .bar{position:relative;overflow:hidden;border:1px solid #e0e6f2;border-radius:20px;background:linear-gradient(120deg,#fff,#f3f6ff);box-shadow:0 6px 20px #1f3c6914,0 1px 3px #1f3c6910}
        .layout{display:grid;grid-template-columns:242px minmax(0,1fr) 208px;gap:18px 16px;padding:16px;align-items:start}
        .identity{grid-row:1/3;position:relative;overflow:hidden;align-self:stretch;border:1px solid #dce3f2;border-radius:17px;background:linear-gradient(135deg,#0a1329,#1d3156);box-shadow:0 3px 8px #1b386d0c}
        .identity::before{content:"";position:absolute;left:0;top:0;width:100px;height:28px;background:linear-gradient(135deg,#ffe0a4,#ffb32c);clip-path:polygon(0 0,100% 0,0 100%);pointer-events:none}
        .brand-row{display:flex;align-items:center;justify-content:center;gap:10px;min-height:70px;padding:14px 14px 10px}.brand-icon{width:42px;height:42px;object-fit:contain;border-radius:10px}.wordmark{display:block;width:151px;height:auto}
        .context{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:12px;min-height:calc(100% - 70px);padding:14px 12px 12px;border-radius:15px 15px 0 0;background:linear-gradient(125deg,#fff,#f0f4ff)}
        .design-context{display:grid;grid-template-columns:88px minmax(0,1fr);gap:12px;align-items:start}.preview{display:grid;place-items:center;aspect-ratio:1/1;overflow:hidden;border:1px solid #e1e7f2;border-radius:13px;background:#eaf0fa}.thumb{display:block;width:100%;height:100%;object-fit:contain}.design-placeholder{display:grid;justify-items:center;gap:4px;padding:8px 3px;color:#95a2ba;font-size:8px;text-align:center}.design-placeholder .glyph{width:28px;height:28px;stroke-width:1.5}.preview:has(.thumb:not([hidden])) .design-placeholder{display:none}
        .context-copy{min-width:0;padding-top:3px}.version{display:block;font-size:12px;font-weight:750;line-height:1.5;white-space:nowrap}.context-copy p{margin:5px 0 0;color:#637293;font-size:11px;line-height:1.5}.identity-footer{display:flex;justify-content:flex-end;min-height:30px}.undo{display:flex;align-items:center;justify-content:center;gap:7px;padding:7px 13px;border:1px solid #e1e7f4;border-radius:24px;background:#eaf0fc;color:#172b51;font-size:12px;font-weight:650;box-shadow:0 1px 1px #223e6820}.undo .glyph{width:17px;height:17px}.undo:hover{background:#dfe8fa}
        .inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-width:0;padding-top:1px;align-self:stretch}.field{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #dce3ef;border-radius:17px;background:#fff;box-shadow:0 4px 8px #1c3f7b10}.field label{display:flex;align-items:center;gap:11px;min-height:58px;padding:10px 12px;background:linear-gradient(120deg,#0b142d,#1c2e52);color:#fff;font-size:14px;font-weight:700;letter-spacing:-.3px;line-height:1.25}.label-icon{display:grid;place-items:center;flex:none;width:34px;height:34px;border:1px solid #ffb357;border-radius:50%;background:linear-gradient(135deg,#ff691c,#ff9c1a);color:#fff;box-shadow:inset 0 1px 2px #ffffff70}.label-icon .glyph{width:20px;height:20px}.label-text{position:relative;min-width:0;padding-bottom:9px}.label-text::after{content:"";position:absolute;left:0;bottom:0;width:42px;height:4px;border-radius:3px;background:#ffaf12}.input-wrap{position:relative;display:flex;align-items:stretch;flex:1;min-width:0;padding:12px;background:#fff}.input-wrap>.glyph{position:absolute;right:24px;top:50%;transform:translateY(-50%);width:20px;height:20px;pointer-events:none;color:#7181a2}.phrase{display:block;width:100%;height:100%;min-height:56px;min-width:0;padding:13px 39px 13px 13px;border:1px solid #dce3f0;border-radius:13px;background:#f6f8fe;color:#25385b;font-size:12px;box-shadow:inset 0 1px 3px #1d3a6810;transition:box-shadow .15s,border-color .15s}.phrase::placeholder{color:#6d7b98;opacity:1}.phrase:focus{outline:none;border-color:#ffae26;background:#fff;box-shadow:0 0 0 3px #ffb62f1c}
        .actions{display:flex;flex-direction:column;align-self:stretch;justify-content:center;position:relative;min-width:0;padding:20px 0 8px}.rays{display:flex;justify-content:center;align-items:flex-end;gap:8px;height:17px;margin-bottom:12px}.rays i{width:4px;height:16px;background:#ffb600;border-radius:4px}.rays i:first-child{height:12px;transform:rotate(-40deg)}.rays i:last-child{height:12px;transform:rotate(40deg)}.go{display:flex;align-items:center;justify-content:center;gap:11px;min-height:85px;width:100%;padding:15px 13px;border:1px solid #ffad23;border-bottom-color:#e5570a;border-radius:18px;background:linear-gradient(155deg,#ffb40c,#ff8a00 50%,#fa4212);color:white;font-size:17px;font-weight:700;line-height:1.2;text-align:left;box-shadow:0 7px 15px #ff860025,inset 0 1px 1px #fff8;transition:transform .15s,box-shadow .15s}.go::before{content:"✦";font-size:30px;line-height:1}.go::after{content:"›";margin-left:auto;font:400 36px/1 Arial,sans-serif}.go:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 18px #ff860035}.go:active:not(:disabled){transform:translateY(0)}.go:disabled{cursor:progress;opacity:.8}.go:disabled::before{content:"";width:19px;height:19px;border:2px solid #fff6;border-top-color:white;border-radius:50%;animation:merch-spin .8s linear infinite}.go:disabled::after{content:""}.tm-check{width:100%;min-height:37px;margin-top:9px;padding:8px 10px;border:1px solid #d82f43;border-radius:9px;background:#df3347;color:#fff;font-size:11px;font-weight:750;line-height:1.2;box-shadow:0 2px 5px #a8203425}.tm-check:hover:not(:disabled){background:#c92338}.tm-check:disabled{opacity:.72;cursor:progress}.tm-results{grid-column:1/-1;display:grid;gap:10px;padding:14px;border:1px solid #dce4f4;border-radius:14px;background:#fff}.tm-results-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.tm-results-title{margin:0;color:#142747;font-size:13px;font-weight:750}.tm-results-note{margin:4px 0 0;color:#667795;font-size:10px;line-height:1.5}.tm-close{border:0;background:transparent;color:#75839d;font-size:20px;line-height:1}.tm-scan-state{color:#4e6282;font-size:11px}.tm-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tm-field{display:grid;gap:7px;padding:10px;border:1px solid #e3e9f3;border-radius:10px}.tm-field-name{color:#4c6080;font-size:10px;font-weight:750}.tm-chip-list{display:flex;flex-wrap:wrap;gap:6px}.tm-chip{padding:5px 8px;border:1px solid;border-radius:6px;font-size:10px;font-weight:750}.tm-chip.single{border-color:#e9ad00;background:#ffd747;color:#382700}.tm-chip.multi{border-color:#c52136;background:#ce263b;color:#fff}.tm-empty{color:#8792a6;font-size:10px}.tm-modal{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:18px;background:#0d1b32a8}.tm-dialog{display:grid;gap:12px;width:min(620px,94vw);max-height:82vh;overflow:auto;padding:18px;border:1px solid #dbe3f2;border-radius:16px;background:#fff;color:#172746;box-shadow:0 20px 60px #07152d70}.tm-dialog-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.tm-dialog-title{margin:0;font-size:16px;font-weight:800}.tm-dialog-close{width:30px;height:30px;border:0;border-radius:50%;background:#edf1f8;color:#596984;font-size:18px}.tm-dialog-note{margin:0;color:#65738d;font-size:11px;line-height:1.5}.tm-record-list{display:grid;gap:9px}.tm-record{display:grid;gap:5px;padding:11px;border:1px solid #e1e7f1;border-radius:10px;background:#f8faff}.tm-record-mark{font-size:13px;font-weight:800}.tm-record-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:#536681;font-size:10px}.tm-record-badge{padding:3px 6px;border-radius:5px;background:#e3f5e9;color:#17673a;font-weight:750}.tm-record a{color:#155bb4;font-size:11px;font-weight:750}.tm-record-sub{color:#6b7890;font-size:10px;line-height:1.4}.tm-footer-note{padding:9px;border-radius:8px;background:#fff7e0;color:#6b4c00;font-size:10px;line-height:1.5}
        .feedback{grid-column:2/-1;display:grid;gap:10px;align-self:end;min-width:0}.message-strip{display:flex;align-items:center;gap:11px;min-height:45px;padding:12px 15px;border:1px solid #dce9ff;border-radius:14px;background:linear-gradient(100deg,#e6efff,#dce9ff);color:#203f72}.message-strip>.glyph{width:22px;height:22px;color:#087cf1}.state{display:none;flex:1;min-width:0;font-size:11px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.state.show{display:block}.status-mark{display:none}.message-strip:has(.state.good) .status-mark{display:block;color:#0d7de9}.message-strip:has(.state.bad){border-color:#f3d3cc;background:#fff1ed;color:#a4382c}.message-strip:has(.state.bad)>.glyph{color:#c64e35}.details{display:none;min-width:0}.details.show{display:block}.details summary{color:#536987;font-size:10px;font-weight:600;cursor:pointer}.details pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border:1px solid #e0e7f4;border-radius:10px;background:#f6f8fe;color:#354c72;font:11px/1.6 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.details a{color:#2d609f;font-size:11px}
        .tools{position:absolute;right:8px;top:5px;z-index:2;display:flex;gap:4px}.tool{display:grid;place-items:center;width:21px;height:21px;padding:4px;border:0;border-radius:50%;background:#eaf0f9;color:#8390a7}.tool .glyph{width:12px;height:12px}.tool:hover{background:#dde7f7;color:#1e355b}.tool:focus-visible,.go:focus-visible,.undo:focus-visible,.reopen:focus-visible{outline:3px solid #ffb52d;outline-offset:3px}.reopen{padding:9px 14px;border:1px solid #253b62;border-radius:10px;background:#132541;color:white;font-size:12px;font-weight:650}
        .capitalize{align-self:center;margin-top:8px;padding:6px 10px;border:1px solid #cdd8eb;border-radius:7px;background:#edf2fb;color:#233e66;font-size:10px;font-weight:650}.capitalize:hover{background:#dfe9fa}.capitalize:focus-visible{outline:3px solid #ffb52d;outline-offset:2px}
        @keyframes merch-spin{to{transform:rotate(360deg)}}
        @container(max-width:1150px){.layout{grid-template-columns:215px minmax(0,1fr) 175px;gap:14px 12px;padding:14px}.brand-row{gap:7px;padding-left:10px;padding-right:10px}.brand-icon{width:36px;height:36px}.wordmark{width:139px}.design-context{grid-template-columns:73px minmax(0,1fr);gap:9px}.context{padding:12px 10px}.version{font-size:11px}.context-copy p{font-size:10px}.inputs{gap:10px}.field label{font-size:12px;padding:10px;gap:8px;min-height:58px}.label-icon{width:28px;height:28px}.label-icon .glyph{width:17px;height:17px}.input-wrap{padding:10px}.input-wrap>.glyph{right:20px;width:17px;height:17px}.phrase{height:53px;font-size:11px;padding-left:10px;padding-right:32px}.go{font-size:15px;padding:14px 11px;gap:8px}.go::before{font-size:24px}.go::after{font-size:30px}.state{font-size:10px}}
        @container(max-width:920px){.layout{grid-template-columns:200px minmax(0,1fr)}.identity{grid-row:1/4}.inputs{grid-column:2;grid-row:1}.actions{grid-column:2;grid-row:2;align-items:flex-end;padding:0}.rays{display:none}.go{width:210px;min-height:49px;font-size:14px;text-align:center}.tm-check{width:210px}.go::after{margin-left:0}.feedback{grid-column:2;grid-row:3}.field label{font-size:12px}.label-icon{display:none}.tools{top:4px}.context{min-height:calc(100% - 70px)}.brand-row{flex-wrap:wrap;gap:5px;min-height:80px}.wordmark{width:136px}.brand-icon{width:34px;height:34px}.context{min-height:calc(100% - 80px)}.design-context{grid-template-columns:66px minmax(0,1fr)}.version{font-size:10px}.message-strip{padding:10px;gap:8px}.message-strip>.glyph{width:19px;height:19px}}
        @container(max-width:650px){.layout{grid-template-columns:1fr;gap:16px;padding:12px}.identity{grid-row:auto;grid-column:1}.brand-row{min-height:62px;justify-content:flex-start;padding:12px 14px;flex-wrap:nowrap;gap:10px}.brand-icon{width:35px;height:35px}.wordmark{width:147px}.context{min-height:0;flex-direction:row;align-items:center;padding:12px 14px;gap:10px}.design-context{flex:1;grid-template-columns:51px minmax(0,1fr);gap:11px}.context-copy p{font-size:10px;line-height:1.4}.version{font-size:11px}.preview{border-radius:10px}.design-placeholder{font-size:0;padding:10px}.design-placeholder .glyph{width:25px;height:25px}.identity-footer{min-height:0}.undo{padding:7px 10px;font-size:10px}.undo .glyph{width:14px;height:14px}.inputs{grid-column:1;grid-row:auto;gap:11px}.actions{grid-column:1;grid-row:auto;padding:0;align-items:stretch}.go,.tm-check{width:100%;min-height:51px}.feedback{grid-column:1;grid-row:auto}.tools{top:26px;right:23px}.tool{background:#2b3c5c;color:#cfdaec}.tool:hover{background:#3c5175;color:#fff}.state{font-size:11px}.message-strip{border-radius:12px}}
        @container(max-width:650px){.tm-sections{grid-template-columns:1fr}.tm-dialog{width:96vw;padding:13px}}
        @container(max-width:450px){.inputs{grid-template-columns:1fr}.field label{min-height:46px;font-size:13px;gap:9px;padding:8px 11px}.label-icon{display:grid;width:27px;height:27px}.label-text{padding-bottom:7px}.label-text::after{height:3px;width:37px}.input-wrap{padding:10px}.phrase{height:49px;font-size:12px}.context{align-items:flex-start}.context-copy p{max-width:145px}.undo{font-size:0;padding:8px}.undo .glyph{width:17px;height:17px}.bar{border-radius:17px}}
        .layout{gap:10px 12px;padding:12px}.identity{grid-row:1}.brand-row{min-height:50px;padding:8px 10px}.brand-icon{width:34px;height:34px}.wordmark{width:132px}.context{min-height:0;gap:6px;padding:8px 10px}.design-context{grid-template-columns:60px minmax(0,1fr);gap:8px}.context-copy p{margin-top:2px;font-size:10px}.identity-footer{min-height:0}.inputs{gap:10px;padding-top:0}.field label{min-height:48px;padding:8px 10px;font-size:12px}.label-icon{width:28px;height:28px}.label-icon .glyph{width:17px;height:17px}.input-wrap{padding:9px}.phrase{height:100%;min-height:48px;font-size:12px}.actions{padding:0;justify-content:center}.rays{display:none}.go{min-height:66px;font-size:15px}.feedback{grid-column:1/-1;align-self:start}.message-strip{min-height:39px;padding:9px 12px}
        @container(max-width:920px){.identity{grid-row:1/3}.feedback{grid-column:1/-1;grid-row:3}.actions{align-items:flex-end}.go{min-height:54px}.context{min-height:0}}
        @container(max-width:650px){.identity{grid-row:auto}.feedback{grid-row:auto}.actions{align-items:stretch}.go{width:100%;min-height:51px}.layout{gap:10px;padding:10px}.inputs{align-self:auto}.phrase{height:53px}}
        @media(prefers-reduced-motion:reduce){.go,.phrase{transition:none}.go:disabled::before{animation:none}}
      </style>
      <button class="reopen" type="button" hidden>Show MerchPilot</button>
      <section class="bar" aria-label="MerchPilot listing generator">
        <div class="tools"><button class="tool settings" type="button" aria-label="Open AI settings" title="AI settings">${glyph("settings")}</button><button class="tool close" type="button" aria-label="Collapse MerchPilot" title="Collapse">${glyph("close")}</button></div>
        <div class="layout">
          <aside class="identity">
            <div class="brand-row"><img class="brand-icon" src="${chrome.runtime.getURL("icons/icon-128.png")}" alt="" width="42" height="42"/><img class="wordmark" src="${chrome.runtime.getURL("icons/wordmark.png")}" alt="MerchPilot" width="151" height="27"/></div>
            <div class="context"><div class="design-context"><div class="preview"><img class="thumb" hidden alt="Current design used as visual reference"/><div class="design-placeholder">${glyph("picture")}<span>Design photo</span></div></div><div class="context-copy"><span class="version">v1.2.33 · AI listing</span><p>Main Niche or first relevant Keyword starts Title</p></div></div><div class="identity-footer"><button class="undo" type="button" hidden aria-label="Undo fill" title="Restore previous listing">${glyph("undo")}<span>Undo fill</span></button></div></div>
          </aside>
          <div class="inputs">
            <div class="field"><label for="merch-pro-main-niche"><span class="label-icon">${glyph("tag")}</span><span class="label-text">Main Niche</span></label><div class="input-wrap"><input class="phrase main-niche" id="merch-pro-main-niche" type="text" placeholder="e.g. Science Teacher" maxlength="60"/>${glyph("tag")}</div></div>
            <div class="field"><label for="merch-pro-keywords"><span class="label-icon">${glyph("search")}</span><span class="label-text">Keywords</span></label><div class="input-wrap"><input class="phrase keywords" id="merch-pro-keywords" type="text" placeholder="Chemistry Teacher, Physics Teacher, STEM Teacher"/>${glyph("keyboard")}</div></div>
          </div>
          <div class="actions"><span class="rays" aria-hidden="true"><i></i><i></i><i></i></span><button class="go" type="button">Generate listing &amp; fill</button><button class="tm-check" type="button">TM Trademark US</button><button class="capitalize" type="button" title="Capitalize each word across the full listing">Aa · Capitalize Listing</button></div>
          <div class="feedback"><div class="message-strip">${glyph("info")}<span class="state show" role="status" aria-live="polite">Main Niche starts Title; when blank, the first matching Keyword does.</span>${glyph("shield","status-mark")}</div><details class="details"><summary>View keyword and safety notes</summary><pre></pre><a href="https://tmsearch.uspto.gov/search/" target="_blank" rel="noopener">Open official USPTO Trademark Search ↗</a></details></div>
          <section class="tm-results" hidden aria-live="polite"><div class="tm-results-head"><div><h3 class="tm-results-title">USPTO exact trademark matches</h3><p class="tm-results-note">The full text appears below each listing field. Exact live, registered Class 025 matches are highlighted: yellow for one word, red for phrases of two to six words.</p></div><button class="tm-close" type="button" aria-label="Close trademark status">×</button></div><div class="tm-scan-state"></div></section>
        </div>
      </section>`;
    const button = shadow.querySelector(".go");
    const state = shadow.querySelector(".state");
    const details = shadow.querySelector(".details");
    const pre = shadow.querySelector("pre");
    const undo = shadow.querySelector(".undo");
    const bar = shadow.querySelector(".bar");
    const reopen = shadow.querySelector(".reopen");
    shadow.querySelector(".capitalize").addEventListener("click", () => {
      const fields = findAllFields();
      if (!hasAllFields(fields)) {
        state.className = "state show bad";
        state.textContent = "Open the Product details editor first.";
        return;
      }
      for (const key of Object.keys(FIELD_CUES)) {
        const value = fields[key].value.replace(/\b[a-z]/g, letter => letter.toUpperCase());
        setNativeValue(fields[key], value);
      }
      document.querySelectorAll("[data-merchpilot-trademark-results]").forEach(preview => preview.remove());
      state.className = "state show good";
      state.textContent = "Full listing capitalized. Run the trademark check again to refresh the previews.";
    });
    const trademarkButton = shadow.querySelector(".tm-check");
    const trademarkResults = shadow.querySelector(".tm-results");
    const trademarkState = shadow.querySelector(".tm-scan-state");
    const trademarkModal = document.createElement("div");
    trademarkModal.className = "tm-modal";
    trademarkModal.hidden = true;
    trademarkModal.innerHTML = '<section class="tm-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-dialog-title"><header class="tm-dialog-head"><h3 class="tm-dialog-title" id="tm-dialog-title"></h3><button class="tm-dialog-close" type="button" aria-label="Close">×</button></header><p class="tm-dialog-note"></p><div class="tm-record-list"></div><div class="tm-footer-note">This is a preliminary database match, not legal clearance. Review each official record and related goods before relying on it.</div></section>';
    shadow.querySelector(".bar").append(trademarkModal);
    const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
    const fieldLabels = { title: "Title", brand: "Brand", bullet1: "Bullet 1", bullet2: "Bullet 2", description: "Product Description" };
    const closeTrademarkModal = () => { trademarkModal.hidden = true; };
    const showTrademarkRecords = (term) => {
      trademarkModal.querySelector(".tm-dialog-title").textContent = term.phrase;
      trademarkModal.querySelector(".tm-dialog-note").textContent = `${term.records.length} matching live, registered Class 025 record${term.records.length === 1 ? "" : "s"} found.`;
      const list = trademarkModal.querySelector(".tm-record-list");
      list.replaceChildren();
      for (const record of term.records) {
        const card = document.createElement("article");
        card.className = "tm-record";
        const serial = String(record.serial || "").replace(/\D/g, "");
        const serialLink = serial ? `<a href="https://tsdr.uspto.gov/#caseNumber=${encodeURIComponent(serial)}&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch" target="_blank" rel="noopener noreferrer">Serial ${escapeHTML(serial)} ↗</a>` : "<span>Serial unavailable</span>";
        const reg = record.registration ? ` · Registration ${escapeHTML(record.registration)}` : "";
        const classes = (record.classes || []).map(value => escapeHTML(value)).join(", ") || "025";
        card.innerHTML = `<div class="tm-record-mark">${escapeHTML(record.mark)}</div><div class="tm-record-meta"><span class="tm-record-badge">LIVE · REGISTERED</span><span>Class ${classes}</span></div><div class="tm-record-meta">${serialLink}${reg}</div>${record.owner ? `<div class="tm-record-sub">Owner: ${escapeHTML(record.owner)}</div>` : ""}${record.goods ? `<div class="tm-record-sub">Goods/services: ${escapeHTML(record.goods.slice(0, 350))}</div>` : ""}`;
        list.append(card);
      }
      trademarkModal.hidden = false;
    };
    trademarkResults.querySelector(".tm-close").addEventListener("click", () => { trademarkResults.hidden = true; });
    trademarkModal.querySelector(".tm-dialog-close").addEventListener("click", closeTrademarkModal);
    trademarkModal.addEventListener("click", event => { if (event.target === trademarkModal) closeTrademarkModal(); });
    trademarkButton.addEventListener("click", async () => {
      const fields = findAllFields();
      const listing = Object.fromEntries(["title", "brand", "bullet1", "bullet2", "description"].map(key => [key, String(fields[key]?.value || "").trim()]));
      if (!listing.title && !listing.brand && !listing.bullet1 && !listing.bullet2 && !listing.description) {
        state.className = "state show bad";
        state.textContent = "Generate or enter the listing first, then check its trademarks.";
        return;
      }
      trademarkButton.disabled = true;
      trademarkButton.textContent = "Checking USPTO…";
      trademarkResults.hidden = false;
      document.querySelectorAll("[data-merchpilot-trademark-results]").forEach(node => node.remove());
      trademarkState.textContent = "Searching for exact wordmark matches across the complete listing…";
      try {
        const response = await chrome.runtime.sendMessage({ type: "MERCH_PRO_CHECK_TRADEMARKS", fields: listing });
        if (!response?.ok) throw new Error(response?.error || "The USPTO search did not complete.");
        const result = response.result;
        trademarkState.textContent = result.matchedCount
          ? `${result.matchedCount} exact phrase${result.matchedCount === 1 ? "" : "s"} matched among ${result.checkedCount} checked. Click a colored phrase below its field to review the USPTO records.${result.truncated ? " Some lower-ranked results may not be shown." : ""}`
          : `No exact live, registered Class 025 matches found among ${result.checkedCount} checked phrases.`;
        for (const section of result.sections) {
          const control = findField(section.field);
          if (!control?.isConnected) continue;
          const host = document.createElement("div");
          host.dataset.merchpilotTrademarkResults = "true";
          host.setAttribute("aria-label", `${fieldLabels[section.field] || section.field} trademark scan preview`);
          host.style.cssText = "display:block;width:100%;margin:7px 0 14px;color:#00a99d;font:400 14px/1.65 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;";
          const value = String(listing[section.field] || "");
          const tokens = [...value.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)].map(match => ({ text: match[0].replace(/[’]/g, "'").toLowerCase(), start: match.index, end: match.index + match[0].length }));
          const intervals = [];
          for (const term of section.terms) {
            const phraseWords = term.phrase.split(" ");
            for (let start = 0; start + phraseWords.length <= tokens.length; start++) {
              if (tokens.slice(start, start + phraseWords.length).map(token => token.text).join(" ") === term.phrase) {
                intervals.push({ start: tokens[start].start, end: tokens[start + phraseWords.length - 1].end, term });
              }
            }
          }
          intervals.sort((a, b) => a.start - b.start || b.end - a.end);
          let cursor = 0;
          for (const interval of intervals) {
            if (interval.start < cursor) continue;
            if (interval.start > cursor) host.append(document.createTextNode(value.slice(cursor, interval.start)));
            const mark = document.createElement("span");
            mark.setAttribute("role", "button");
            mark.tabIndex = 0;
            mark.textContent = value.slice(interval.start, interval.end);
            mark.title = "Click to view exact USPTO trademark records";
            mark.setAttribute("aria-label", `${interval.term.phrase}, exact USPTO match. Click to view records.`);
            mark.style.cssText = interval.term.wordCount === 1
              ? "display:inline!important;width:auto!important;max-width:none!important;min-height:0!important;float:none!important;clear:none!important;padding:3px 5px;margin:0;background:#ffc400;color:#111;font:inherit;line-height:inherit;cursor:pointer;vertical-align:baseline;box-decoration-break:clone;-webkit-box-decoration-break:clone;"
              : "display:inline!important;width:auto!important;max-width:none!important;min-height:0!important;float:none!important;clear:none!important;padding:3px 5px;margin:0;background:#c92539;color:#fff;font-family:inherit;font-size:inherit;font-weight:700;line-height:inherit;cursor:pointer;vertical-align:baseline;box-decoration-break:clone;-webkit-box-decoration-break:clone;";
            mark.addEventListener("click", () => showTrademarkRecords(interval.term));
            mark.addEventListener("keydown", event => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showTrademarkRecords(interval.term); }
            });
            host.append(mark);
            cursor = interval.end;
          }
          if (cursor < value.length) host.append(document.createTextNode(value.slice(cursor)));
          if (!value) host.textContent = "No text in this field.";
          // Amazon may order a textarea inside a flex wrapper. Place the
          // preview after the complete field wrapper, outside that ordering.
          let previewAnchor = control;
          const controlRect = control.getBoundingClientRect();
          for (let depth = 0; depth < 5; depth++) {
            const parent = previewAnchor.parentElement;
            if (!parent || parent === document.body) break;
            const controls = parent.querySelectorAll("input:not([type=hidden]), textarea, select");
            const rect = parent.getBoundingClientRect();
            if (controls.length !== 1 || controls[0] !== control || rect.width > controlRect.width + 80 || rect.height > controlRect.height + 180) break;
            previewAnchor = parent;
          }
          const parentStyle = getComputedStyle(previewAnchor.parentElement);
          if (parentStyle.display.includes("flex")) {
            const anchorOrder = Number(getComputedStyle(previewAnchor).order) || 0;
            host.style.order = String(anchorOrder + (parentStyle.flexDirection === "column-reverse" ? -1 : 1));
          }
          previewAnchor.insertAdjacentElement("afterend", host);
        }
      } catch (error) {
        trademarkState.textContent = error.message || "The USPTO search did not complete.";
      } finally {
        trademarkButton.disabled = false;
        trademarkButton.textContent = "TM Trademark US";
      }
    });
    shadow.querySelector(".close").addEventListener("click", () => { bar.hidden = true; reopen.hidden = false; });
    reopen.addEventListener("click", () => { bar.hidden = false; reopen.hidden = true; });
    shadow.querySelector(".settings").addEventListener("click", async () => {
      try {
        const response = await chrome.runtime.sendMessage({type:"MERCH_PRO_OPEN_SETTINGS"});
        if (!response?.ok) throw new Error(response?.error || "Could not open AI settings.");
      } catch (error) { state.className = "state show bad"; state.textContent = error.message; }
    });
    let previousFields = null;
    // A user retry includes the previous generation failure so the model can
    // reassess or repair it instead of repeating the same response blindly.
    let previousGenerationError = "";
    let previousErrorWasBlock = false;
    undo.addEventListener("click", async () => {
      if (!previousFields) return;
      await applyListing(previousFields);
      undo.hidden = true;
      state.textContent = "Previous field values restored.";
    });
    button.addEventListener("click", async () => {
      const retryError = previousGenerationError;
      const retryWasBlocked = previousErrorWasBlock;
      previousGenerationError = "";
      previousErrorWasBlock = false;
      let progressTimer;
      let deadlineTimer;
      button.disabled = true;
      button.textContent = "Preparing listing…";
      state.className = "state show";
      state.textContent = "Checking Main Niche and Keywords against the design…";
      details.classList.remove("show");
      try {
        const activeFields = findAllFields();
        if (!hasAllFields(activeFields)) throw new Error("Open the Product details editor first.");
        if (/[,،;؛\n|]/.test(shadow.querySelector(".main-niche").value)) throw new Error("Main Niche must be one phrase. Put additional phrases in Keywords, separated by commas.");
        previousFields = Object.fromEntries(Object.entries(activeFields).map(([key, input]) => [key, input.value]));
        await applyListing(Object.fromEntries(Object.keys(activeFields).map(key => [key, ""])));
        undo.hidden = false;
        const artwork = await artworkPayload(activeFields);
        const thumb = shadow.querySelector(".thumb");
        thumb.src = artwork.imageInlineData ? `data:${artwork.imageInlineData.mime_type};base64,${artwork.imageInlineData.data}` : artwork.imageUrl;
        thumb.hidden = false;
        state.textContent = "Checking the artwork and building a niche-first listing with relevant Keywords…";
        let seconds = 0;
        progressTimer = setInterval(() => { button.textContent = `Generating… ${++seconds}s`; }, 1000);
        button.textContent = "Generating…";
        if (!shadow.querySelector(".main-niche").value.trim()) state.textContent = "Main Niche is blank; using the first design-matched Keyword, or the artwork niche if none fit.";
        const generation = chrome.runtime.sendMessage({
          type: "MERCH_PRO_GENERATE_MERCH_LISTING",
          ...artwork,
          extraKeywords: shadow.querySelector(".keywords").value.trim(),
          mainNiche: shadow.querySelector(".main-niche").value.trim(),
          retryError,
          retryWasBlocked
        });
        const deadline = new Promise((_, reject) => { deadlineTimer = setTimeout(() => reject(new Error("The generation did not finish. Check the API connection and retry.")), 250000); });
        const response = await Promise.race([generation, deadline]);
        if (!response?.ok) throw new Error(response?.error || "Could not generate the listing.");
        if (response.result?.blocked) {
          previousGenerationError = String(response.result.blockReason || "The design needs policy review.").slice(0, 1200);
          previousErrorWasBlock = true;
          state.className = "state show bad";
          state.textContent = `Listing not filled: ${response.result.blockReason || "The design needs policy review."}`;
          pre.textContent = reportText(response.result);
          details.classList.add("show");
          return;
        }
        const trademarkRisk = String(response.result?.trademarkReport?.riskLevel || "").toUpperCase();
        const copyrightRisk = String(response.result?.copyrightReport?.riskLevel || "").toUpperCase();
        if (trademarkRisk === "HIGH" || copyrightRisk === "HIGH") {
          state.className = "state show bad";
          state.textContent = "High preliminary intellectual-property risk. The listing fields were cleared; use Undo fill to restore them, and review the alternatives and do a human clearance check.";
          pre.textContent = reportText(response.result);
          details.classList.add("show");
          return;
        }
        await applyListing(response.result);
        undo.hidden = false;
        state.className = "state show good";
        const titleLength = String(response.result.title || "").length;
        const titleNotice = titleLength > 60 ? ` Title is ${titleLength} characters (extension limit: 60); generate again after checking the design.` : "";
        const nicheNotice = response.result.analysis?.mainNicheSource === "keywords" ? " Main Niche was blank; used the first design-matched Keyword." : response.result.analysis?.mainNicheSource === "artwork" ? " Main Niche was blank; used the verified artwork niche because no Keyword fit." : "";
        state.textContent = `${response.result.reused ? "Recent result reused. " : ""}Listing filled. Description contains only Bullet 1 + Bullet 2.${nicheNotice}${titleNotice} Review all fields and the safety notes before saving on Amazon.`;
        pre.textContent = reportText(response.result);
        details.classList.add("show");
      } catch (error) {
        previousGenerationError = String(error?.message || "Could not generate the listing.").slice(0, 1200);
        previousErrorWasBlock = false;
        state.className = "state show bad";
        state.textContent = error.message || "Could not generate the listing. Check the extension settings and try again.";
      } finally {
        clearInterval(progressTimer);
        clearTimeout(deadlineTimer);
        button.disabled = false;
        button.textContent = "Generate listing & fill";
      }
    });
    // Mount beside the editor row, never as another column inside Amazon's flex layout.
    let anchor = container;
    while (anchor.parentElement && anchor.parentElement !== document.body) {
      const parentStyle = getComputedStyle(anchor.parentElement);
      if ((parentStyle.display.includes("flex") && !parentStyle.flexDirection.startsWith("column")) || parentStyle.display.includes("grid")) anchor = anchor.parentElement;
      else break;
    }
    anchor.before(host);
  }

  const messageListener = (message, _sender, sendResponse) => {
    if (message?.type !== "MERCH_PRO_READ_PAGE") return;
    (async () => {
      if (location.hostname === "merch.amazon.com") return artworkPayload(findAllFields());
      const image = document.querySelector("#landingImage, #imgBlkFront, #imageBlock img");
      if (!image) throw new Error("No artwork or product image was found on this page.");
      return { imageUrl: image.getAttribute("data-old-hires") || image.currentSrc || image.src, sourceName: "Amazon product image" };
    })().then((data) => sendResponse({ ok: true, data })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  };
  globalThis.__merchProMessageListener = messageListener;
  chrome.runtime.onMessage.addListener(messageListener);

  function scan() {
    scanTimer = 0;
    if (!location.hostname.endsWith("merch.amazon.com")) return;
    const fields = findAllFields();
    if (hasAllFields(fields)) makeToolbar(listingContainer(fields), fields);
  }

  const observer = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = window.setTimeout(scan, 350);
    globalThis.__merchProScanTimer = scanTimer;
  });
  globalThis.__merchProObserver = observer;
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
