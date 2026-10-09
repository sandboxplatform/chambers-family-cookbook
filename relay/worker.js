// The cookbook site's private relay (Cloudflare Worker). It holds the secrets the browser can't:
//   POST /              read a recipe photo with Gemini                      (GEMINI_API_KEY)
//   GET  /book          the current src/book.txt from GitHub                 (GITHUB_TOKEN)
//   POST /edit          apply one edit to the book and commit it to GitHub
//   GET  /notes?ids=    family memories and comments for recipes             (NOTES KV)
//   POST /notes         add one;  POST /notes/delete  remove your own
// Only the cookbook site's origin may call it, with per-person and daily limits.
const MODEL = "gemini-3.8-flash";
const MAX_IMAGES = 4, MAX_IMAGE_B64 = 3_000_000;

const cors = origin => origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" } : {};
const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });

// Daily totals across everyone, so a leaked or abused relay can't run up a bill or flood the book.
async function underDailyLimit(env, what, limit) {
  if (!env.COUNTS) return true;
  const key = what + ":" + new Date().toISOString().slice(0, 10);
  const n = +(await env.COUNTS.get(key)) || 0;
  if (n >= limit) return false;
  await env.COUNTS.put(key, String(n + 1), { expirationTtl: 60 * 60 * 48 });
  return true;
}
const perIp = async (env, req, what) => !env.PER_IP || (await env.PER_IP.limit({ key: what + ":" + (req.headers.get("CF-Connecting-IP") || "unknown") })).success;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(origin) ? origin : "";
    if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers: cors(allowed) });
    if (!allowed) return json({ error: "forbidden" }, 403);
    const path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
    try {
      if (path === "/" && req.method === "POST") return await scan(req, env, allowed);
      if (path === "/book" && req.method === "GET") return json(await getBook(env, false), 200, allowed);
      if (path === "/edit" && req.method === "POST") return await edit(req, env, allowed);
      if (path === "/notes" && req.method === "GET") return await listNotes(req, env, allowed);
      if (path === "/notes" && req.method === "POST") return await addNote(req, env, allowed);
      if (path === "/notes/delete" && req.method === "POST") return await deleteNote(req, env, allowed);
      return json({ error: "not_found" }, 404, allowed);
    } catch (e) {
      console.log("error", path, e?.stack || e);
      return json({ error: e.code || "server" }, e.status || 500, allowed);
    }
  }
};
const fail = (code, status) => Object.assign(new Error(code), { code, status });

/* ---------------- recipe photos ---------------- */
function scanPrompt(sections) {
  return `These photos show one family recipe (a handwritten card, a printed page, or several pages of the same recipe). Transcribe it exactly as written.
- Keep the original wording, quantities and fractions (write ½, ¼, ⅓ etc. as the characters). Do not add, convert or guess amounts.
- One ingredient per line, one method step per line, in order. Drop numbering and bullets.
- If a word can't be read, write [illegible] in its place.
- "section" is the best fit among: ${sections.join(", ")}.
- "notes" holds anything else on the card worth keeping (serving size, oven temperature, who it's from, tips). Empty if none.
- If the photos don't show a recipe at all, set "isRecipe" to false.`;
}
async function scan(req, env, allowed) {
  if (!(await perIp(env, req, "scan"))) return json({ error: "rate_limited" }, 429, allowed);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400, allowed); }
  const images = Array.isArray(body.images) ? body.images : [];
  const sections = (Array.isArray(body.sections) ? body.sections : []).filter(s => typeof s === "string" && s.length < 40).slice(0, 12);
  if (!images.length || images.length > MAX_IMAGES || !sections.length || images.some(d => typeof d !== "string" || d.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(d)))
    return json({ error: "bad_request" }, 400, allowed);
  if (!(await underDailyLimit(env, "reads", +(env.DAILY_LIMIT || 200)))) return json({ error: "daily_limit" }, 429, allowed);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [...images.map(data => ({ inline_data: { mime_type: "image/jpeg", data } })), { text: scanPrompt(sections) }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", required: ["isRecipe", "name", "section", "ingredients", "steps", "notes"], properties: {
          isRecipe: { type: "BOOLEAN" }, name: { type: "STRING" }, section: { type: "STRING", enum: sections },
          ingredients: { type: "ARRAY", items: { type: "STRING" } }, steps: { type: "ARRAY", items: { type: "STRING" } }, notes: { type: "STRING" } } }
      }
    })
  });
  if (!res.ok) { console.log("gemini", res.status, (await res.text()).slice(0, 500)); return json({ error: res.status === 429 ? "rate_limited" : "upstream" }, res.status === 429 ? 429 : 502, allowed); }
  const text = (await res.json()).candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
  try { return json(JSON.parse(text), 200, allowed); } catch { return json({ error: "upstream" }, 502, allowed); }
}

