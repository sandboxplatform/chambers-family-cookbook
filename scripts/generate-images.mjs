#!/usr/bin/env node
// Generates a photo-style AI image for each recipe in src/book.txt into images/ai/<recipe-id>.jpg.
// Existing images are kept, so re-running only fills gaps.
//
//   GEMINI_API_KEY=... node scripts/generate-images.mjs               all missing images (Google Gemini)
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs            same, with OpenAI
//   node scripts/generate-images.mjs --only=nannies-bread --force     redo one recipe
//   node scripts/generate-images.mjs --dry-run                        print prompts, no API calls
//
// Uses Gemini when GEMINI_API_KEY is set, otherwise OpenAI. Force one with IMAGE_PROVIDER=gemini|openai.
// Env: IMAGE_MODEL (default gemini-2.5-flash-image / gpt-image-1), IMAGE_QUALITY (OpenAI only: low|medium|high).
// If the optional "sharp" package is installed (npm i --no-save sharp), images are resized and saved as
// compact JPEGs; otherwise they're saved as the API returns them.
import { readFile, writeFile, mkdir, access, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "images", "ai");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const PROVIDER = process.env.IMAGE_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "openai");
const KEY = PROVIDER === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
const MODEL = process.env.IMAGE_MODEL || (PROVIDER === "gemini" ? "gemini-2.5-flash-image" : "gpt-image-1");
const sharp = await import("sharp").then(m => m.default, () => null);
const QUALITY = process.env.IMAGE_QUALITY || "medium";
const CONCURRENCY = 3;

// Same parsing and slug rules as src/app.js, so file names match recipe ids.
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function parseBook(txt) {
  const out = []; let cat = "", r = null;
  for (const raw of txt.split("\n")) {
    const l = raw.trim(); if (!l) continue;
    const body = l.replace(/^(-:|[#@^>\-=*.!])\s?/, "");
    if (l.startsWith("# ")) { cat = body; continue; }
    if (l.startsWith("@ ")) { r = { id: slug(body), name: body, cat, intro: "", ing: [] }; out.push(r); continue; }
    if (!r) continue;
    if (l.startsWith("> ")) r.intro = body;
    else if (l.startsWith("- ")) r.ing.push(body);
  }
  return out;
}

// Strip quantities and units so the prompt names foods, not measurements.
const UNITS = /^(?:[\d½⅓⅔¼¾⅛\/.\s–-]|to\b)+\s*(?:(?:heaping|level|large|small|medium|scant)\s+)?(?:(?:cups?|c\.|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|lbs?\.?|pounds?|oz\.?|ounces?|pkgs?\.?|packages?|cans?|tins?|jars?|pints?|quarts?|qts?\.?|g|kg|ml|l|cloves?|pinch|dash|sticks?|slices?|bunch(?:es)?|stalks?|heads?|envelopes?|strips?|inch(?:es)?|amount)(?![a-z]))?\.?\s*(?:of\s+)?/i;
const foodName = t => t.replace(UNITS, "").replace(/\(.*?\)/g, "").split(/[,;]/)[0].trim();

const SETTING = {
  "Appetizers": "arranged on a serving platter",
  "Salads": "in a wide serving bowl",
  "Soups & Chowders": "ladled into a deep bowl with a spoon beside it",
  "Main Courses": "plated as a home-cooked dinner",
  "Bread & Baking": "fresh from the oven on a cooling rack or bread board",
  "Desserts": "with a slice or portion served on a small plate",
  "Condiments": "in a glass preserving jar with a small spoon"
};
function prompt(r) {
  const foods = [...new Set(r.ing.map(foodName).filter(f => f && f.length < 40))].slice(0, 10);
  return [
    `A realistic, appetizing food photograph of homemade "${r.name}", from the "${r.cat}" section of a handed-down family recipe collection, ${SETTING[r.cat] || "served on a simple plate"}.`,
    foods.length ? `Made with ${foods.join(", ")}.` : "",
    r.intro ? `About the dish: ${r.intro.slice(0, 300)}` : "",
    "Rustic home kitchen, worn wooden table, everyday dishes, soft natural window light, shallow depth of field, three-quarter angle.",
    "Looks like a real home cook made it, not restaurant styling. No text, no labels, no people, no hands."
  ].filter(Boolean).join(" ");
}

const EXTS = ["jpg", "jpeg", "png", "webp"];
const hasImage = async id => { for (const x of EXTS) if (await access(join(OUT, `${id}.${x}`)).then(() => true, () => false)) return true; return false; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function request(text) {
  if (PROVIDER === "gemini") return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:2" } } })
  });
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, prompt: text, size: "1536x1024", quality: QUALITY, output_format: "jpeg", output_compression: 75, n: 1 })
  });
}
// Returns { data: Buffer, ext }.
function readImage(json) {
  if (PROVIDER === "gemini") {
    const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!part) throw new Error(`no image in response${json.candidates?.[0]?.finishReason ? ` (${json.candidates[0].finishReason})` : ""}`);
    return { data: Buffer.from(part.inlineData.data, "base64"), ext: part.inlineData.mimeType === "image/jpeg" ? "jpg" : (part.inlineData.mimeType || "image/png").split("/")[1] };
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image in response");
  return { data: Buffer.from(b64, "base64"), ext: "jpg" };
}
async function generate(text) {
  for (let attempt = 1; ; attempt++) {
    const res = await request(text);
    if (res.ok) {
      const img = readImage(await res.json());
      if (!sharp) return img;
      return { data: await sharp(img.data).resize({ width: 1536, height: 1024, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer(), ext: "jpg" };
    }
    const msg = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(2000 * 2 ** attempt); continue; }
    throw new Error(`HTTP ${res.status}: ${msg.slice(0, 300)}`);
  }
}

const recipes = parseBook(await readFile(join(ROOT, "src", "book.txt"), "utf8"))
  .filter(r => !args.only || String(args.only).split(",").includes(r.id));
if (!recipes.length) { console.error("No matching recipes."); process.exit(1); }

const todo = [];
for (const r of recipes) if (args.force || !(await hasImage(r.id))) todo.push(r);

if (args["dry-run"]) { for (const r of todo) console.log(`\n${r.id}.jpg\n  ${prompt(r)}`); console.log(`\n${todo.length} image(s) would be generated with ${PROVIDER} ${MODEL}.`); process.exit(0); }
if (!KEY) { console.error(`Set GEMINI_API_KEY or OPENAI_API_KEY first (or use --dry-run).`); process.exit(1); }
if (!todo.length) { console.log("Every recipe already has an image. Use --force to regenerate."); process.exit(0); }

await mkdir(OUT, { recursive: true });
console.log(`Generating ${todo.length} image(s) with ${PROVIDER} ${MODEL}${sharp ? "" : " (sharp not installed: saving images as returned)"}…`);
let done = 0, failed = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let r; (r = queue.shift());) {
    try {
      const img = await generate(prompt(r));
      for (const x of EXTS) if (x !== img.ext) await rm(join(OUT, `${r.id}.${x}`), { force: true });
      await writeFile(join(OUT, `${r.id}.${img.ext}`), img.data);
      console.log(`  ✓ ${r.id} (${++done}/${todo.length})`);
    } catch (e) { failed++; console.error(`  ✗ ${r.id}: ${e.message}`); }
  }
}));
console.log(`Done: ${done} generated, ${failed} failed.${failed ? " Re-run to retry the failures." : ""} Run ./build.sh to update index.html.`);
process.exit(failed && !done ? 1 : 0);
