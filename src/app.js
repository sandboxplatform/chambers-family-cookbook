(() => {
"use strict";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem("ccb:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ccb:" + k, JSON.stringify(v)); } catch {} }
};
const ICON = {
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
  pot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6Z"/><path d="M2 10h20M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2Z"/><path d="M12 6v14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V4h11l-1.5 4L16 12H5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>'
};

/* ---------------- parse the book ---------------- */
const CAT_VAR = { "Appetizers": "--c-app", "Salads": "--c-sal", "Soups & Chowders": "--c-soup", "Main Courses": "--c-main", "Bread & Baking": "--c-bread", "Desserts": "--c-des", "Condiments": "--c-cond" };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// "~ old-id" lines keep a renamed recipe's old id, so links, pictures and saved favourites still find it.
function parseBook(txt) {
  const out = []; let cat = "", r = null, grp = null;
  for (const raw of txt.split("\n")) {
    const l = raw.trim(); if (!l) continue;
    const body = l.replace(/^(-:|[#@^>\-=*.!~])\s?/, "");
    if (l.startsWith("# ")) { cat = body; continue; }
    if (l.startsWith("@ ")) { r = { id: slug(body), name: body, cat, aliases: [], serves: "", intro: "", ing: [], steps: [], outro: "" }; out.push(r); grp = null; continue; }
    if (!r) continue;
    if (l.startsWith("~ ")) r.aliases.push(body);
    else if (l.startsWith("^ ")) r.serves = body;
    else if (l.startsWith("> ")) r.intro = body;
    else if (l.startsWith("-:")) r.ing.push({ g: body });
    else if (l.startsWith("- ")) r.ing.push({ t: body });
    else if (l.startsWith("= ")) { grp = { h: body, items: [] }; r.steps.push(grp); }
    else if (l.startsWith("* ")) { if (!grp) { grp = { h: "", items: [] }; r.steps.push(grp); } grp.items.push(body); }
    else if (l.startsWith(". ")) r.outro = body;
  }
  out.forEach(r => { r.search = (r.name + " " + r.cat + " " + r.ing.map(i => i.t || "").join(" ")).toLowerCase(); r.nIng = r.ing.filter(i => i.t).length; r.nSteps = r.steps.reduce((a, g) => a + g.items.length, 0); });
  return out;
}
// The book is built into the page, then refreshed from the relay so edits show before the site redeploys.
const RECIPES = [], BY = {}, CATS = [];
let bookText = document.getElementById("book").textContent;
function useBook(txt) {
  const list = parseBook(txt);
  RECIPES.splice(0, RECIPES.length, ...list);
  for (const k of Object.keys(BY)) delete BY[k];
  list.forEach(r => r.aliases.forEach(a => BY[a] = r));
  list.forEach(r => BY[r.id] = r);
  CATS.splice(0, CATS.length, ...new Set(list.map(r => r.cat)));
}
useBook(bookText);
const catStyle = c => `--cat:var(${CAT_VAR[c] || "--ink-3"})`;

/* ---------------- images ----------------
   Precedence: a photo saved on this device > a real photo in photos/ > the AI image in images/ai/.
   build.sh lists what's in the repo; device photos live in IndexedDB. */
const REPO_URL = "https://github.com/sandboxplatform/chambers-family-cookbook";
const IMAGES = (() => { try { return JSON.parse(document.getElementById("images")?.textContent || "{}"); } catch { return {}; } })();
const LOCAL = {};
function imgFor(id) {
  const keys = [id, ...(BY[id]?.aliases || [])];
  for (const k of keys) if (LOCAL[k]) return { src: LOCAL[k].url, kind: "local" };
  for (const k of keys) if (IMAGES[k]?.photo) return { src: IMAGES[k].photo, kind: "photo" };
  for (const k of keys) if (IMAGES[k]?.ai) return { src: IMAGES[k].ai, kind: "ai" };
  return null;
}
const IMG_TAG = { ai: "AI picture", photo: "Family photo", local: "Your photo" };
const imgAlt = (r, im) => im.kind === "ai" ? `AI-generated picture of ${r.name}` : `Photo of ${r.name}`;
const imgGone = `onerror="this.closest('[data-img]').remove()"`;
const idb = (() => {
  let p;
  const open = () => p ||= new Promise((res, rej) => { const q = indexedDB.open("ccb-photos", 1); q.onupgradeneeded = () => q.result.createObjectStore("photos"); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction("photos", mode), out = fn(t.objectStore("photos")); t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error); }); };
  return {
    async all() { const q = await tx("readonly", s => ({ k: s.getAllKeys(), v: s.getAll() })); return q.k.result.map((k, i) => [k, q.v.result[i]]); },
    put: (k, v) => tx("readwrite", s => s.put(v, k)),
    del: k => tx("readwrite", s => s.delete(k))
  };
})();
function setLocal(id, rec) { if (LOCAL[id]) URL.revokeObjectURL(LOCAL[id].url); if (rec) LOCAL[id] = { ...rec, url: URL.createObjectURL(rec.blob) }; else delete LOCAL[id]; }
async function loadLocalPhotos() { try { for (const [id, rec] of await idb.all()) if (BY[id] && rec?.blob) setLocal(id, rec); render(); } catch {} }

/* ---------------- quantities ---------------- */
const FR = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125 };
const NUM = "(\\d+\\s?[½⅓⅔¼¾⅛]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[½⅓⅔¼¾⅛])";
const LEAD = new RegExp("^" + NUM + "(\\s*(?:–|-|to)\\s*" + NUM + ")?");
function toNum(t) {
  t = t.replace(/\s/g, "");
  if (t.includes("/")) { const [a, b] = t.split("/"); return +a / +b; }
  const m = t.match(/^(\d*)([½⅓⅔¼¾⅛])?$/); if (m) return (m[1] ? +m[1] : 0) + (m[2] ? FR[m[2]] : 0);
  return parseFloat(t);
}
function fmt(n) {
  if (n >= 20) return String(Math.round(n));
  const w = Math.floor(n), f = n - w;
  const opts = [[0, ""], [.125, "⅛"], [.25, "¼"], [1 / 3, "⅓"], [.5, "½"], [2 / 3, "⅔"], [.75, "¾"], [1, "+1"]];
  let best = opts[0]; for (const o of opts) if (Math.abs(o[0] - f) < Math.abs(best[0] - f)) best = o;
  if (best[1] === "+1") return String(w + 1);
  if (!best[1]) return String(w || (n > 0 ? "⅛" : 0));
  return w ? `${w} ${best[1]}` : best[1];
}
function scaleLine(t, f) {
  if (f === 1) return { html: esc(t), scaled: false };
  const m = t.match(LEAD); if (!m) return { html: esc(t), scaled: false };
  let q = fmt(toNum(m[1]) * f); if (m[3]) q += "–" + fmt(toNum(m[3]) * f);
  return { html: `<mark>${esc(q)}</mark>${esc(t.slice(m[0].length))}`, scaled: true, text: q + t.slice(m[0].length) };
}
const scaledText = (t, f) => { const s = scaleLine(t, f); return s.scaled ? s.text : t; };