/* ---------------- the book on GitHub ---------------- */
const b64decode = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), c => c.charCodeAt(0)));
const b64encode = s => { const bytes = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };
function gh(env, path, init = {}) {
  if (!env.GITHUB_TOKEN) throw fail("not_configured", 503);
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/${path}`, { ...init, headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "cookbook-relay", ...(init.body ? { "Content-Type": "application/json" } : {}) } });
}
let bookCache = null; // { at, sha, text } per isolate; the Cache API doesn't work on workers.dev
async function getBook(env, fresh) {
  if (!fresh && bookCache && Date.now() - bookCache.at < 15_000) return { sha: bookCache.sha, text: bookCache.text };
  const res = await gh(env, `contents/${env.BOOK_PATH}?ref=${env.BRANCH}`);
  if (!res.ok) { console.log("github get", res.status, (await res.text()).slice(0, 300)); throw fail("upstream", 502); }
  const j = await res.json();
  bookCache = { at: Date.now(), sha: j.sha, text: b64decode(j.content) };
  return { sha: j.sha, text: bookCache.text };
}

// Same rules as parseBook() in src/app.js, but keeping line numbers so edits land in the right place.
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const bodyOf = l => l.trim().replace(/^(-:|[#@^>\-=*.!~])\s?/, "");
function blocks(lines) {
  const out = [];
  let b = null;
  lines.forEach((raw, n) => {
    const l = raw.trim();
    if (l.startsWith("# ") || l.startsWith("@ ")) { if (b) b.end = n; b = null; }
    if (l.startsWith("@ ")) { b = { start: n, end: lines.length, name: bodyOf(l), aliases: [], aliasLines: [], ings: [], groups: [], steps: [], last: n }; out.push(b); return; }
    if (!b || !l) return;
    b.last = n;
    if (l.startsWith("~ ")) { b.aliases.push(bodyOf(l)); b.aliasLines.push(n); }
    else if (l.startsWith("^ ")) b.serves = n;
    else if (l.startsWith("> ")) b.intro = n;
    else if (l.startsWith("-:")) b.groups.push({ line: n, text: bodyOf(l) });
    else if (l.startsWith("- ")) b.ings.push({ line: n, text: bodyOf(l) });
    else if (l.startsWith("= ")) b.steps.push({ head: { line: n, text: bodyOf(l) }, items: [] });
    else if (l.startsWith("* ")) { if (!b.steps.length) b.steps.push({ head: null, items: [] }); b.steps.at(-1).items.push({ line: n, text: bodyOf(l) }); }
    else if (l.startsWith(". ")) b.outro = n;
  });
  return out;
}
const clean = (t, max = 600) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const need = (t, max) => { const c = clean(t, max); if (!c) throw fail("empty", 400); return c; };
const same = (a, b) => clean(a) === clean(b);
const ingBlockStart = b => Math.min(...[...b.groups, ...b.ings].map(x => x.line));
const headerEnd = b => Math.max(b.start, ...b.aliasLines, b.serves ?? -1, b.intro ?? -1); // last of @ ~ ^ > lines

// Applies one edit to the book text. Returns { text, recipeId, summary }.
function applyEdit(text, op) {
  const lines = text.split("\n");
  if (op.op === "add-recipe") return addRecipe(lines, op);
  const all = blocks(lines);
  const b = all.find(x => slug(x.name) === op.id || x.aliases.includes(op.id));
  if (!b) throw fail("recipe_missing", 404);
  const step = g => { const s = b.steps[+g]; if (!s) throw fail("changed", 409); return s; };
  const check = (got, expect) => { if (expect !== undefined && !same(got, expect)) throw fail("changed", 409); };
  let summary, recipeId = slug(b.name);
  switch (op.op) {
    case "set-name": {
      check(b.name, op.expect);
      const name = need(op.text, 100), oldId = slug(b.name), newId = slug(name);
      if (!newId) throw fail("empty", 400);
      if (newId !== oldId && all.some(x => x !== b && (slug(x.name) === newId || x.aliases.includes(newId)))) throw fail("name_taken", 409);
      lines[b.start] = "@ " + name;
      // keep the old id as an alias so links, pictures and saved favourites still find the recipe
      if (newId !== oldId && !b.aliases.includes(oldId)) lines.splice(b.start + 1, 0, "~ " + oldId);
      summary = `rename "${b.name}" to "${name}"`; recipeId = newId; break;
    }
    case "set-intro": {
      const old = b.intro !== undefined ? bodyOf(lines[b.intro]) : "";
      check(old, op.expect);
      const t = clean(op.text, 1500);
      if (b.intro !== undefined) { if (t) lines[b.intro] = "> " + t; else lines.splice(b.intro, 1); }
      else if (t) lines.splice(headerEnd(b) + 1, 0, "> " + t);
      summary = t ? "update the introduction" : "remove the introduction"; break;
    }
    case "edit-ing": case "delete-ing": {
      const ing = b.ings[+op.i]; if (!ing) throw fail("changed", 409);
      check(ing.text, op.expect);
      if (op.op === "delete-ing") { lines.splice(ing.line, 1); summary = `remove ingredient "${ing.text}"`; }
      else { const t = need(op.text); lines[ing.line] = "- " + t; summary = `change ingredient "${ing.text}" to "${t}"`; }
      break;
    }
    case "add-ing": {
      const t = need(op.text); let at;
      if (op.after === "top") at = b.groups.length || b.ings.length ? ingBlockStart(b) : headerEnd(b) + 1;
      else if (op.group !== undefined) { const g = b.groups[+op.group]; if (!g) throw fail("changed", 409); at = g.line + 1; }
      else { const ing = b.ings[+op.after]; if (!ing) throw fail("changed", 409); check(ing.text, op.expect); at = ing.line + 1; }
      lines.splice(at, 0, "- " + t); summary = `add ingredient "${t}"`; break;
    }
    case "edit-step": case "delete-step": {
      const it = step(op.g).items[+op.j]; if (!it) throw fail("changed", 409);
      check(it.text, op.expect);
      if (op.op === "delete-step") { lines.splice(it.line, 1); summary = `remove step "${it.text}"`; }
      else { const t = need(op.text, 1000); lines[it.line] = "* " + t; summary = `change step "${it.text.slice(0, 60)}"`; }
      break;
    }
    case "edit-heading": {
      const h = step(op.g).head; if (!h) throw fail("changed", 409);
      check(h.text, op.expect);
      const t = need(op.text, 120); lines[h.line] = "= " + t; summary = `rename step "${h.text}" to "${t}"`; break;
    }
    case "add-substep": {
      // a recipe with no method yet gets its first step
      const s = !b.steps.length && +op.g === 0 ? { head: null, items: [] } : step(op.g), t = need(op.text, 1000); let at;
      if (+op.after < 0) at = s.head ? s.head.line + 1 : (s.items[0]?.line ?? (b.outro ?? b.last + 1));
      else { const it = s.items[+op.after]; if (!it) throw fail("changed", 409); check(it.text, op.expect); at = it.line + 1; }
      lines.splice(at, 0, "* " + t); summary = `add a step: "${t.slice(0, 60)}"`; break;
    }
    case "add-step": {
      const head = need(op.heading, 120);
      const items = (Array.isArray(op.items) ? op.items : []).map(x => clean(x, 1000)).filter(Boolean).slice(0, 30);
      if (!items.length) throw fail("empty", 400);
      let at;
      if (+op.after < 0) { const s = b.steps[0]; at = s ? (s.head?.line ?? s.items[0].line) : (b.outro ?? b.last + 1); }
      else { const s = step(op.after); at = (s.items.at(-1)?.line ?? s.head.line) + 1; }
      lines.splice(at, 0, "= " + head, ...items.map(x => "* " + x)); summary = `add step "${head}"`; break;
    }
    default: throw fail("bad_request", 400);
  }
  return { text: lines.join("\n"), recipeId, summary: `${b.name}: ${summary}` };
}
function addRecipe(lines, op) {
  const name = need(op.name, 100), id = slug(name), section = clean(op.section, 60);
  if (!id) throw fail("empty", 400);
  if (blocks(lines).some(x => slug(x.name) === id || x.aliases.includes(id))) throw fail("name_taken", 409);
  const sec = lines.findIndex(l => l.trim() === "# " + section);
  if (sec < 0) throw fail("bad_request", 400);
  let end = lines.findIndex((l, n) => n > sec && l.trim().startsWith("# "));
  if (end < 0) end = lines.length;
  while (end > sec + 1 && !lines[end - 1].trim()) end--; // insert right after the section's last recipe
  const ing = (op.ingredients || []).map(x => clean(x)).filter(Boolean).slice(0, 80);
  const steps = (op.steps || []).map(x => clean(x, 1000)).filter(Boolean).slice(0, 80);
  if (!ing.length && !steps.length) throw fail("empty", 400);
  const intro = clean(op.intro, 1500), notes = clean(op.notes, 1500);
  const add = ["", "@ " + name, ...(intro ? ["> " + intro] : []), ...ing.map(x => "- " + x), ...steps.map(x => "* " + x), ...(notes ? [". " + notes] : [])];
  lines.splice(end, 0, ...add);
  return { text: lines.join("\n"), recipeId: id, summary: `Add recipe "${name}" to ${section}` };
}
async function edit(req, env, allowed) {
  if (!(await perIp(env, req, "edit"))) return json({ error: "rate_limited" }, 429, allowed);
  let op;
  try { op = await req.json(); } catch { return json({ error: "bad_request" }, 400, allowed); }
  if (!op || typeof op.op !== "string") return json({ error: "bad_request" }, 400, allowed);
  if (!(await underDailyLimit(env, "edits", +(env.DAILY_EDITS || 500)))) return json({ error: "daily_limit" }, 429, allowed);
  const by = clean(op.by, 60);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { sha, text } = await getBook(env, true);
    let r;
    try { r = applyEdit(text, op); }
    catch (e) { if (e.status) return json({ error: e.code, text }, e.status, allowed); throw e; }
    const res = await gh(env, `contents/${env.BOOK_PATH}`, { method: "PUT", body: JSON.stringify({ message: `${r.summary}\n\nEdited on the website${by ? ` by ${by}` : ""}.`, content: b64encode(r.text), sha, branch: env.BRANCH }) });
    if (res.ok) { bookCache = { at: Date.now(), sha: (await res.json()).content?.sha, text: r.text }; return json({ ok: true, text: r.text, recipeId: r.recipeId }, 200, allowed); }
    if (res.status !== 409 && res.status !== 422) { console.log("github put", res.status, (await res.text()).slice(0, 300)); return json({ error: "upstream" }, 502, allowed); }
    bookCache = null; // someone else saved first: re-read and re-apply
  }
  return json({ error: "busy" }, 503, allowed);
}

/* ---------------- memories and comments ---------------- */
const ID = /^[a-z0-9-]{1,100}$/;
const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
const publicNote = ({ keyHash, ...n }) => n;
async function listNotes(req, env, allowed) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter(id => ID.test(id)).slice(0, 10);
  const lists = await Promise.all(ids.map(id => env.NOTES.get("notes:" + id, "json")));
  const notes = lists.flatMap((l, n) => (l || []).map(x => ({ ...publicNote(x), recipeId: ids[n] }))).sort((a, b) => b.at - a.at);
  return json({ notes }, 200, allowed);
}
async function addNote(req, env, allowed) {
  if (!(await perIp(env, req, "note"))) return json({ error: "rate_limited" }, 429, allowed);
  let b;
  try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400, allowed); }
  const text = clean(b.text, 2000), by = clean(b.by, 60);
  if (!ID.test(b.recipeId || "") || !["memory", "comment"].includes(b.kind) || !text) return json({ error: "bad_request" }, 400, allowed);
  if (!(await underDailyLimit(env, "notes", +(env.DAILY_NOTES || 300)))) return json({ error: "daily_limit" }, 429, allowed);
  const key = crypto.randomUUID(), note = { id: crypto.randomUUID(), kind: b.kind, text, by, at: Date.now() };
  const k = "notes:" + b.recipeId, list = (await env.NOTES.get(k, "json")) || [];
  list.push({ ...note, keyHash: await sha256(key) });
  await env.NOTES.put(k, JSON.stringify(list.slice(-300)));
  return json({ note: { ...note, recipeId: b.recipeId }, key }, 200, allowed);
}
async function deleteNote(req, env, allowed) {
  let b;
  try { b = await req.json(); } catch { return json({ error: "bad_request" }, 400, allowed); }
  if (!ID.test(b.recipeId || "") || typeof b.id !== "string" || typeof b.key !== "string") return json({ error: "bad_request" }, 400, allowed);
  const k = "notes:" + b.recipeId, list = (await env.NOTES.get(k, "json")) || [], hash = await sha256(b.key);
  const i = list.findIndex(n => n.id === b.id && n.keyHash === hash);
  if (i < 0) return json({ error: "forbidden" }, 403, allowed);
  list.splice(i, 1);
  await env.NOTES.put(k, JSON.stringify(list));
  return json({ ok: true }, 200, allowed);
}
