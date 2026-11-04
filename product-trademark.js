(() => {
  if (!/^(www\.)?amazon\.com$/.test(location.hostname)) return;
  const HOST = "merchpilot-product-trademark";
  globalThis.__merchpilotProductObserver?.disconnect();
  document.getElementById(HOST)?.remove();
  document.getElementById("merchpilot-product-details")?.remove();
  document.querySelectorAll("[data-merchpilot-product-preview]").forEach(node => node.remove());
  const style = `:host{display:block;font:14px/1.6 Arial,sans-serif;color:#00a99d}*{box-sizing:border-box}button{cursor:pointer;font:inherit}.check{margin:8px 0;padding:8px 14px;background:#d72b40;color:white;border:0;border-radius:7px;font-size:13px;font-weight:700}.check:disabled{opacity:.65;cursor:progress}.status{font-size:12px;color:#52647c}.preview{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0 12px}.hit{display:inline;cursor:pointer;padding:3px 4px;background:#ffc400;color:#111;box-decoration-break:clone;-webkit-box-decoration-break:clone}.multi{background:#c92539;color:#fff;font-weight:700}dialog{width:min(620px,92vw);max-height:80vh;overflow:auto;border:1px solid #d6deeb;border-radius:12px;padding:18px;color:#182a45;font:14px/1.5 Arial,sans-serif}dialog::backdrop{background:#10203999}.close{float:right;border:0;border-radius:50%;background:#edf1f8;padding:4px 10px}.record{border:1px solid #dce4ef;background:#f8faff;border-radius:8px;padding:10px;margin:9px 0}.record a{color:#175ab2}.meta{color:#43604e;font-size:12px}.goods{font-size:12px;color:#62718a}h3{margin:0 35px 12px 0}p{margin:5px 0}`;
  const readProduct = () => {
    const title = document.querySelector("#productTitle");
    const brand = document.querySelector("#bylineInfo, #brand");
    let bullets = [...document.querySelectorAll("#feature-bullets li")].filter(node => node.textContent.trim());
    // New Amazon layouts place seller bullets under About this item instead
    // of the legacy feature-bullets container.
    if (!bullets.length) {
      const heading = [...document.querySelectorAll("h2, h3, h4, .a-text-bold")].find(node => /^about this item$/i.test(node.textContent.trim()));
      let section = heading?.parentElement;
      for (let depth = 0; section && depth < 5; depth++, section = section.parentElement) {
        const items = [...section.querySelectorAll("ul li")].filter(node => node.textContent.trim());
        if (items.length) { bullets = items; break; }
      }
    }
    bullets = bullets.slice(0, 2);
    const description = document.querySelector("#productDescription");
    const groups = [
      { key: "title", node: title, text: title?.textContent.trim() || "" },
      { key: "brand", node: brand, text: (brand?.textContent || "").trim().replace(/^Brand:\s*/i, "").replace(/^Visit the (.*?) Store$/i, "$1") },
      { key: "bullet1", node: bullets[0], text: bullets[0]?.textContent.trim() || "" },
      { key: "bullet2", node: bullets[1], text: bullets[1]?.textContent.trim() || "" },
      { key: "description", node: description, text: description?.textContent.trim() || "" }
    ];
    return { title, groups, fields: Object.fromEntries(groups.map(group => [group.key, group.text])) };
  };
  const makeRoot = host => {
    const root = host.attachShadow({ mode: "open" });
    const css = document.createElement("style"); css.textContent = style; root.append(css);
    return root;
  };
  function mount() {
    if (document.getElementById(HOST)) return;
    const product = readProduct();
    if (!product.title || !product.fields.title) return;
    const host = document.createElement("div"); host.id = HOST;
    const root = makeRoot(host);
    const button = document.createElement("button"); button.type = "button"; button.className = "check"; button.textContent = "TM Trademark US";
    const status = document.createElement("div"); status.className = "status"; status.setAttribute("role", "status");
    const dialog = document.createElement("dialog");
    const close = document.createElement("button"); close.type = "button"; close.className = "close"; close.textContent = "×"; close.setAttribute("aria-label", "Close trademark records"); close.onclick = () => dialog.close();
    const heading = document.createElement("h3");
    const records = document.createElement("div");
    dialog.append(close, heading, records);
    root.append(button, status, dialog);
    const brandNode = product.groups.find(group => group.key === "brand")?.node;
    const brandBlock = brandNode?.closest("#bylineInfo_feature_div") || brandNode;
    if (brandBlock) brandBlock.before(host);
    else (product.title.closest("h1") || product.title).before(host);
    const detailsHost = document.createElement("div"); detailsHost.id = "merchpilot-product-details"; detailsHost.style.display = "none";
    const detailsRoot = makeRoot(detailsHost);
    const detailSlots = new Map();
    for (const [key, label] of [["bullet1", "Bullet 1"], ["bullet2", "Bullet 2"], ["description", "Description"]]) {
      const section = document.createElement("section"); section.style.cssText = "padding:9px 0;border-bottom:1px solid #e1e7ed";
      const heading = document.createElement("strong"); heading.textContent = label; heading.style.color = "#263b52";
      const slot = document.createElement("div"); slot.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;color:#263b52";
      section.append(heading, slot); detailsRoot.append(section); detailSlots.set(key, slot);
    }
    const price = ["#corePriceDisplay_desktop_feature_div", "#corePrice_feature_div", "#apex_desktop", "#price"].map(selector => document.querySelector(selector)).find(Boolean);
    (price || host).after(detailsHost);
    function refreshDetails(current) {
      for (const [key, slot] of detailSlots) {
        slot.textContent = current.fields[key] || "Not available on this product page.";
      }
    }
    function showRecords(term) {
      heading.textContent = term.phrase;
      records.replaceChildren();
      for (const record of term.records) {
        const card = document.createElement("article"); card.className = "record";
        const name = document.createElement("strong"); name.textContent = record.mark;
        const meta = document.createElement("p"); meta.className = "meta"; meta.textContent = "LIVE · REGISTERED · Class 025";
        card.append(name, meta);
        if (/^\d{8}$/.test(record.serial)) {
          const link = document.createElement("a"); link.textContent = `Serial ${record.serial} ↗`; link.href = `https://tsdr.uspto.gov/#caseNumber=${record.serial}&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch`; link.target = "_blank"; link.rel = "noopener noreferrer"; card.append(link);
        }
        const goods = document.createElement("p"); goods.className = "goods"; goods.textContent = [record.owner, record.goods].filter(Boolean).join(" — "); card.append(goods);
        records.append(card);
      }
      if (!dialog.open) dialog.showModal();
    }
    function preview(group, terms) {
      if (!group.text || (!detailSlots.has(group.key) && !group.node?.isConnected)) return;
      const wrapper = document.createElement("div"); wrapper.dataset.merchpilotProductPreview = group.key;
      const previewRoot = makeRoot(wrapper);
      const line = document.createElement("div"); line.className = "preview";
      const tokens = [...group.text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)].map(match => ({ text: match[0].replace(/’/g, "'").toLowerCase(), start: match.index, end: match.index + match[0].length }));
      const ranges = [];
      for (const term of terms) {
        const count = term.wordCount;
        for (let i = 0; i + count <= tokens.length; i++) {
          if (tokens.slice(i, i + count).map(token => token.text).join(" ") === term.phrase) ranges.push({ start: tokens[i].start, end: tokens[i + count - 1].end, term });
        }
      }
      ranges.sort((a, b) => a.start - b.start || b.end - a.end);
      let cursor = 0;
      for (const range of ranges) {
        if (range.start < cursor) continue;
        line.append(document.createTextNode(group.text.slice(cursor, range.start)));
        const mark = document.createElement("span"); mark.className = `hit${range.term.wordCount > 1 ? " multi" : ""}`; mark.textContent = group.text.slice(range.start, range.end); mark.tabIndex = 0; mark.setAttribute("role", "button"); mark.title = "View exact USPTO records";
        mark.onclick = () => showRecords(range.term);
        mark.onkeydown = event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showRecords(range.term); } };
        line.append(mark); cursor = range.end;
      }
      line.append(document.createTextNode(group.text.slice(cursor))); previewRoot.append(line);
      if (detailSlots.has(group.key)) {
        detailSlots.get(group.key).replaceChildren(wrapper);
        return;
      }
      const anchor = group.key.startsWith("bullet") ? group.node.closest("li") || group.node : group.key === "title" ? group.node.closest("h1") || group.node : group.node;
      if (anchor.tagName === "LI") {
        // Keep annotations inside the list item rather than inserting invalid
        // div siblings into Amazon's list.
        anchor.append(wrapper);
      } else anchor.after(wrapper);
    }
    button.onclick = async () => {
      const current = readProduct();
      refreshDetails(current);
      detailsHost.style.display = "block";
      button.disabled = true; status.textContent = "Checking exact trademarks: 1–6 words · Live · Registered · Class 025…";
      document.querySelectorAll("[data-merchpilot-product-preview]").forEach(node => node.remove());
      try {
        const response = await chrome.runtime.sendMessage({ type: "MERCH_PRO_CHECK_TRADEMARKS", fields: current.fields });
        if (!response?.ok) throw new Error(response?.error || "The trademark check did not finish.");
        if (readProduct().fields.title !== current.fields.title) throw new Error("The product changed. Run the check again.");
        for (const section of response.result.sections) {
          const group = current.groups.find(item => item.key === section.field);
          if (group) preview(group, section.terms);
        }
        status.textContent = `Checked ${response.result.checkedCount} phrases. Bullet and description matches appear below the price.${response.result.truncated ? " Results may be incomplete." : ""}`;
      } catch (error) { status.textContent = error.message || "Could not check trademarks."; }
      finally { button.disabled = false; }
    };
  }
  let timer;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(mount, 350); });
  globalThis.__merchpilotProductObserver = observer;
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();