/* ---------------- state ---------------- */
const S = {
  q: "", cat: store.get("cat", "All"), filter: "all", factor: 1,
  fav: new Set(store.get("fav", [])), review: new Set(store.get("review", [])), checks: store.get("checks", {}), list: store.get("list", []),
  notes: {}, drafts: {}, myNotes: store.get("mynotes", {})
};
let sample = null, downloads = null;
const saveLocal = () => { store.set("fav", [...S.fav]); store.set("review", [...S.review]); store.set("checks", S.checks); store.set("list", S.list); store.set("cat", S.cat); };
// Move favourites, ticks and shopping-list entries saved under a recipe's old id to its current one.
function migrateIds() {
  let moved = false;
  for (const r of RECIPES) for (const a of r.aliases) {
    if (S.fav.delete(a)) { S.fav.add(r.id); moved = true; }
    if (S.review.delete(a)) { S.review.add(r.id); moved = true; }
    if (S.checks[a]) { S.checks[r.id] = S.checks[a]; delete S.checks[a]; moved = true; }
    S.list.forEach(g => { if (g.id === a) { g.id = r.id; moved = true; } });
  }
  if (moved) saveLocal();
}
migrateIds();

/* ---------------- routing ---------------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("r-") && BY[h.slice(2)]) return { v: "recipe", id: BY[h.slice(2)].id };
  if (h === "list") return { v: h };
  return { v: "home" };
}
let lastRoute = "";
function render() {
  const r = route(), key = r.v + (r.id || "");
  const changed = key !== lastRoute;
  if (r.v === "recipe") loadNotes(r.id);
  if (changed && r.v === "recipe") S.factor = 1;
  const view = $("#view");
  if (r.v === "recipe") view.innerHTML = vRecipe(BY[r.id]);
  else if (r.v === "list") view.innerHTML = vList();
  else view.innerHTML = vHome();
  const navKey = r.v === "recipe" ? "home" : r.v;
  $$(".nav a").forEach(a => a.dataset.nav === navKey ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  const nl = $("#nav-list"); const listN = S.list.reduce((a, x) => a + x.items.filter(i => !i.done).length, 0); nl.hidden = !listN; nl.textContent = listN;
  if (changed) { lastRoute = key; window.scrollTo(0, 0); document.title = r.v === "recipe" ? BY[r.id].name + " · The Chambers Family Cookbook" : "The Chambers Family Cookbook"; }
}
addEventListener("hashchange", render);

/* ---------------- helpers ---------------- */
function ago(ts) {
  if (!ts) return ""; const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now"; if (d < 3600) return Math.floor(d / 60) + " min ago"; if (d < 86400) return Math.floor(d / 3600) + " h ago";
  if (d < 86400 * 7) return Math.floor(d / 86400) + " d ago";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: d > 86400 * 300 ? "numeric" : undefined });
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast("Copied"); return true; } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); toast(ok ? "Copied" : "Couldn't copy. Select the text and copy it yourself."); return ok; } }
const myName = () => store.get("name", "");

