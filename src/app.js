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
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4Z"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>'
};

/* ---------------- parse the book ---------------- */
const CAT_VAR = { "Appetizers": "--c-app", "Salads": "--c-sal", "Soups & Chowders": "--c-soup", "Main Courses": "--c-main", "Bread & Baking": "--c-bread", "Desserts": "--c-des", "Condiments": "--c-cond" };
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function parseBook(txt) {
  const out = []; let cat = "", r = null, grp = null;
  for (const raw of txt.split("\n")) {
    const l = raw.trim(); if (!l) continue;
    const body = l.replace(/^(-:|[#@^>\-=*.!])\s?/, "");
    if (l.startsWith("# ")) { cat = body; continue; }
    if (l.startsWith("@ ")) { r = { id: slug(body), name: body, cat, serves: "", intro: "", ing: [], steps: [], outro: "", notes: [] }; out.push(r); grp = null; continue; }
    if (!r) continue;
    if (l.startsWith("^ ")) r.serves = body;
    else if (l.startsWith("> ")) r.intro = body;
    else if (l.startsWith("-:")) r.ing.push({ g: body });
    else if (l.startsWith("- ")) r.ing.push({ t: body });
    else if (l.startsWith("= ")) { grp = { h: body, items: [] }; r.steps.push(grp); }
    else if (l.startsWith("* ")) { if (!grp) { grp = { h: "", items: [] }; r.steps.push(grp); } grp.items.push(body); }
    else if (l.startsWith(". ")) r.outro = body;
    else if (l.startsWith("! ")) r.notes.push(body);
  }
  out.forEach(r => { r.search = (r.name + " " + r.cat + " " + r.ing.map(i => i.t || "").join(" ")).toLowerCase(); r.nIng = r.ing.filter(i => i.t).length; r.nSteps = r.steps.reduce((a, g) => a + g.items.length, 0); });
  return out;
}
const RECIPES = parseBook(document.getElementById("book").textContent);
const BY = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const CATS = [...new Set(RECIPES.map(r => r.cat))];
const catStyle = c => `--cat:var(${CAT_VAR[c] || "--ink-3"})`;

/* ---------------- images ----------------
   Precedence: a photo saved on this device > a real photo in photos/ > the AI image in images/ai/.
   build.sh lists what's in the repo; device photos live in IndexedDB. */
const REPO_URL = "https://github.com/sandboxplatform/chambers-family-cookbook";
const IMAGES = (() => { try { return JSON.parse(document.getElementById("images")?.textContent || "{}"); } catch { return {}; } })();
const LOCAL = {};
function imgFor(id) {
  if (LOCAL[id]) return { src: LOCAL[id].url, kind: "local" };
  const m = IMAGES[id] || {};
  if (m.photo) return { src: m.photo, kind: "photo" };
  if (m.ai) return { src: m.ai, kind: "ai" };
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
  fav: new Set(store.get("fav", [])), checks: store.get("checks", {}), list: store.get("list", []),
  sugg: [], stories: [], desk: {}, dbState: "loading",
  me: { id: null, canEdit: false, canWrite: null, readOnly: false }, names: {},
  sFilter: { status: "open", recipe: "" }
};
let db = null, user = null, sample = null, downloads = null;
const saveLocal = () => { store.set("fav", [...S.fav]); store.set("checks", S.checks); store.set("list", S.list); store.set("cat", S.cat); };

/* ---------------- routing ---------------- */
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("r-") && BY[h.slice(2)]) return { v: "recipe", id: h.slice(2) };
  if (["suggestions", "list", "desk"].includes(h)) return { v: h };
  return { v: "home" };
}
let lastRoute = "";
function render() {
  const r = route(), key = r.v + (r.id || "");
  const changed = key !== lastRoute;
  if (changed && r.v === "recipe") S.factor = 1;
  const view = $("#view");
  if (r.v === "recipe") view.innerHTML = vRecipe(BY[r.id]);
  else if (r.v === "suggestions") view.innerHTML = vSuggestions();
  else if (r.v === "list") view.innerHTML = vList();
  else if (r.v === "desk") view.innerHTML = vDesk();
  else view.innerHTML = vHome();
  const navKey = r.v === "recipe" ? "home" : r.v;
  $$(".nav a").forEach(a => a.dataset.nav === navKey ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
  const open = S.sugg.filter(s => s.status === "open").length;
  const no = $("#nav-open"); no.hidden = !open; no.textContent = open;
  const nl = $("#nav-list"); const listN = S.list.reduce((a, x) => a + x.items.filter(i => !i.done).length, 0); nl.hidden = !listN; nl.textContent = listN;
  if (changed) { lastRoute = key; window.scrollTo(0, 0); document.title = r.v === "recipe" ? BY[r.id].name + " · The Chambers Family Cookbook" : "The Chambers Family Cookbook"; }
}
addEventListener("hashchange", render);

/* ---------------- helpers ---------------- */
const suggFor = id => S.sugg.filter(s => s.recipeId === id);
const storiesFor = id => S.stories.filter(s => s.recipeId === id);
function who(o) { return o.signedAs || (o.authorId && S.names[o.authorId]) || "A family member"; }
function ago(ts) {
  if (!ts) return ""; const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now"; if (d < 3600) return Math.floor(d / 60) + " min ago"; if (d < 86400) return Math.floor(d / 3600) + " h ago";
  if (d < 86400 * 7) return Math.floor(d / 86400) + " d ago";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: d > 86400 * 300 ? "numeric" : undefined });
}
const KINDS = [
  { k: "fix", label: "Fix a mistake", now: "What it should say" },
  { k: "ingredient", label: "Change an ingredient", now: "What it should say" },
  { k: "step", label: "Change a step", now: "What it should say" },
  { k: "missing", label: "Add missing info", now: "What's missing" },
  { k: "intro", label: "Write an introduction", now: "Your introduction" },
  { k: "memory", label: "Share a memory", now: "Your memory or story" },
  { k: "new", label: "Add a missing recipe", now: "Anything else we should know" },
  { k: "other", label: "Something else", now: "Your suggestion" }
];
const KIND = Object.fromEntries(KINDS.map(k => [k.k, k]));
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast("Copied"); return true; } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch {} ta.remove(); toast(ok ? "Copied" : "Couldn't copy. Select the text and copy it yourself."); return ok; } }

