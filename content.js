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
    shadow.innerHTML = `
      <style>
        :host{all:initial;display:block;font-family:Arial,Helvetica,sans-serif} .bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 12px;border:1px solid #efb4bf;border-radius:12px;background:#fff5f6;box-shadow:0 2px 8px #8a153012;color:#3d242c}.copy{display:grid;gap:2px;flex:0 1 210px;min-width:145px}.copy b{font-size:14px}.copy span{font-size:11px;color:#80616b}.phrase{flex:1 1 230px;max-width:340px;min-width:160px;box-sizing:border-box;border:1px solid #e8cbd2;border-radius:8px;background:#fff;color:#3d242c;padding:8px 10px;font:12px Arial,sans-serif}.go{margin-left:auto;white-space:nowrap;border:0;border-radius:9px;padding:10px 16px;background:#dc2448;color:#fff;font-weight:700;font-size:13px;cursor:pointer}.thumb{width:62px;height:62px;object-fit:contain;background:#eee;border-radius:8px}.thumb[hidden]{display:none}.undo{border:1px solid #efb4bf;border-radius:8px;background:#fff;padding:8px;cursor:pointer}.undo[hidden]{display:none}.go:hover{background:#b91135}.go:disabled{opacity:.6;cursor:progress}.state{display:none;flex-basis:100%;white-space:pre-wrap;font-size:12px;line-height:1.5;color:#53333e}.state.show{display:block}.state.bad{color:#a32626}.state.good{color:#126139}.details{display:none;flex-basis:100%;margin-top:4px}.details.show{display:block}.details summary{cursor:pointer;font-size:12px;font-weight:700}.details pre{white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.5 Arial,sans-serif;padding:10px;border-radius:8px;background:#fbe7eb;color:#53333e}.details a{color:#bd193c;font-size:12px}
      </style>
      <style>
        .go{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:44px;padding:12px 20px;border:1px solid #b91c3c;border-radius:12px;background:linear-gradient(135deg,#ed3658,#bd1236);box-shadow:0 4px 12px #bd12362b,inset 0 1px 0 #ffffff38;font:600 13px Arial,sans-serif;letter-spacing:.15px;transition:box-shadow .18s,transform .18s,background .18s}.go::before{content:"✦";font-size:19px;line-height:1}.go:hover:not(:disabled){background:linear-gradient(135deg,#f04464,#a80e2e);box-shadow:0 6px 16px #bd123640;transform:translateY(-1px)}.go:active:not(:disabled){transform:translateY(0)}.go:focus-visible{outline:3px solid #f2a2b2;outline-offset:3px}.go:disabled{opacity:.8;transform:none}.go:disabled::before{content:"";width:13px;height:13px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:merch-spin .8s linear infinite}.phrase{min-height:44px;border-radius:10px;max-width:400px}.phrase:focus{outline:2px solid #ed365855;border-color:#dc2448}@keyframes merch-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.go{transition:none}.go:disabled::before{animation:none}}
      </style>
      <div class="bar"><div class="copy"><b>MERCH PRO <small style="font-size:10px;font-weight:500">v1.1.95</small> · AI listing</b><span>Scan artwork · Create listing · Fill fields</span></div><img class="thumb" hidden alt="Artwork used for generation" /><input class="phrase" type="text" placeholder="Extra keywords or holiday (optional)" aria-label="Extra keywords or holiday" maxlength="500" /><button class="go" type="button">Generate listing &amp; fill</button><button class="undo" type="button" hidden>Undo fill</button><span class="state" role="status" aria-live="polite"></span><details class="details"><summary>View keyword and safety notes</summary><pre></pre><a href="https://tmsearch.uspto.gov/search/" target="_blank" rel="noopener">Open official USPTO Trademark Search ↗</a></details></div>`;
    const button = shadow.querySelector(".go");
    const state = shadow.querySelector(".state");
    const details = shadow.querySelector(".details");
    const pre = shadow.querySelector("pre");
    const undo = shadow.querySelector(".undo");
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
      button.textContent = "Scanning design…";
      state.className = "state show";
      state.textContent = "Reading the artwork and checking it against the listing rules…";
      details.classList.remove("show");
      try {
        const activeFields = findAllFields();
        if (!hasAllFields(activeFields)) throw new Error("Open the Product details editor first.");
        previousFields = Object.fromEntries(Object.entries(activeFields).map(([key, input]) => [key, input.value]));
        await applyListing(Object.fromEntries(Object.keys(activeFields).map(key => [key, ""])));
        undo.hidden = false;
        const artwork = await artworkPayload(activeFields);
        const thumb = shadow.querySelector(".thumb");
        thumb.src = artwork.imageInlineData ? `data:${artwork.imageInlineData.mime_type};base64,${artwork.imageInlineData.data}` : artwork.imageUrl;
        thumb.hidden = false;
        state.textContent = "Artwork captured. First analyzing visual evidence, occasions and audiences; then writing the listing from that analysis…";
        let seconds = 0;
        progressTimer = setInterval(() => { button.textContent = `Generating… ${++seconds}s`; }, 1000);
        button.textContent = "Generating…";
        const generation = chrome.runtime.sendMessage({
          type: "MERCH_PRO_GENERATE_MERCH_LISTING",
          ...artwork,
          extraKeywords: shadow.querySelector(".phrase").value.trim(),
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
        state.textContent = `${response.result.reused ? "Recent result reused. " : ""}Listing filled. Description contains only Bullet 1 + Bullet 2.${titleNotice} Review all fields and the safety notes before saving on Amazon.`;
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