/* ---------------- views ---------------- */
function card(r) {
  const fav = S.fav.has(r.id), im = imgFor(r.id);
  return `<a class="rc" href="#r-${r.id}" style="${catStyle(r.cat)}">
    ${im ? `<span class="rc-img" data-img><img src="${esc(im.src)}" alt="${esc(imgAlt(r, im))}" loading="lazy" decoding="async" ${imgGone}><span class="img-tag ${im.kind === "ai" ? "" : "real"}">${IMG_TAG[im.kind]}</span></span>` : ""}
    <span class="badges">${fav ? `<span class="dot fav" title="Favourite">${ICON.heart}</span>` : ""}${S.review.has(r.id) ? `<span class="dot review" title="Needs review">${ICON.flag}</span>` : ""}</span>
    <span class="cat">${esc(r.cat)}</span><h3>${esc(r.name)}</h3>
    <span class="meta"><span>${r.nIng} ingredients</span>${r.serves ? `<span>serves ${esc(r.serves)}</span>` : ""}</span></a>`;
}
function filtered() {
  const q = S.q.trim().toLowerCase();
  return RECIPES.filter(r => (S.cat === "All" || r.cat === S.cat) &&
    (!q || q.split(/\s+/).every(w => r.search.includes(w))) &&
    (S.filter === "all" || (S.filter === "fav" && S.fav.has(r.id)) || (S.filter === "crock" && /crockpot|slow cooker/i.test(r.name + r.steps.map(g => g.items.join(" ")).join(" "))) || (S.filter === "review" && S.review.has(r.id))));
}
function vHome() {
  const list = filtered();
  return `
  <section class="hero">
    <div>
      <h1>The Chambers Family Cookbook</h1>
      <p class="ded">for Nancy Chambers</p>
      <p class="lede">Food is more than just nourishment. It's a cherished connection to our past, present, and future. Each recipe here carries a piece of family heritage, passed down through generations. Cook from it, share your memories, and fix anything that isn't quite right before it goes to print.</p>
    </div>
    <div class="hero-side">
      <div class="stats">
        <div class="stat"><b>${RECIPES.length}</b><span>recipes</span></div>
        <div class="stat"><b>${CATS.length}</b><span>sections</span></div>
      </div>
      <div class="hero-actions">
        <a class="btn primary" href="book.html">${ICON.book} Open the book</a>
        <button class="btn" data-act="new-recipe">${ICON.plus} Add a recipe</button>
      </div>
    </div>
  </section>
  <div class="dividers" role="group" aria-label="Sections">
    ${["All", ...CATS].map(c => `<button class="tab" style="${c === "All" ? "" : catStyle(c)}" data-cat="${esc(c)}" aria-pressed="${S.cat === c}">${c === "All" ? "" : "<i></i>"}${esc(c)} <small>${c === "All" ? RECIPES.length : RECIPES.filter(r => r.cat === c).length}</small></button>`).join("")}
  </div>
  <section class="drawer">
    <div class="tools">
      <div class="chips" role="group" aria-label="Filter">
        ${[["all", "Everything"], ["fav", "My favourites"], ["crock", "Crockpot"], ["review", "Needs review"]].map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}
      </div>
      <span class="muted" style="font-size:.86rem">${list.length} of ${RECIPES.length} recipes${S.q ? ` matching “${esc(S.q)}”` : ""}</span>
    </div>
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` :
      `<div class="empty"><h3>No recipes match</h3><p>Try another word, or clear the filters.</p><button class="btn" data-act="clear">Clear search and filters</button></div>`}
  </section>`;
}

const pencil = (attrs, label) => `<button class="edit" ${attrs} aria-label="${esc(label)}" title="${esc(label)}">${ICON.pencil}</button>`;
function vRecipe(r) {
  const f = S.factor, ck = S.checks[r.id] || {};
  let ii = 0;
  const ingHtml = r.ing.map(i => {
    if (i.g) return `<li class="grp">${esc(i.g)}</li>`;
    const n = ii++, k = "i" + n, s = scaleLine(i.t, f);
    return `<li class="line ${ck[k] ? "done" : ""}"><button class="tick" data-tick="${k}" aria-label="Mark ${esc(i.t)} as gathered" aria-pressed="${!!ck[k]}">${ICON.check}</button><span class="txt">${s.html}</span>${pencil(`data-edit-ing="${n}"`, "Edit: " + i.t)}</li>`;
  }).join("");
  let n = 0;
  const stepsHtml = r.steps.map((g, gi) => `<div class="sg">${g.h ? `<h3><span class="n">${gi + 1}</span>${esc(g.h)}${pencil(`data-edit-head="${gi}"`, "Edit step heading")}</h3>` : ""}<ul class="ing" style="font-family:var(--f-body)">${g.items.map((t, j) => { const k = "s" + (n++); return `<li class="line ${ck[k] ? "done" : ""}"><button class="tick" data-tick="${k}" aria-label="Mark step done" aria-pressed="${!!ck[k]}">${ICON.check}</button><span class="txt" style="font-family:var(--f-body)">${esc(t)}</span>${pencil(`data-edit-step="${gi}:${j}"`, "Edit this step")}</li>`; }).join("")}</ul></div>`).join("");
  const fav = S.fav.has(r.id);
  const idx = RECIPES.indexOf(r), prev = RECIPES[idx - 1], next = RECIPES[idx + 1];
  const anyChecked = Object.values(ck).some(Boolean);
  return `
  <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All recipes</a><span>/</span><a href="#" data-cat-link="${esc(r.cat)}">${esc(r.cat)}</a></nav>
  <div class="recipe">
    <article class="card" style="${catStyle(r.cat)}">
      ${heroImg(r)}
      <header class="card-top">
        <div class="add-line">
          <button class="icon-btn" data-act="add-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Add an ingredient or step" title="Add an ingredient or step">${ICON.plus}</button>
          <div class="add-menu" role="menu" hidden>
            <button role="menuitem" data-act="add-line" data-kind="ingredient">Add an ingredient</button>
            <button role="menuitem" data-act="add-line" data-kind="step">Add a method step</button>
            ${r.steps.some(g => g.h) ? `<button role="menuitem" data-act="add-line" data-kind="substep">Add a sub-step</button>` : ""}
          </div>
        </div>
        <div class="cat">${esc(r.cat)}</div>
        <h1>${esc(r.name)}${pencil("data-edit-name", "Rename this recipe")}</h1>
        ${r.intro ? `<p class="intro">${esc(r.intro)}${pencil("data-edit-intro", "Edit the introduction")}</p>` : `<p class="intro muted">No introduction yet. <button class="btn sm" data-edit-intro>Write one</button></p>`}
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" data-act="cook">${ICON.pot} Cook mode</button>
          <button class="btn" data-act="fav" aria-pressed="${fav}">${fav ? ICON.heart : ICON.heartO} ${fav ? "Favourite" : "Add to favourites"}</button>
          <button class="btn" data-act="review" aria-pressed="${S.review.has(r.id)}">${ICON.flag} ${S.review.has(r.id) ? "Marked for review" : "Needs review"}</button>
          <button class="btn" data-act="to-list">${ICON.cart} Add to shopping list</button>
          <button class="btn" data-act="ask" ${sample === null ? "hidden" : ""}>${ICON.spark} Ask Claude</button>
        </div>
      </header>
      <div class="card-body">
        <div class="scaler">
          <span class="eyebrow">Batch size</span>
          <div class="seg" role="group" aria-label="Scale quantities">${[[.5, "½×"], [1, "1×"], [2, "2×"], [3, "3×"]].map(([v, l]) => `<button data-scale="${v}" aria-pressed="${f === v}">${l}</button>`).join("")}</div>
          ${r.serves ? `<span class="serves">Serves ${esc(scaledText(r.serves, f))}</span>` : ""}
          ${f !== 1 ? `<span class="muted" style="font-size:.8rem">Highlighted amounts are scaled. Step text and cooking times stay as written.</span>` : ""}
        </div>
        <section><div class="sec-h"><h2>Ingredients</h2><span class="muted">${anyChecked ? `<button class="btn sm ghost" data-act="uncheck">Clear ticks</button>` : "Tick as you gather"}</span></div><ul class="ing">${ingHtml}</ul></section>
        <section><div class="sec-h"><h2>Method</h2><span class="muted">Tap a pencil to edit</span></div><div class="steps">${stepsHtml}</div></section>
        ${r.outro ? `<p class="outro">${esc(r.outro)}</p>` : ""}
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:16px">
          ${prev ? `<a class="btn ghost sm" href="#r-${prev.id}">${ICON.left} ${esc(prev.name)}</a>` : "<span></span>"}
          ${next ? `<a class="btn ghost sm" href="#r-${next.id}">${esc(next.name)} ${ICON.right}</a>` : ""}
        </div>
      </div>
    </article>
    <aside class="side">
      ${notesPanel(r, "memory")}
      ${notesPanel(r, "comment")}
    </aside>
  </div>`;
}
const NOTE_KIND = {
  memory: { title: "Family memories", empty: "Who made this? When was it served? Add a memory and it will appear here.", ph: "e.g. Nannie made this every Christmas Eve", button: "Share memory" },
  comment: { title: "Comments", empty: "Tips, questions or how it turned out. Anything about this recipe.", ph: "e.g. I added a little more garlic and it was great", button: "Post comment" }
};
function notesPanel(r, kind) {
  const K = NOTE_KIND[kind], all = S.notes[r.id], list = Array.isArray(all) ? all.filter(n => n.kind === kind) : [];
  const items = all === undefined ? `<p class="muted" style="font-size:.88rem;margin:0">Loading…</p>`
    : all === "error" ? `<p class="muted" style="font-size:.88rem;margin:0">Couldn't load these just now. They show on the cookbook's website when you're online.</p>`
    : list.length ? `<div class="stack">${list.map(m => `<div class="memory"><p>${esc(m.text)}</p><div class="by">${esc(m.by || "A family member")}</div><div class="muted" style="font-size:.75rem">${ago(m.at)}${S.myNotes[m.id] ? ` · <button class="btn sm ghost" style="padding:2px 6px" data-del-note="${esc(m.id)}" data-rid="${esc(m.recipeId)}">Delete</button>` : ""}</div></div>`).join("")}</div>`
    : `<p class="muted" style="font-size:.88rem;margin:0">${K.empty}</p>`;
  return `<div class="panel">
    <div class="panel-head"><h2>${K.title}</h2><span class="muted" style="font-size:.85rem">${list.length || ""}</span></div>
    ${items}
    ${all === "error" ? "" : `<form class="note-form" data-note="${kind}">
      <textarea name="text" rows="2" placeholder="${esc(K.ph)}" aria-label="${esc(K.button)}">${esc(S.drafts[r.id + kind] || "")}</textarea>
      <div class="note-row"><input name="by" class="who" placeholder="Your name" aria-label="Your name" value="${esc(myName())}" autocomplete="nickname"><button class="btn sm primary" type="submit">${K.button}</button></div>
    </form>`}
  </div>`;
}
function heroImg(r) {
  const im = imgFor(r.id);
  if (!im) return `<div class="add-photo"><span>No picture of this dish yet.</span><button class="btn sm" data-act="photo">${ICON.camera} Add a real photo</button></div>`;
  const tag = im.kind === "ai" ? "AI-generated picture, not the family's dish" : im.kind === "local" ? "Your photo · only on this device so far" : "Family photo";
  return `<figure class="hero-img" data-img><img src="${esc(im.src)}" alt="${esc(imgAlt(r, im))}" decoding="async" ${imgGone}>
    <figcaption><span class="img-tag ${im.kind === "ai" ? "" : "real"}">${tag}</span><button class="btn sm" data-act="photo">${ICON.camera} ${im.kind === "ai" ? "Add a real photo" : "Replace photo"}</button></figcaption></figure>`;
}
function vList() {
  const groups = S.list;
  return `<div class="ph"><div><div class="eyebrow">For the grocery run</div><h1>Shopping list</h1><p>Ingredients from the recipes you've added, at the batch size you chose. Kept on this device.</p></div>
    ${groups.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="copy-list">${ICON.copy} Copy as text</button><button class="btn ghost" data-act="clear-done">Remove ticked</button><button class="btn ghost" data-act="clear-list">Clear list</button></div>` : ""}</div>
  ${groups.length ? `<div class="shop">${groups.map((g, gi) => `<div class="panel" style="${catStyle(BY[g.id]?.cat)}"><div class="panel-head"><h3><a href="#r-${esc(g.id)}" style="text-decoration:none">${esc(g.name)}</a></h3><button class="btn sm ghost" data-rm-group="${gi}">Remove</button></div>${g.factor !== 1 ? `<div class="muted" style="font-size:.8rem;margin:-6px 0 6px">${g.factor}× batch</div>` : ""}<ul class="ing">${g.items.map((it, ii) => `<li class="line ${it.done ? "done" : ""}"><button class="tick" data-shop="${gi}:${ii}" aria-pressed="${!!it.done}" aria-label="Got ${esc(it.t)}">${ICON.check}</button><span class="txt">${esc(it.t)}</span></li>`).join("")}</ul></div>`).join("")}</div>`
    : `<div class="panel empty"><h3>Your list is empty</h3><p>Open a recipe and choose “Add to shopping list”.</p><a class="btn" href="#">Browse recipes</a></div>`}`;
}

/* ---------------- events ---------------- */
$("#q").addEventListener("input", e => { S.q = e.target.value; if (route().v !== "home") location.hash = ""; render(); });
const closeAddMenus = () => $$(".add-menu").forEach(m => { m.hidden = true; m.previousElementSibling.setAttribute("aria-expanded", "false"); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAddMenus(); });
document.addEventListener("click", async e => {
  if (!e.target.closest(".add-line")) closeAddMenus();
  const t = e.target.closest("button,a"); if (!t) return;
  const d = t.dataset, r = BY[route().id];
  if (d.cat) { S.cat = d.cat; saveLocal(); render(); return; }
  if (d.catLink) { e.preventDefault(); S.cat = d.catLink; saveLocal(); location.hash = ""; render(); return; }
  if (d.filter) { S.filter = d.filter; render(); return; }
  if (d.scale) { S.factor = +d.scale; render(); return; }
  if (d.tick && r) { const c = S.checks[r.id] = S.checks[r.id] || {}; c[d.tick] = !c[d.tick]; saveLocal(); render(); return; }
  if (d.shop) { const [g, i] = d.shop.split(":").map(Number); S.list[g].items[i].done = !S.list[g].items[i].done; saveLocal(); render(); return; }
  if (d.rmGroup) { S.list.splice(+d.rmGroup, 1); saveLocal(); render(); return; }
  if (r && "editName" in d) { editName(r); return; }
  if (r && "editIntro" in d) { editIntro(r); return; }
  if (r && d.editIng !== undefined) { editIng(r, +d.editIng); return; }
  if (r && d.editStep) { const [g, j] = d.editStep.split(":").map(Number); editStep(r, g, j); return; }
  if (r && d.editHead !== undefined) { editHead(r, +d.editHead); return; }
  if (d.delNote) { if (t.dataset.armed) deleteNote(d.rid, d.delNote); else { t.dataset.armed = 1; t.textContent = "Confirm delete"; setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = "Delete"; } }, 3000); } return; }
  if (d.close !== undefined) { t.closest("dialog").close(); return; }
  switch (d.act) {
    case "new-recipe": openNew(); break;
    case "clear": S.q = ""; $("#q").value = ""; S.cat = "All"; S.filter = "all"; saveLocal(); render(); break;
    case "review": S.review.has(r.id) ? S.review.delete(r.id) : S.review.add(r.id); saveLocal(); render(); toast(S.review.has(r.id) ? "Marked for review. Find it under the Needs review filter." : "Review mark removed"); break;
    case "fav": S.fav.has(r.id) ? S.fav.delete(r.id) : S.fav.add(r.id); saveLocal(); render(); toast(S.fav.has(r.id) ? "Added to favourites" : "Removed from favourites"); break;
    case "uncheck": delete S.checks[r.id]; saveLocal(); render(); break;
    case "to-list": {
      const items = r.ing.filter(i => i.t).map(i => ({ t: scaledText(i.t, S.factor), done: false }));
      const ex = S.list.findIndex(g => g.id === r.id); const g = { id: r.id, name: r.name, factor: S.factor, items };
      if (ex >= 0) S.list[ex] = g; else S.list.push(g);
      saveLocal(); render(); toast(`${items.length} ingredients added to your shopping list`); break;
    }
    case "copy-list": copy(S.list.map(g => `${g.name}${g.factor !== 1 ? ` (${g.factor}×)` : ""}\n` + g.items.filter(i => !i.done).map(i => "☐ " + i.t).join("\n")).join("\n\n")); break;
    case "clear-done": S.list.forEach(g => g.items = g.items.filter(i => !i.done)); S.list = S.list.filter(g => g.items.length); saveLocal(); render(); break;
    case "clear-list": if (t.dataset.armed) { S.list = []; saveLocal(); render(); } else { t.dataset.armed = 1; t.textContent = "Tap again to clear"; } break;
    case "cook": openCook(r); break;
    case "ask": openAsk(r); break;
    case "photo": openPhoto(r); break;
    case "add-menu": { const m = t.nextElementSibling, open = m.hidden; closeAddMenus(); m.hidden = !open; t.setAttribute("aria-expanded", String(open)); if (open) m.querySelector("button").focus(); break; }
    case "add-line": closeAddMenus(); addLine(r, d.kind); break;
    case "install": install(); break;
  }
});
// "Your name" fields share one remembered value; note drafts survive re-renders.
document.addEventListener("input", e => {
  if (e.target.classList.contains("who")) store.set("name", e.target.value.trim().slice(0, 60));
  const f = e.target.closest(".note-form"); const r = BY[route().id];
  if (f && r && e.target.name === "text") S.drafts[r.id + f.dataset.note] = e.target.value;
});
document.addEventListener("submit", e => { const f = e.target.closest(".note-form"); if (f) { e.preventDefault(); postNote(f); } });

/* ---------------- saving changes ----------------
   Edits go to the cookbook's relay (relay/ in this repo, a Cloudflare Worker), which commits them to
   src/book.txt on GitHub and returns the new book; memories and comments are stored by the relay. */
const RELAY = "https://cookbook-relay.chambers-cookbook.workers.dev";
const onWeb = /^https?:$/.test(location.protocol);
function applyBookText(txt) {
  if (typeof txt !== "string" || txt.trim() === bookText.trim()) return;
  bookText = txt; useBook(txt); migrateIds(); fillSections(); render();
}
const EDIT_ERRORS = {
  changed: "Someone changed this recipe a moment ago. The page has been refreshed. Check it and try again.",
  name_taken: "There's already a recipe with that name.",
  empty: "Type something first, or use Remove.",
  recipe_missing: "This recipe has been renamed or removed. The page has been refreshed.",
  rate_limited: "That's a lot of changes at once. Wait a minute and try again.",
  daily_limit: "The cookbook has had a lot of changes today. Try again tomorrow.",
  not_configured: "Saving changes isn't switched on yet.",
  forbidden: "Changes can only be saved from the cookbook's own website."
};
async function saveEdit(op, msgEl, btn) {
  op.by = myName(); msgEl.textContent = ""; btn.disabled = true;
  try {
    const res = await fetch(RELAY + "/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op) });
    const j = await res.json().catch(() => ({}));
    if (j.text) applyBookText(j.text);
    if (!res.ok) { msgEl.textContent = EDIT_ERRORS[j.error] || "That didn't save. Try again in a moment."; return null; }
    return j;
  } catch { msgEl.textContent = navigator.onLine ? "Couldn't reach the cookbook. Try again in a moment." : "You're offline. Connect and try again."; return null; }
  finally { btn.disabled = false; }
}

/* ---------------- edit dialog ---------------- */
let ed = null; // { build(text) -> op, del?: op }
function openEdit(cfg) {
  ed = cfg;
  $("#ed-eyebrow").textContent = cfg.eyebrow; $("#ed-title").textContent = cfg.title; $("#ed-label").textContent = cfg.label;
  const ta = $("#ed-text"); ta.value = cfg.text || ""; ta.rows = cfg.rows || 3; ta.placeholder = cfg.placeholder || ""; ta.classList.toggle("typed", !!cfg.typed);
  $("#ed-after-wrap").hidden = !cfg.places; $("#ed-after").innerHTML = cfg.places || "";
  if (cfg.places) $("#ed-after").selectedIndex = $("#ed-after").options.length - 1;
  $("#ed-head-wrap").hidden = !cfg.heading; $("#ed-head").value = "";
  const del = $("#ed-delete"); del.hidden = !cfg.del; del.textContent = cfg.delLabel || "Remove"; delete del.dataset.armed;
  $("#ed-name").value = myName(); $("#ed-msg").textContent = "";
  $("#dlg-edit").showModal(); setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
}
$("#ed-form").addEventListener("submit", async e => {
  e.preventDefault(); if (!ed) return;
  const text = $("#ed-text").value.trim();
  if (!text && !ed.allowEmpty) { $("#ed-msg").textContent = EDIT_ERRORS.empty; return; }
  if (!$("#ed-head-wrap").hidden && !$("#ed-head").value.trim()) { $("#ed-msg").textContent = "Give the new step a heading."; return; }
  if (ed.unchanged !== undefined && text === ed.unchanged) { $("#dlg-edit").close(); return; }
  const pos = $("#ed-after-wrap").hidden ? {} : JSON.parse($("#ed-after").value || "{}");
  const j = await saveEdit(ed.build(text, pos, $("#ed-head").value.trim()), $("#ed-msg"), $("#ed-save"));
  if (!j) return;
  $("#dlg-edit").close(); toast("Saved for everyone");
  if (j.recipeId && location.hash !== "#r-" + j.recipeId) history.replaceState(null, "", "#r-" + j.recipeId); // renamed
});
$("#ed-delete").addEventListener("click", async e => {
  const b = e.currentTarget; if (!ed?.del) return;
  if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = "Tap again to remove"; return; }
  if (await saveEdit(ed.del, $("#ed-msg"), b)) { $("#dlg-edit").close(); toast("Removed"); }
});
const ingAt = (r, i) => r.ing.filter(x => x.t)[i]?.t;
function editName(r) { openEdit({ eyebrow: "Rename", title: r.name, label: "Recipe name", text: r.name, unchanged: r.name, rows: 1, build: text => ({ op: "set-name", id: r.id, expect: r.name, text }) }); }
function editIntro(r) { openEdit({ eyebrow: r.intro ? "Edit the introduction" : "Write an introduction", title: r.name, label: "Introduction", text: r.intro, unchanged: r.intro, rows: 4, placeholder: "A sentence or two about this dish and who made it", del: r.intro ? { op: "set-intro", id: r.id, expect: r.intro, text: "" } : null, build: text => ({ op: "set-intro", id: r.id, expect: r.intro, text }) }); }
function editIng(r, i) { const t = ingAt(r, i); openEdit({ eyebrow: "Edit ingredient", title: r.name, label: "Ingredient", text: t, unchanged: t, rows: 2, typed: true, del: { op: "delete-ing", id: r.id, i, expect: t }, delLabel: "Remove ingredient", build: text => ({ op: "edit-ing", id: r.id, i, expect: t, text }) }); }
function editStep(r, g, j) { const t = r.steps[g].items[j]; openEdit({ eyebrow: "Edit step", title: r.name, label: "Step", text: t, unchanged: t, rows: 4, del: { op: "delete-step", id: r.id, g, j, expect: t }, delLabel: "Remove step", build: text => ({ op: "edit-step", id: r.id, g, j, expect: t, text }) }); }
function editHead(r, g) { const t = r.steps[g].h; openEdit({ eyebrow: "Edit step heading", title: r.name, label: `Heading for step ${g + 1}`, text: t, unchanged: t, rows: 1, build: text => ({ op: "edit-heading", id: r.id, g, expect: t, text }) }); }
// "+" menu: placement choices follow the recipe's own groups.
function addLine(r, kind) {
  const cut = t => t.length > 60 ? t.slice(0, 57) + "…" : t;
  const opt = (pos, label) => `<option value="${esc(JSON.stringify(pos))}">${esc(label)}</option>`;
  const flat = !r.steps.some(g => g.h);
  if (kind === "ingredient") {
    let html = opt({ after: "top" }, "At the top of the list"), open = false, n = 0;
    r.ing.forEach((x, k) => {
      if (x.g) { if (open) html += "</optgroup>"; open = true; html += `<optgroup label="${esc(x.g)}">` + opt({ group: r.ing.slice(0, k).filter(y => y.g).length }, "At the start of this group"); }
      else { html += opt({ after: n, expect: x.t }, "After: " + cut(x.t)); n++; }
    });
    if (open) html += "</optgroup>";
    return openEdit({ eyebrow: "Add an ingredient", title: r.name, label: "The new ingredient", rows: 2, typed: true, places: html, placeholder: "e.g. 1 tsp vanilla", build: (text, pos) => ({ op: "add-ing", id: r.id, ...pos, text }) });
  }
  if (kind === "substep" || flat) {
    const html = flat
      ? opt({ g: 0, after: -1 }, "At the start") + (r.steps[0]?.items || []).map((t, j) => opt({ g: 0, after: j, expect: t }, `After ${j + 1}. ${cut(t)}`)).join("")
      : r.steps.map((g, gi) => `<optgroup label="${esc(`${gi + 1}. ${g.h || "Step " + (gi + 1)}`)}">` + opt({ g: gi, after: -1 }, "At the start of this step") + g.items.map((t, j) => opt({ g: gi, after: j, expect: t }, "After: " + cut(t))).join("") + "</optgroup>").join("");
    return openEdit({ eyebrow: flat ? "Add a method step" : "Add a sub-step", title: r.name, label: flat ? "The new step" : "The new sub-step", rows: 3, places: html, build: (text, pos) => ({ op: "add-substep", id: r.id, ...pos, text }) });
  }
  const html = opt({ after: -1 }, `Before step 1: ${cut(r.steps[0]?.h || "")}`) + r.steps.map((g, gi) => opt({ after: gi }, `After step ${gi + 1}: ${cut(g.h)}`)).join("");
  openEdit({ eyebrow: "Add a method step", title: r.name, label: "What to do (one sub-step per line)", rows: 4, places: html, heading: true, build: (text, pos, heading) => ({ op: "add-step", id: r.id, ...pos, heading, items: text.split("\n") }) });
}

/* ---------------- add a recipe ---------------- */
function fillSections() { const v = $("#f-ncat").value; $("#f-ncat").innerHTML = CATS.map(c => `<option>${esc(c)}</option>`).join(""); if (CATS.includes(v)) $("#f-ncat").value = v; }
fillSections();
function openNew() {
  $("#nw-form").reset(); $("#f-name").value = myName(); $("#f-msg").textContent = ""; $("#f-scan-msg").textContent = "";
  $("#dlg-new").showModal(); setTimeout(() => $("#f-nname").focus(), 30);
}
const lines = id => $(id).value.split("\n").map(x => x.trim()).filter(Boolean);
$("#nw-form").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#f-nname").value.trim(), ingredients = lines("#f-ning"), steps = lines("#f-nsteps");
  if (!name || (!ingredients.length && !steps.length)) { $("#f-msg").textContent = "Add the recipe's name and at least its ingredients or method."; return; }
  const j = await saveEdit({ op: "add-recipe", section: $("#f-ncat").value, name, intro: $("#f-nintro").value.trim(), ingredients, steps, notes: $("#f-nnotes").value.trim() }, $("#f-msg"), $("#f-submit"));
  if (!j) return;
  $("#dlg-new").close(); toast("Recipe added for everyone");
  if (j.recipeId) location.hash = "r-" + j.recipeId;
});

/* ---------------- read a recipe from a photo ----------------
   The relay holds the Gemini key and only answers this site. */
$("#f-scan").hidden = !onWeb;
const blobB64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
async function readRecipePhotos(files) {
  const images = await Promise.all(files.map(async f => blobB64(await shrink(f, 1600))));
  const res = await fetch(RELAY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images, sections: CATS }) });
  if (!res.ok) { const err = new Error("http"); err.status = res.status; throw err; }
  return res.json();
}
$("#f-scan-file").addEventListener("change", async e => {
  const files = [...e.target.files].slice(0, 4); e.target.value = ""; if (!files.length) return;
  const box = $("#f-scan"), msg = $("#f-scan-msg");
  box.setAttribute("aria-busy", "true"); msg.className = "scan-msg"; msg.textContent = `Reading ${files.length > 1 ? "your photos" : "your photo"}… this takes a few seconds.`;
  try {
    const r = await readRecipePhotos(files);
    if (!r.isRecipe || (!r.ingredients?.length && !r.steps?.length)) throw new Error("norecipe");
    $("#f-nname").value = r.name || ""; if (CATS.includes(r.section)) $("#f-ncat").value = r.section;
    $("#f-ning").value = (r.ingredients || []).join("\n"); $("#f-nsteps").value = (r.steps || []).join("\n");
    if (r.notes && !$("#f-nnotes").value.trim()) $("#f-nnotes").value = r.notes;
    msg.textContent = "Filled in from your photo. Check it over and fix anything it misread before adding it.";
  } catch (err) {
    msg.className = "scan-msg err";
    msg.textContent = err.message === "norecipe" ? "Couldn't find a recipe in that photo. Try a closer, well-lit shot, or type it in below."
      : err.status === 429 ? "Too many photos read just now. Wait a minute and try again, or type the recipe in below."
      : err.status === 403 ? "Photo reading only works on the cookbook's own site. Type the recipe in below instead."
      : err.name === "TypeError" && !navigator.onLine ? "You're offline. Connect and try again."
      : "Couldn't read that photo. Try again, or type the recipe in below.";
  } finally { box.removeAttribute("aria-busy"); }
});

/* ---------------- cook mode ---------------- */
let cook = null, wake = null;
function openCook(r) {
  const steps = r.steps.flatMap(g => g.items.map(t => ({ g: g.h, t })));
  cook = { r, steps, i: 0, showIng: false }; drawCook(); $("#cook").hidden = false; document.body.style.overflow = "hidden";
  try { navigator.wakeLock?.request("screen").then(w => wake = w).catch(() => {}); } catch {}
}
function closeCook() { $("#cook").hidden = true; document.body.style.overflow = ""; cook = null; try { wake?.release(); } catch {} wake = null; }
function drawCook() {
  const { r, steps, i } = cook, s = steps[i];
  $("#cook").innerHTML = `
  <div class="cook-top"><h2 id="cook-title">${esc(r.name)}</h2><div style="display:flex;gap:6px"><button class="btn sm" data-cook="ing">Ingredients</button><button class="btn sm ink" data-cook="close">Done cooking</button></div></div>
  <div class="cook-main">
    <div class="cook-step" aria-live="polite"><span class="grp">Step ${i + 1} of ${steps.length}${s.g ? " · " + esc(s.g) : ""}</span><p>${esc(s.t)}</p></div>
    <div class="cook-ing ${cook.showIng ? "show" : ""}"><div class="eyebrow" style="margin-bottom:8px">Ingredients${S.factor !== 1 ? ` · ${S.factor}×` : ""}</div><ul class="ing">${r.ing.map(x => x.g ? `<li class="grp">${esc(x.g)}</li>` : `<li class="line"><span class="txt" style="font-size:.95rem">${scaleLine(x.t, S.factor).html}</span></li>`).join("")}</ul></div>
  </div>
  <div class="cook-nav"><button class="btn" data-cook="prev" ${i === 0 ? "disabled" : ""}>${ICON.left} Back</button><div class="progress" aria-hidden="true"><i style="width:${((i + 1) / steps.length) * 100}%"></i></div><button class="btn primary" data-cook="next">${i === steps.length - 1 ? "Finish" : "Next"} ${ICON.right}</button></div>`;
}
$("#cook").addEventListener("click", e => {
  const b = e.target.closest("[data-cook]"); if (!b) return; const a = b.dataset.cook;
  if (a === "close") closeCook();
  else if (a === "ing") { cook.showIng = !cook.showIng; drawCook(); }
  else if (a === "prev" && cook.i > 0) { cook.i--; drawCook(); }
  else if (a === "next") { if (cook.i < cook.steps.length - 1) { cook.i++; drawCook(); } else { closeCook(); toast("Enjoy! Share a memory of this dish any time."); } }
});
document.addEventListener("keydown", e => {
  if (!cook) return;
  if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); if (cook.i < cook.steps.length - 1) { cook.i++; drawCook(); } }
  else if (e.key === "ArrowLeft") { if (cook.i > 0) { cook.i--; drawCook(); } }
  else if (e.key === "Escape") closeCook();
});

/* ---------------- real photos ---------------- */
let phR = null, phBusy = false, phErr = "";
function openPhoto(r) { phR = r; phBusy = false; phErr = ""; drawPhoto(); $("#dlg-photo").showModal(); }
function drawPhoto() {
  const r = phR, mine = LOCAL[r.id], im = imgFor(r.id), file = r.id + ".jpg";
  $("#ph-title").textContent = r.name;
  $("#ph-eyebrow").textContent = mine ? "Your photo" : im && im.kind !== "ai" ? "Replace the photo" : "Add a real photo";
  const picker = label => `<label class="ph-pick" style="position:relative">${ICON.camera}<b>${phBusy ? "Preparing photo…" : label}</b><span class="muted" style="font-size:.82rem">A landscape shot of the finished dish looks best. Large photos are shrunk before saving.</span><input type="file" accept="image/*" id="ph-file" ${phBusy ? "disabled" : ""}></label>`;
  const err = phErr ? `<div class="formmsg" role="alert">${esc(phErr)}</div>` : "";
  $("#ph-body").innerHTML = mine ? `
    <div class="ph-preview"><img src="${esc(mine.url)}" alt="${esc(imgAlt(r, { kind: "local" }))}"></div>
    <ol class="ph-steps">
      <li><b>It's showing on this device now.</b> Nobody else can see it yet.</li>
      <li>To put it in the cookbook for everyone, download it. It's already named <code>${esc(file)}</code> so it slots straight in.<br><button class="btn sm primary" data-ph="download">${ICON.down} Download ${esc(file)}</button></li>
      <li>Send it to Robert by email or text. Or, if you have access to the cookbook on GitHub, upload it to the photos folder and it will appear for everyone in a minute or two.<br><a class="btn sm" href="${REPO_URL}/upload/main/photos" target="_blank" rel="noopener">${ICON.ext} Open the photos folder</a></li>
    </ol>
    ${err}${picker("Choose a different photo")}
    <div><button class="btn sm ghost" data-ph="remove">Remove from this device</button></div>`
    : `${im ? `<div class="ph-preview"><img src="${esc(im.src)}" alt="${esc(imgAlt(r, im))}"></div><p class="muted" style="margin:0;font-size:.88rem">${im.kind === "ai" ? "This is an AI-generated stand-in, not the family's own dish. A real photo of the way you make it will replace it." : "This is the cookbook's current photo. Choose another to propose a replacement."}</p>` : ""}
    ${err}${picker("Choose a photo")}`;
  $("#ph-foot").textContent = mine ? `Saved ${ago(mine.at)}` : "Photos stay on your device until you send them.";
}
async function shrink(file, max = 2000) {
  let src;
  try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { src = new Image(); src.src = URL.createObjectURL(file); try { await src.decode(); } finally { URL.revokeObjectURL(src.src); } }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight, k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("encode")), "image/jpeg", .85));
}
$("#dlg-photo").addEventListener("change", async e => {
  if (e.target.id !== "ph-file" || !e.target.files[0]) return;
  const f = e.target.files[0]; phBusy = true; phErr = ""; drawPhoto();
  try {
    const rec = { blob: await shrink(f), at: Date.now() };
    try { await idb.put(phR.id, rec); } catch { phErr = "This browser won't keep the photo after you close the page, but you can still download it now."; }
    setLocal(phR.id, rec); render(); toast("Photo added");
  } catch { phErr = "Couldn't read that photo. Try a JPEG or PNG."; }
  phBusy = false; drawPhoto();
});
$("#dlg-photo").addEventListener("click", async e => {
  const b = e.target.closest("[data-ph]"); if (!b) return;
  const mine = LOCAL[phR.id], file = phR.id + ".jpg";
  if (b.dataset.ph === "download" && mine) {
    if (downloads) { try { await downloads.save({ filename: file, data: mine.blob }); return; } catch (err) { if (err?.code === "declined" || err?.code === "cancelled") return; } }
    const a = document.createElement("a"); a.href = mine.url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
  }
  if (b.dataset.ph === "remove") { try { await idb.del(phR.id); } catch {} setLocal(phR.id, null); render(); drawPhoto(); toast("Removed from this device"); }
});

/* ---------------- light / dark ----------------
   Follows the device's setting unless someone picks the other one here; picking the same as the
   device clears the choice, so it goes back to following the device. */
const darkMQ = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (document.documentElement.dataset.theme || (darkMQ.matches ? "dark" : "light")) === "dark";
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';
function drawTheme() {
  const dark = isDark(), b = $("#theme-btn");
  b.innerHTML = dark ? SUN : MOON;
  b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode"); b.title = b.getAttribute("aria-label");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#11151f" : "#1c2540");
}
$("#theme-btn").addEventListener("click", () => {
  const want = isDark() ? "light" : "dark", system = darkMQ.matches ? "dark" : "light";
  if (want === system) { delete document.documentElement.dataset.theme; store.set("theme", null); }
  else { document.documentElement.dataset.theme = want; store.set("theme", want); }
  drawTheme();
});
darkMQ.addEventListener?.("change", drawTheme);
drawTheme();

/* ---------------- install as an app ---------------- */
// Chrome/Edge/Samsung offer a real install prompt; iPhone and others get step-by-step instructions.
let installEvt = null, installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const framed = (() => { try { return window.self !== window.top; } catch { return true; } })();
const canInstall = () => !installed && !framed && /^https?:$/.test(location.protocol);
let installWaiters = [];
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; installWaiters.forEach(f => f()); installWaiters = []; });
const drawInstall = () => { $("#install-btn").hidden = !canInstall(); };
drawInstall();
addEventListener("appinstalled", () => { installed = true; installEvt = null; drawInstall(); toast("The cookbook is on your home screen"); });
if ("serviceWorker" in navigator && !framed && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
async function install() {
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  // Chrome, Edge and Samsung Internet can install directly, but only once they've offered the prompt,
  // which can take a few seconds after the page loads; give it a moment before falling back.
  if (!installEvt && !ios && "BeforeInstallPromptEvent" in window) {
    const btn = $("#install-btn"); btn.disabled = true;
    await new Promise(res => { installWaiters.push(res); setTimeout(res, 3000); });
    btn.disabled = false;
  }
  if (installEvt) { const e = installEvt; installEvt = null; e.prompt(); try { await e.userChoice; } catch {} return; }
  const steps = ios ? ["Tap the <b>Share</b> button (the square with an arrow pointing up). In Safari it's at the bottom of the screen; in Chrome it's at the top right.", "Scroll down and tap <b>Add to Home Screen</b>.", "Tap <b>Add</b>. The cookbook appears on your home screen."]
    : android ? ["Tap the <b>⋮</b> menu at the top right of your browser.", "Tap <b>Install app</b> or <b>Add to Home screen</b>.", "Tap <b>Install</b> (or <b>Add</b>). The cookbook appears on your home screen."]
    : ["In Chrome or Edge, click the <b>install icon</b> at the right end of the address bar, or open the <b>⋮</b> menu and choose <b>Install</b> (in Edge: <b>Apps → Install this site as an app</b>).", "On a Mac in Safari, choose <b>File → Add to Dock</b>.", "To get it on your phone, open this page on the phone and tap <b>Get the app</b> there."];
  $("#in-body").innerHTML = `<ol class="ph-steps">${steps.map(t => `<li>${t}</li>`).join("")}</ol>`;
  $("#dlg-install").showModal();
}

/* ---------------- ask claude ---------------- */
let askR = null, askCtl = null, lastAnswer = "";
const recipeText = r => `${r.name} (${r.cat})${r.serves ? "\nServes: " + r.serves : ""}\n${r.intro}\nIngredients:\n${r.ing.map(i => i.g ? i.g + ":" : "- " + i.t).join("\n")}\nMethod:\n${r.steps.map(g => (g.h ? g.h + ":\n" : "") + g.items.map(t => "- " + t).join("\n")).join("\n")}`;
function openAsk(r) {
  askR = r; $("#ask-title").textContent = r.name; $("#ask-q").value = ""; $("#ask-a").textContent = "";
  $("#ask-chips").innerHTML = ["Convert this to metric", "Can I make it ahead?", "What can I substitute?", "What goes well with it?", "Is anything missing or unclear?"].map(q => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  $("#dlg-ask").showModal();
}
$("#ask-chips").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) { $("#ask-q").value = b.dataset.q; ask(); } });
$("#ask-form").addEventListener("submit", e => { e.preventDefault(); ask(); });
$("#dlg-ask").addEventListener("close", () => askCtl?.abort());
async function ask() {
  const q = $("#ask-q").value.trim(); if (!q || !sample) return;
  askCtl?.abort(); askCtl = new AbortController();
  const out = $("#ask-a"); out.textContent = "Thinking…"; $("#ask-go").disabled = true;
  const prompt = `You are helping a family cook from their handed-down family cookbook. Answer the question about the recipe below in plain, warm, practical language. Keep it under 180 words. Use short lines or a simple list where it helps; no markdown headings, no bold. If the question reveals a likely error or gap in the written recipe, say so plainly.\n\nRECIPE\n${recipeText(askR)}\n\nQUESTION\n${q}`;
  try {
    const res = await sample(prompt, { signal: askCtl.signal, modelTier: "quick", onText: u => { out.textContent = u.text.replace(/\*\*/g, ""); } });
    lastAnswer = res.text.replace(/\*\*/g, ""); out.textContent = lastAnswer;
  } catch (err) {
    if (err?.name === "AbortError" || err?.code === "aborted") return;
    out.textContent = err?.code === "not_granted" ? "Claude isn't available in this view." : err?.code === "rate_limited" ? "Too many questions at once. Wait a minute and ask again." : "Claude couldn't answer just now. Try again in a moment.";
  } finally { $("#ask-go").disabled = false; }
}

/* ---------------- memories and comments ---------------- */
const notesLoading = new Set();
async function loadNotes(id, force) {
  if (!onWeb) { S.notes[id] = "error"; return; }
  if ((!force && S.notes[id] !== undefined) || notesLoading.has(id)) return;
  notesLoading.add(id);
  try {
    const r = BY[id], res = await fetch(`${RELAY}/notes?ids=${encodeURIComponent([id, ...r.aliases].join(","))}`);
    if (!res.ok) throw 0;
    S.notes[id] = (await res.json()).notes;
  } catch { S.notes[id] = "error"; }
  notesLoading.delete(id);
  if (route().id === id) render();
}
async function postNote(form) {
  const r = BY[route().id], kind = form.dataset.note, text = form.text.value.trim(), btn = form.querySelector("[type=submit]");
  if (!r || !text) { form.text.focus(); return; }
  btn.disabled = true;
  try {
    const res = await fetch(RELAY + "/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId: r.id, kind, text, by: myName() }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error);
    S.myNotes[j.note.id] = j.key; store.set("mynotes", S.myNotes);
    S.notes[r.id] = [j.note, ...(Array.isArray(S.notes[r.id]) ? S.notes[r.id] : [])];
    delete S.drafts[r.id + kind]; render(); toast(kind === "memory" ? "Memory shared. Thank you!" : "Comment posted");
  } catch (e) {
    btn.disabled = false;
    toast(e.message === "rate_limited" || e.message === "daily_limit" ? "That's a lot of posts at once. Try again a little later." : "That didn't post. Check your connection and try again.");
  }
}
async function deleteNote(recipeId, id) {
  try {
    const res = await fetch(RELAY + "/notes/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId, id, key: S.myNotes[id] }) });
    if (!res.ok) throw 0;
    delete S.myNotes[id]; store.set("mynotes", S.myNotes);
    for (const k of Object.keys(S.notes)) if (Array.isArray(S.notes[k])) S.notes[k] = S.notes[k].filter(n => n.id !== id);
    render(); toast("Deleted");
  } catch { toast("Couldn't delete that. Try again."); }
}

async function boot() {
  render();
  loadLocalPhotos();
  const use = n => (window.claude && typeof window.claude.use === "function") ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
  use("sample").then(s => { sample = s; if (route().v === "recipe") render(); });
  use("downloads").then(d => downloads = d);
  if (onWeb) try { const res = await fetch(RELAY + "/book"); if (res.ok) applyBookText((await res.json()).text); } catch {}
}
boot();
})();