/* ---------------- views ---------------- */
function card(r) {
  const fav = S.fav.has(r.id), n = suggFor(r.id).filter(s => s.status === "open").length, m = storiesFor(r.id).length, im = imgFor(r.id);
  return `<a class="rc" href="#r-${r.id}" style="${catStyle(r.cat)}">
    ${im ? `<span class="rc-img" data-img><img src="${esc(im.src)}" alt="${esc(imgAlt(r, im))}" loading="lazy" decoding="async" ${imgGone}><span class="img-tag ${im.kind === "ai" ? "" : "real"}">${IMG_TAG[im.kind]}</span></span>` : ""}
    <span class="badges">${fav ? `<span class="dot fav" title="Favourite">${ICON.heart}</span>` : ""}${n ? `<span class="dot" title="${n} open suggestion${n > 1 ? "s" : ""}">${ICON.pencil}${n}</span>` : ""}${m ? `<span class="dot" title="${m} family memor${m > 1 ? "ies" : "y"}">${ICON.chat}${m}</span>` : ""}</span>
    <span class="cat">${esc(r.cat)}</span><h3>${esc(r.name)}</h3>
    <span class="meta"><span>${r.nIng} ingredients</span>${r.serves ? `<span>serves ${esc(r.serves)}</span>` : ""}${r.notes.length ? `<span style="color:var(--amber)">needs a look</span>` : ""}</span></a>`;
}
function filtered() {
  const q = S.q.trim().toLowerCase();
  return RECIPES.filter(r => (S.cat === "All" || r.cat === S.cat) &&
    (!q || q.split(/\s+/).every(w => r.search.includes(w))) &&
    (S.filter === "all" || (S.filter === "fav" && S.fav.has(r.id)) || (S.filter === "crock" && /crockpot|slow cooker/i.test(r.name + r.steps.map(g => g.items.join(" ")).join(" "))) || (S.filter === "review" && (r.notes.length || suggFor(r.id).some(s => s.status === "open"))) || (S.filter === "story" && storiesFor(r.id).length)));
}
function vHome() {
  const open = S.sugg.filter(s => s.status === "open").length;
  const list = filtered();
  const recent = S.sugg.slice(0, 4), mems = S.stories.slice(0, 3);
  return `
  <section class="hero">
    <div>
      <h1>The Chambers Family Cookbook</h1>
      <p class="ded">for Nancy Chambers</p>
      <p class="lede">Food is more than just nourishment. It's a cherished connection to our past, present, and future. Each recipe here carries a piece of family heritage, passed down through generations. Cook from it, add your memories, and help us get every card right before it goes to print.</p>
    </div>
    <div class="hero-side">
      <div class="stats">
        <div class="stat"><b>${RECIPES.length}</b><span>recipes</span></div>
        <div class="stat"><b>${open}</b><span>open suggestions</span></div>
        <div class="stat"><b>${S.stories.length}</b><span>family memories</span></div>
      </div>
      <div class="hero-actions">
        <button class="btn primary" data-act="suggest">${ICON.pencil} Suggest a change</button>
        <button class="btn" data-act="new-recipe">${ICON.plus} Add a missing recipe</button>
        <button class="btn ghost" data-act="random">${ICON.dice} What should I cook?</button>
      </div>
    </div>
  </section>
  <div class="dividers" role="group" aria-label="Sections">
    ${["All", ...CATS].map(c => `<button class="tab" style="${c === "All" ? "" : catStyle(c)}" data-cat="${esc(c)}" aria-pressed="${S.cat === c}">${c === "All" ? "" : "<i></i>"}${esc(c)} <small>${c === "All" ? RECIPES.length : RECIPES.filter(r => r.cat === c).length}</small></button>`).join("")}
  </div>
  <section class="drawer">
    <div class="tools">
      <div class="chips" role="group" aria-label="Filter">
        ${[["all", "Everything"], ["fav", "My favourites"], ["crock", "Crockpot"], ["story", "Has memories"], ["review", "Needs review"]].map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join("")}
      </div>
      <span class="muted" style="font-size:.86rem">${list.length} of ${RECIPES.length} recipes${S.q ? ` matching “${esc(S.q)}”` : ""}</span>
    </div>
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` :
      `<div class="empty"><h3>No recipes match</h3><p>Try another word, or clear the filters.</p><button class="btn" data-act="clear">Clear search and filters</button></div>`}
  </section>
  <section class="feed">
    <div class="panel">
      <div class="panel-head"><h2>Latest suggestions</h2><a class="btn sm ghost" href="#suggestions">See all</a></div>
      ${recent.length ? `<div class="stack">${recent.map(s => suggItem(s, true)).join("")}</div>` : emptyFeed("No suggestions yet", "Open any recipe and tap the pencil next to a line to propose a fix.")}
    </div>
    <div class="panel">
      <div class="panel-head"><h2>From the family</h2></div>
      ${mems.length ? `<div class="stack">${mems.map(m => `<div class="memory"><a href="#r-${esc(m.recipeId)}" class="eyebrow" style="text-decoration:none">${esc(BY[m.recipeId]?.name || "Recipe")}</a><p style="margin-top:6px">${esc(m.text)}</p><div class="by">${esc(who(m))}</div></div>`).join("")}</div>` : emptyFeed("No memories yet", "Who made Nannie's Bread every Sunday? Open a recipe and choose “Share a memory”.")}
    </div>
  </section>`;
}
function emptyFeed(h, p) { return `<div class="empty" style="padding:22px 8px"><h3 style="font-size:1.05rem">${h}</h3><p style="margin:0">${p}</p>${S.dbState === "loading" ? `<p class="muted" style="font-size:.8rem">Loading…</p>` : ""}</div>`; }

function vRecipe(r) {
  const f = S.factor, ck = S.checks[r.id] || {};
  let ii = 0;
  const ingHtml = r.ing.map(i => {
    if (i.g) return `<li class="grp">${esc(i.g)}</li>`;
    const k = "i" + (ii++), s = scaleLine(i.t, f);
    return `<li class="line ${ck[k] ? "done" : ""}"><button class="tick" data-tick="${k}" aria-label="Mark ${esc(i.t)} as gathered" aria-pressed="${!!ck[k]}">${ICON.check}</button><span class="txt">${s.html}</span><button class="edit" data-edit="ingredient" data-text="${esc(i.t)}" aria-label="Suggest a change to: ${esc(i.t)}" title="Suggest a change">${ICON.pencil}</button></li>`;
  }).join("");
  let n = 0;
  const stepsHtml = r.steps.map(g => `<div class="sg">${g.h ? `<h3><span class="n">${String(r.steps.indexOf(g) + 1)}</span>${esc(g.h)}</h3>` : ""}<ul class="ing" style="font-family:var(--f-body)">${g.items.map(t => { const k = "s" + (n++); return `<li class="line ${ck[k] ? "done" : ""}"><button class="tick" data-tick="${k}" aria-label="Mark step done" aria-pressed="${!!ck[k]}">${ICON.check}</button><span class="txt" style="font-family:var(--f-body)">${esc(t)}</span><button class="edit" data-edit="step" data-text="${esc(t)}" aria-label="Suggest a change to this step" title="Suggest a change">${ICON.pencil}</button></li>`; }).join("")}</ul></div>`).join("");
  const sg = suggFor(r.id), mem = storiesFor(r.id);
  const fav = S.fav.has(r.id);
  const idx = RECIPES.indexOf(r), prev = RECIPES[idx - 1], next = RECIPES[idx + 1];
  const anyChecked = Object.values(ck).some(Boolean);
  return `
  <nav class="crumbs" aria-label="Breadcrumb"><a href="#">All recipes</a><span>/</span><a href="#" data-cat-link="${esc(r.cat)}">${esc(r.cat)}</a></nav>
  <div class="recipe">
    <article class="card" style="${catStyle(r.cat)}">
      ${heroImg(r)}
      <header class="card-top">
        <div class="cat">${esc(r.cat)}</div>
        <h1>${esc(r.name)}</h1>
        ${r.intro ? `<p class="intro">${esc(r.intro)}</p>` : `<p class="intro muted">No introduction yet. <button class="btn sm" data-act="suggest-kind" data-kind="intro">Write one</button></p>`}
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" data-act="cook">${ICON.pot} Cook mode</button>
          <button class="btn" data-act="fav" aria-pressed="${fav}">${fav ? ICON.heart : ICON.heartO} ${fav ? "Favourite" : "Add to favourites"}</button>
          <button class="btn" data-act="to-list">${ICON.cart} Add to shopping list</button>
          <button class="btn" data-act="ask" ${sample === null ? "hidden" : ""}>${ICON.spark} Ask Claude</button>
        </div>
      </header>
      <div class="card-body">
        ${r.notes.map((nt, i) => { const done = S.desk[r.id + ":" + i]; return `<div class="ednote ${done ? "done" : ""}">${ICON.note}<div><p><b>Editor's note.</b> ${esc(nt)}</p>${done ? ` <span class="pill accepted">Resolved</span>` : `<button class="btn sm ghost" data-act="suggest-kind" data-kind="fix" data-text="${esc(nt)}">I know the answer</button>`}</div></div>`; }).join("")}
        <div class="scaler">
          <span class="eyebrow">Batch size</span>
          <div class="seg" role="group" aria-label="Scale quantities">${[[.5, "½×"], [1, "1×"], [2, "2×"], [3, "3×"]].map(([v, l]) => `<button data-scale="${v}" aria-pressed="${f === v}">${l}</button>`).join("")}</div>
          ${r.serves ? `<span class="serves">Serves ${esc(scaledText(r.serves, f))}</span>` : ""}
          ${f !== 1 ? `<span class="muted" style="font-size:.8rem">Highlighted amounts are scaled. Step text and cooking times stay as written.</span>` : ""}
        </div>
        <section><div class="sec-h"><h2>Ingredients</h2><span class="muted">${anyChecked ? `<button class="btn sm ghost" data-act="uncheck">Clear ticks</button>` : "Tick as you gather"}</span></div><ul class="ing">${ingHtml}</ul></section>
        <section><div class="sec-h"><h2>Method</h2><span class="muted">Tap the pencil to suggest an edit</span></div><div class="steps">${stepsHtml}</div></section>
        ${r.outro ? `<p class="outro">${esc(r.outro)}</p>` : ""}
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:16px">
          ${prev ? `<a class="btn ghost sm" href="#r-${prev.id}">${ICON.left} ${esc(prev.name)}</a>` : "<span></span>"}
          ${next ? `<a class="btn ghost sm" href="#r-${next.id}">${esc(next.name)} ${ICON.right}</a>` : ""}
        </div>
      </div>
    </article>
    <aside class="side">
      <div class="panel">
        <div class="panel-head"><h2>Improve this recipe</h2></div>
        <div class="stack">
          <button class="btn primary" data-act="suggest-kind" data-kind="fix">${ICON.pencil} Suggest a change</button>
          <button class="btn" data-act="suggest-kind" data-kind="memory">${ICON.chat} Share a memory</button>
        </div>
        ${sg.length ? `<div class="stack" style="margin-top:16px">${sg.map(s => suggItem(s, false, true)).join("")}</div>` : `<p class="muted" style="font-size:.88rem;margin:14px 0 0">No suggestions for this recipe yet.</p>`}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Family memories</h2><span class="muted" style="font-size:.85rem">${mem.length || ""}</span></div>
        ${mem.length ? `<div class="stack">${mem.map(m => `<div class="memory"><p>${esc(m.text)}</p><div class="by">${esc(who(m))}</div><div class="muted" style="font-size:.75rem">${ago(m.createdAt)} ${canDelete(m) ? `· <button class="btn sm ghost" style="padding:2px 6px" data-del-story="${esc(m.id)}">Delete</button>` : ""}</div></div>`).join("")}</div>` : `<p class="muted" style="font-size:.88rem;margin:0">Who made this? When was it served? Add a memory and it will appear here.</p>`}
      </div>
    </aside>
  </div>`;
}
function heroImg(r) {
  const im = imgFor(r.id);
  if (!im) return `<div class="add-photo"><span>No picture of this dish yet.</span><button class="btn sm" data-act="photo">${ICON.camera} Add a real photo</button></div>`;
  const tag = im.kind === "ai" ? "AI-generated picture, not the family's dish" : im.kind === "local" ? "Your photo · only on this device so far" : "Family photo";
  return `<figure class="hero-img" data-img><img src="${esc(im.src)}" alt="${esc(imgAlt(r, im))}" decoding="async" ${imgGone}>
    <figcaption><span class="img-tag ${im.kind === "ai" ? "" : "real"}">${tag}</span><button class="btn sm" data-act="photo">${ICON.camera} ${im.kind === "ai" ? "Add a real photo" : "Replace photo"}</button></figcaption></figure>`;
}
function canDelete(o) { return S.me.canEdit || (S.me.id && o.authorId === S.me.id); }
function suggItem(s, compact, inRecipe) {
  const r = BY[s.recipeId];
  const kind = KIND[s.kind]?.label || "Suggestion";
  const title = s.kind === "new" ? (s.newRecipe?.name || "New recipe") : (r ? r.name : "General");
  const body = s.kind === "new" ? `<div class="diff"><div class="now"><span class="lab">Ingredients</span>${esc(s.newRecipe?.ingredients || "")}</div><div class="now" style="font-family:var(--f-body)"><span class="lab">Steps</span>${esc(s.newRecipe?.steps || "")}</div></div>${s.proposed ? `<p class="why">${esc(s.proposed)}</p>` : ""}`
    : `<div class="diff">${s.current ? `<div class="was"><span class="lab">Book says</span>${esc(s.current)}</div>` : ""}${s.proposed ? `<div class="now"><span class="lab">${s.kind === "memory" ? "Memory" : "Suggested"}</span>${esc(s.proposed)}</div>` : ""}</div>`;
  const editor = S.me.canEdit && !compact;
  return `<article class="sugg">
    <div class="sugg-head"><div>${inRecipe ? "" : (s.kind === "new" ? `<span style="font-family:var(--f-display);font-size:1.1rem">${esc(title)}</span>` : `<a href="#r-${esc(s.recipeId)}">${esc(title)}</a>`)}<div class="kind">${esc(kind)}${s.kind === "new" && s.newRecipe?.cat ? " · " + esc(s.newRecipe.cat) : ""}</div></div><span class="pill ${esc(s.status)}">${esc(s.status)}</span></div>
    ${compact ? `<div class="diff">${s.current ? `<div class="was">${esc(s.current.slice(0, 120))}</div>` : ""}<div class="now">${esc((s.proposed || s.newRecipe?.name || "").slice(0, 160))}</div></div>` : body}
    ${!compact && s.reason ? `<p class="why"><b>Why:</b> ${esc(s.reason)}</p>` : ""}
    ${!compact && s.resolution ? `<p class="resolution"><b>Editor:</b> ${esc(s.resolution)}</p>` : ""}
    <div class="sugg-foot"><span><span class="by">${esc(who(s))}</span> · ${ago(s.createdAt)}</span>
      ${editor || (!compact && canDelete(s)) ? `<span style="display:flex;gap:6px;flex-wrap:wrap">
        ${editor && s.status !== "accepted" ? `<button class="btn sm" data-resolve="accepted" data-id="${esc(s.id)}">Accept</button>` : ""}
        ${editor && s.status !== "declined" ? `<button class="btn sm ghost" data-resolve="declined" data-id="${esc(s.id)}">Decline</button>` : ""}
        ${editor && s.status !== "open" ? `<button class="btn sm ghost" data-resolve="open" data-id="${esc(s.id)}">Reopen</button>` : ""}
        ${canDelete(s) ? `<button class="btn sm ghost" data-del-sugg="${esc(s.id)}">Delete</button>` : ""}</span>` : ""}
    </div></article>`;
}
function vSuggestions() {
  const f = S.sFilter;
  const list = S.sugg.filter(s => (f.status === "all" || s.status === f.status) && (!f.recipe || s.recipeId === f.recipe || (f.recipe === "__new" && s.kind === "new")));
  const counts = st => S.sugg.filter(s => st === "all" || s.status === st).length;
  const recipesWith = [...new Set(S.sugg.map(s => s.recipeId).filter(Boolean))].filter(id => BY[id]);
  return `
  <div class="ph"><div><div class="eyebrow">Review queue</div><h1>Suggested changes</h1><p>Corrections, missing details and new recipes sent in by the family. ${S.me.canEdit ? "As an editor you can accept or decline each one. Accepted changes are the to-do list for the print edition." : "Robert reviews each one before it goes into the print edition."}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="suggest">${ICON.pencil} Suggest a change</button>${S.sugg.length ? `<button class="btn" data-act="export">${ICON.down} Export CSV</button>` : ""}</div></div>
  ${dbBanner()}
  <div class="list-cols">
    <div class="filters">
      <div class="field"><span class="lbl">Status</span><div class="chips">${[["open", "Open"], ["accepted", "Accepted"], ["declined", "Declined"], ["all", "All"]].map(([k, l]) => `<button class="chip" data-sstatus="${k}" aria-pressed="${f.status === k}">${l} <span class="muted">${counts(k)}</span></button>`).join("")}</div></div>
      <div class="field"><label for="s-recipe">Recipe</label><select id="s-recipe"><option value="">All recipes</option><option value="__new" ${f.recipe === "__new" ? "selected" : ""}>New recipe submissions</option>${recipesWith.map(id => `<option value="${id}" ${f.recipe === id ? "selected" : ""}>${esc(BY[id].name)}</option>`).join("")}</select></div>
    </div>
    <div class="stack">${list.length ? list.map(s => suggItem(s, false)).join("") : `<div class="panel empty"><h3>${S.dbState === "loading" ? "Loading suggestions…" : f.status === "open" ? "Nothing waiting for review" : "No suggestions here"}</h3><p>Open any recipe and tap the pencil beside an ingredient or step to propose a change.</p></div>`}</div>
  </div>`;
}
function dbBanner() {
  if (S.dbState === "off") return `<div class="notice" style="margin-bottom:16px">Shared suggestions aren't available in this view, so you'll only see your own device's data. You can still write a suggestion and copy it to send by email.</div>`;
  if (S.me.readOnly) return `<div class="notice" style="margin-bottom:16px">You can read suggestions but not send them. Ask the cookbook's owner to give you Contributor access.</div>`;
  return "";
}
function vList() {
  const groups = S.list;
  return `<div class="ph"><div><div class="eyebrow">For the grocery run</div><h1>Shopping list</h1><p>Ingredients from the recipes you've added, at the batch size you chose. Kept on this device.</p></div>
    ${groups.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="copy-list">${ICON.copy} Copy as text</button><button class="btn ghost" data-act="clear-done">Remove ticked</button><button class="btn ghost" data-act="clear-list">Clear list</button></div>` : ""}</div>
  ${groups.length ? `<div class="shop">${groups.map((g, gi) => `<div class="panel" style="${catStyle(BY[g.id]?.cat)}"><div class="panel-head"><h3><a href="#r-${esc(g.id)}" style="text-decoration:none">${esc(g.name)}</a></h3><button class="btn sm ghost" data-rm-group="${gi}">Remove</button></div>${g.factor !== 1 ? `<div class="muted" style="font-size:.8rem;margin:-6px 0 6px">${g.factor}× batch</div>` : ""}<ul class="ing">${g.items.map((it, ii) => `<li class="line ${it.done ? "done" : ""}"><button class="tick" data-shop="${gi}:${ii}" aria-pressed="${!!it.done}" aria-label="Got ${esc(it.t)}">${ICON.check}</button><span class="txt">${esc(it.t)}</span></li>`).join("")}</ul></div>`).join("")}</div>`
    : `<div class="panel empty"><h3>Your list is empty</h3><p>Open a recipe and choose “Add to shopping list”.</p><a class="btn" href="#">Browse recipes</a></div>`}`;
}
function vDesk() {
  const items = RECIPES.flatMap(r => r.notes.map((n, i) => ({ r, n, k: r.id + ":" + i })));
  const done = items.filter(x => S.desk[x.k]).length;
  const accepted = S.sugg.filter(s => s.status === "accepted");
  return `<div class="ph"><div><div class="eyebrow">Getting ready for print</div><h1>Editor's desk</h1><p>Things in the manuscript that need a decision or a family member's knowledge before the book is printed: missing amounts, duplicate recipes, leftover transcription text. Anyone can help answer them.</p></div>
    <div class="stats" style="min-width:min(100%,360px)"><div class="stat"><b>${items.length - done}</b><span>to resolve</span></div><div class="stat"><b>${done}</b><span>resolved</span></div><div class="stat"><b>${accepted.length}</b><span>accepted edits</span></div></div></div>
  <div class="stack">${items.map(x => { const d = S.desk[x.k]; return `<div class="panel" style="display:flex;gap:14px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;${d ? "opacity:.65" : ""}">
    <div style="min-width:0;flex:1 1 320px"><a href="#r-${x.r.id}" style="font-family:var(--f-display);font-size:1.1rem;text-decoration:none">${esc(x.r.name)}</a> <span class="muted" style="font-size:.82rem">· ${esc(x.r.cat)}</span><p style="margin:6px 0 0;${d ? "text-decoration:line-through" : ""}">${esc(x.n)}</p></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${d ? `<span class="pill accepted">Resolved</span>` : `<button class="btn sm" data-act="suggest-for" data-id="${x.r.id}" data-text="${esc(x.n)}">${ICON.pencil} I know the answer</button>`}
    ${S.me.canEdit && S.dbState === "on" ? `<button class="btn sm ghost" data-desk="${esc(x.k)}">${d ? "Reopen" : "Mark resolved"}</button>` : ""}</div></div>`; }).join("")}</div>`;
}

/* ---------------- events ---------------- */
$("#q").addEventListener("input", e => { S.q = e.target.value; if (route().v !== "home") location.hash = ""; render(); });
document.addEventListener("click", async e => {
  const t = e.target.closest("button,a"); if (!t) return;
  const d = t.dataset, r = BY[route().id];
  if (d.cat) { S.cat = d.cat; saveLocal(); render(); return; }
  if (d.catLink) { e.preventDefault(); S.cat = d.catLink; saveLocal(); location.hash = ""; render(); return; }
  if (d.filter) { S.filter = d.filter; render(); return; }
  if (d.scale) { S.factor = +d.scale; render(); return; }
  if (d.tick && r) { const c = S.checks[r.id] = S.checks[r.id] || {}; c[d.tick] = !c[d.tick]; saveLocal(); render(); return; }
  if (d.shop) { const [g, i] = d.shop.split(":").map(Number); S.list[g].items[i].done = !S.list[g].items[i].done; saveLocal(); render(); return; }
  if (d.rmGroup) { S.list.splice(+d.rmGroup, 1); saveLocal(); render(); return; }
  if (d.edit && r) { openSuggest({ recipeId: r.id, kind: d.edit, current: d.text }); return; }
  if (d.sstatus) { S.sFilter.status = d.sstatus; render(); return; }
  if (d.resolve) { resolveSugg(d.id, d.resolve); return; }
  if (d.delSugg) { if (t.dataset.armed) { delDoc("suggestions", d.delSugg); } else { t.dataset.armed = 1; t.textContent = "Confirm delete"; setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = "Delete"; } }, 3000); } return; }
  if (d.delStory) { if (t.dataset.armed) { delDoc("stories", d.delStory); } else { t.dataset.armed = 1; t.textContent = "Confirm delete"; setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = "Delete"; } }, 3000); } return; }
  if (d.desk) { toggleDesk(d.desk); return; }
  if (d.close !== undefined) { t.closest("dialog").close(); return; }
  switch (d.act) {
    case "suggest": openSuggest({ recipeId: r?.id || "", kind: "fix" }); break;
    case "new-recipe": openSuggest({ kind: "new" }); break;
    case "suggest-kind": openSuggest({ recipeId: r?.id || "", kind: d.kind, current: d.kind === "fix" && d.text ? "" : "", why: d.text ? "Re: editor's note: " + d.text : "" }); break;
    case "suggest-for": openSuggest({ recipeId: d.id, kind: "fix", why: "Re: editor's note: " + d.text }); break;
    case "random": { const pool = filtered().length ? filtered() : RECIPES; location.hash = "r-" + pool[Math.floor(Math.random() * pool.length)].id; break; }
    case "clear": S.q = ""; $("#q").value = ""; S.cat = "All"; S.filter = "all"; saveLocal(); render(); break;
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
    case "export": exportCsv(); break;
  }
});
document.addEventListener("change", e => { if (e.target.id === "s-recipe") { S.sFilter.recipe = e.target.value; render(); } });

/* ---------------- suggest dialog ---------------- */
const dlg = $("#dlg-suggest"); let curKind = "fix";
$("#f-recipe").innerHTML = `<option value="">General / whole book</option>` + CATS.map(c => `<optgroup label="${esc(c)}">${RECIPES.filter(r => r.cat === c).map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</optgroup>`).join("");
$("#f-ncat").innerHTML = CATS.map(c => `<option>${esc(c)}</option>`).join("");
$("#f-kind").innerHTML = KINDS.map(k => `<button type="button" class="chip" data-kind-pick="${k.k}">${k.label}</button>`).join("");
$("#f-kind").addEventListener("click", e => { const b = e.target.closest("[data-kind-pick]"); if (b) setKind(b.dataset.kindPick); });
function setKind(k) {
  curKind = k;
  $$("#f-kind .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.kindPick === k));
  const isNew = k === "new", isMem = k === "memory", isIntro = k === "intro";
  $("#f-new").hidden = !isNew; $("#f-recipe-wrap").hidden = isNew;
  $("#f-was-wrap").hidden = isNew || isMem || isIntro;
  $("#f-why-wrap").hidden = isMem;
  $("#f-now-label").textContent = KIND[k].now;
  $("#f-now").classList.toggle("typed", !(isMem || isIntro || isNew));
  $("#sg-eyebrow").textContent = isMem ? "Share a memory" : isNew ? "Add a missing recipe" : "Suggest a change";
  $("#f-submit").textContent = S.dbState === "off" ? "Copy suggestion" : isMem ? "Share memory" : isNew ? "Send recipe" : "Send suggestion";
  $("#f-now").placeholder = isMem ? "e.g. Nannie made this every Christmas Eve, and we'd sneak the first slice" : isIntro ? "A sentence or two about this dish and who made it" : "";
}
function openSuggest({ recipeId = "", kind = "fix", current = "", why = "" }) {
  $("#sg-form").reset();
  $("#f-recipe").value = recipeId; $("#f-was").value = current || ""; $("#f-why").value = why || "";
  $("#f-name").value = store.get("name", "");
  $("#f-msg").textContent = ""; $("#f-offline").hidden = S.dbState !== "off";
  $("#f-scan-msg").textContent = "";
  setKind(kind);
  const r = BY[recipeId];
  $("#sg-title").textContent = kind === "new" ? "Add a missing recipe" : r ? r.name : "Help improve the book";
  dlg.showModal();
  setTimeout(() => (kind === "new" ? $("#f-nname") : $("#f-now")).focus(), 30);
}
/* ---------------- read a recipe from a photo ----------------
   The key is a browser key restricted to this site's address (set at deploy by build.sh), so it is
   public by design; without one the photo option stays hidden. */
const CONFIG = (() => { try { return JSON.parse(document.getElementById("config")?.textContent || "{}"); } catch { return {}; } })();
const SCAN_MODEL = "gemini-2.5-flash";
$("#f-scan").hidden = !CONFIG.geminiKey;
const blobB64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
async function readRecipePhotos(files) {
  const images = await Promise.all(files.map(async f => ({ inline_data: { mime_type: "image/jpeg", data: await blobB64(await shrink(f, 1600)) } })));
  const text = `These photos show one family recipe (a handwritten card, a printed page, or several pages of the same recipe). Transcribe it exactly as written.
- Keep the original wording, quantities and fractions (write ½, ¼, ⅓ etc. as the characters). Do not add, convert or guess amounts.
- One ingredient per line, one method step per line, in order. Drop numbering and bullets.
- If a word can't be read, write [illegible] in its place.
- "section" is the best fit among: ${CATS.join(", ")}.
- "notes" holds anything else on the card worth keeping (serving size, oven temperature, who it's from, tips). Empty if none.
- If the photos don't show a recipe at all, set "isRecipe" to false.`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${SCAN_MODEL}:generateContent`, {
    method: "POST",
    referrerPolicy: "no-referrer-when-downgrade", // send the full page address so the key's website restriction can match it
    headers: { "Content-Type": "application/json", "x-goog-api-key": CONFIG.geminiKey },
    body: JSON.stringify({
      contents: [{ parts: [...images, { text }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", required: ["isRecipe", "name", "section", "ingredients", "steps", "notes"], properties: {
          isRecipe: { type: "BOOLEAN" }, name: { type: "STRING" }, section: { type: "STRING", enum: CATS },
          ingredients: { type: "ARRAY", items: { type: "STRING" } }, steps: { type: "ARRAY", items: { type: "STRING" } }, notes: { type: "STRING" } } }
      }
    })
  });
  if (!res.ok) { const err = new Error("http"); err.status = res.status; throw err; }
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find(p => p.text);
  if (!part) throw new Error("empty");
  return JSON.parse(part.text);
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
    if (r.notes && !$("#f-now").value.trim()) $("#f-now").value = r.notes;
    msg.textContent = "Filled in from your photo. Check it over and fix anything it misread before sending.";
  } catch (err) {
    msg.className = "scan-msg err";
    msg.textContent = err.message === "norecipe" ? "Couldn't find a recipe in that photo. Try a closer, well-lit shot, or type it in below."
      : err.status === 429 ? "Too many photos read today. Try again tomorrow, or type the recipe in below."
      : err.status === 400 || err.status === 403 ? "Photo reading isn't working on this copy of the site. Type the recipe in below instead."
      : err.name === "TypeError" && !navigator.onLine ? "You're offline. Connect and try again."
      : "Couldn't read that photo. Try again, or type the recipe in below.";
  } finally { box.removeAttribute("aria-busy"); }
});
$("#f-recipe").addEventListener("change", e => { $("#sg-title").textContent = BY[e.target.value]?.name || "Help improve the book"; });
$("#sg-form").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#f-name").value.trim(); store.set("name", name);
  const doc = { kind: curKind, recipeId: curKind === "new" ? "" : $("#f-recipe").value, current: $("#f-was").value.trim(), proposed: $("#f-now").value.trim(), reason: $("#f-why").value.trim(), signedAs: name.slice(0, 60), status: "open", createdAt: Date.now() };
  if (curKind === "new") doc.newRecipe = { name: $("#f-nname").value.trim(), cat: $("#f-ncat").value, ingredients: $("#f-ning").value.trim(), steps: $("#f-nsteps").value.trim() };
  const msg = $("#f-msg");
  if (curKind === "new" ? !doc.newRecipe.name || (!doc.newRecipe.ingredients && !doc.newRecipe.steps) : !doc.proposed) { msg.textContent = curKind === "new" ? "Add the recipe's name and at least its ingredients or steps." : `Fill in “${KIND[curKind].now}” so we know what to change.`; return; }
  if (curKind === "memory" && !doc.recipeId) { msg.textContent = "Choose which recipe this memory belongs to."; return; }
  if (S.dbState !== "on") {
    const r = BY[doc.recipeId];
    const txt = [`Cookbook suggestion: ${KIND[curKind].label}`, curKind === "new" ? `New recipe: ${doc.newRecipe.name} (${doc.newRecipe.cat})\nIngredients:\n${doc.newRecipe.ingredients}\nSteps:\n${doc.newRecipe.steps}` : `Recipe: ${r ? r.name : "General"}`, doc.current && `Book says: ${doc.current}`, doc.proposed && `Should say: ${doc.proposed}`, doc.reason && `Why: ${doc.reason}`, name && `From: ${name}`].filter(Boolean).join("\n");
    if (await copy(txt)) dlg.close(); return;
  }
  doc.authorId = S.me.id || "";
  const btn = $("#f-submit"); btn.disabled = true;
  try {
    if (curKind === "memory") await db.collection("stories").add({ recipeId: doc.recipeId, text: doc.proposed, signedAs: doc.signedAs, authorId: doc.authorId, createdAt: doc.createdAt });
    else await db.collection("suggestions").add(doc);
    dlg.close(); toast(curKind === "memory" ? "Memory shared. Thank you!" : "Suggestion sent. Thank you!");
  } catch (err) {
    if (err?.code === "invalid_argument") { S.me.readOnly = true; msg.textContent = "You have view-only access, so this couldn't be saved. Ask the cookbook's owner to give you Contributor access, or copy your text and send it to them."; }
    else if (err?.code === "quota_exceeded") msg.textContent = "The suggestion box is full. Let the cookbook's owner know so they can clear out old suggestions.";
    else msg.textContent = "That didn't save. Check your connection and try again.";
  } finally { btn.disabled = false; }
});

/* ---------------- editor actions ---------------- */
let pendingResolve = null;
async function resolveSugg(id, status) {
  if (status === "open") { try { await db.doc("suggestions/" + id).update({ status: "open", resolution: "" }); toast("Reopened"); } catch { toast("Couldn't update. Try again."); } return; }
  pendingResolve = { id, status };
  $("#rs-title").textContent = status === "accepted" ? "Accept suggestion" : "Decline suggestion";
  $("#rs-go").textContent = status === "accepted" ? "Accept" : "Decline";
  $("#rs-note").value = ""; $("#dlg-resolve").showModal();
}
$("#rs-form").addEventListener("submit", async e => {
  e.preventDefault(); const p = pendingResolve; if (!p) return;
  try { await db.doc("suggestions/" + p.id).update({ status: p.status, resolution: $("#rs-note").value.trim(), resolvedAt: Date.now() }); $("#dlg-resolve").close(); toast(p.status === "accepted" ? "Accepted" : "Declined"); }
  catch { toast("Couldn't update. You may not have editor access."); }
});
async function delDoc(col, id) { try { await db.doc(col + "/" + id).delete(); toast("Deleted"); } catch { toast("Couldn't delete that."); } }
async function toggleDesk(k) {
  const next = { ...S.desk }; if (next[k]) delete next[k]; else next[k] = true;
  try { await db.doc("desk/status").set(next); } catch { toast("Couldn't save. You may not have editor access."); }
}
async function exportCsv() {
  const cols = ["status", "recipe", "kind", "book_says", "suggested", "why", "from", "date", "editor_note"];
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = S.sugg.map(s => [s.status, s.kind === "new" ? "NEW: " + (s.newRecipe?.name || "") : BY[s.recipeId]?.name || "General", KIND[s.kind]?.label || s.kind, s.current, s.kind === "new" ? `Ingredients:\n${s.newRecipe?.ingredients || ""}\n\nSteps:\n${s.newRecipe?.steps || ""}\n\n${s.proposed || ""}` : s.proposed, s.reason, who(s), s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : "", s.resolution].map(q).join(","));
  const csv = [cols.join(","), ...rows].join("\n");
  if (downloads) { try { await downloads.save({ filename: "chambers-cookbook-suggestions.csv", data: csv }); return; } catch (e) { if (e?.code === "declined" || e?.code === "cancelled") return; } }
  copy(csv);
}

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

/* ---------------- ask claude ---------------- */
let askR = null, askCtl = null, lastAnswer = "";
const recipeText = r => `${r.name} (${r.cat})${r.serves ? "\nServes: " + r.serves : ""}\n${r.intro}\nIngredients:\n${r.ing.map(i => i.g ? i.g + ":" : "- " + i.t).join("\n")}\nMethod:\n${r.steps.map(g => (g.h ? g.h + ":\n" : "") + g.items.map(t => "- " + t).join("\n")).join("\n")}`;
function openAsk(r) {
  askR = r; $("#ask-title").textContent = r.name; $("#ask-q").value = ""; $("#ask-a").textContent = ""; $("#ask-suggest").hidden = true;
  $("#ask-chips").innerHTML = ["Convert this to metric", "Can I make it ahead?", "What can I substitute?", "What goes well with it?", "Is anything missing or unclear?"].map(q => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  $("#dlg-ask").showModal();
}
$("#ask-chips").addEventListener("click", e => { const b = e.target.closest("[data-q]"); if (b) { $("#ask-q").value = b.dataset.q; ask(); } });
$("#ask-form").addEventListener("submit", e => { e.preventDefault(); ask(); });
$("#dlg-ask").addEventListener("close", () => askCtl?.abort());
async function ask() {
  const q = $("#ask-q").value.trim(); if (!q || !sample) return;
  askCtl?.abort(); askCtl = new AbortController();
  const out = $("#ask-a"); out.textContent = "Thinking…"; $("#ask-go").disabled = true; $("#ask-suggest").hidden = true;
  const prompt = `You are helping a family cook from their handed-down family cookbook. Answer the question about the recipe below in plain, warm, practical language. Keep it under 180 words. Use short lines or a simple list where it helps; no markdown headings, no bold. If the question reveals a likely error or gap in the written recipe, say so plainly.\n\nRECIPE\n${recipeText(askR)}\n\nQUESTION\n${q}`;
  try {
    const res = await sample(prompt, { signal: askCtl.signal, modelTier: "quick", onText: u => { out.textContent = u.text.replace(/\*\*/g, ""); } });
    lastAnswer = res.text.replace(/\*\*/g, ""); out.textContent = lastAnswer; $("#ask-suggest").hidden = false;
  } catch (err) {
    if (err?.name === "AbortError" || err?.code === "aborted") return;
    out.textContent = err?.code === "not_granted" ? "Claude isn't available in this view." : err?.code === "rate_limited" ? "Too many questions at once. Wait a minute and ask again." : "Claude couldn't answer just now. Try again in a moment.";
  } finally { $("#ask-go").disabled = false; }
}
$("#ask-suggest").addEventListener("click", () => { const r = askR, q = $("#ask-q").value; $("#dlg-ask").close(); openSuggest({ recipeId: r.id, kind: "other", why: `From asking Claude “${q}”:\n${lastAnswer}`.slice(0, 1500) }); });

/* ---------------- shared data ---------------- */
async function resolveNames() {
  if (!user) return;
  const ids = [...new Set([...S.sugg, ...S.stories].filter(o => !o.signedAs && o.authorId).map(o => o.authorId))].filter(id => !(id in S.names));
  if (!ids.length) return;
  try { const ps = await user.profiles(ids); ids.forEach(id => S.names[id] = ps[id]?.name || ""); render(); } catch {}
}
async function boot() {
  render();
  loadLocalPhotos();
  const use = n => (window.claude && typeof window.claude.use === "function") ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
  use("sample").then(s => { sample = s; if (route().v === "recipe") render(); });
  use("downloads").then(d => downloads = d);
  [db, user] = await Promise.all([use("db"), use("user")]);
  if (user) {
    try { S.me.id = await user.id(); S.me.canEdit = await user.canEdit(); const w = await user.can("data.write"); S.me.canWrite = w; if (w === false) S.me.readOnly = true; } catch {}
  }
  if (!db) { S.dbState = "off"; render(); return; }
  S.dbState = "on";
  const onErr = () => { S.dbState = "off"; render(); };
  db.collection("suggestions").orderBy("createdAt", "desc").limit(1000).onSnapshot(s => { S.sugg = s.docs.map(d => ({ id: d.id, ...d.data() })); resolveNames(); render(); }, onErr);
  db.collection("stories").orderBy("createdAt", "desc").limit(1000).onSnapshot(s => { S.stories = s.docs.map(d => ({ id: d.id, ...d.data() })); resolveNames(); render(); }, onErr);
  db.doc("desk/status").onSnapshot(d => { S.desk = d.exists ? { ...d.data() } : {}; render(); }, () => {});
}
boot();
})();
