#!/usr/bin/env node
// Generates a photo-style AI image for each recipe in src/book.txt into images/ai/<recipe-id>.jpg.
// Existing images are kept, so re-running only fills gaps.
//
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs            all missing images
//   node scripts/generate-images.mjs --only=nannies-bread --force     redo one recipe
//   node scripts/generate-images.mjs --dry-run                        print prompts, no API calls
//
// Env: IMAGE_MODEL (default gpt-image-1), IMAGE_QUALITY (low|medium|high, default medium).
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "images", "ai");
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const MODEL = process.env.IMAGE_MODEL || "gpt-image-1";
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

const exists = p => access(p).then(() => true, () => false);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generate(r, text) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: MODEL, prompt: text, size: "1536x1024", quality: QUALITY, output_format: "jpeg", output_compression: 75, n: 1 })
    });
    if (res.ok) {
      const b64 = (await res.json()).data?.[0]?.b64_json;
      if (!b64) throw new Error("no image in response");
      return Buffer.from(b64, "base64");
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
for (const r of recipes) if (args.force || !(await exists(join(OUT, r.id + ".jpg")))) todo.push(r);

if (args["dry-run"]) { for (const r of todo) console.log(`\n${r.id}.jpg\n  ${prompt(r)}`); console.log(`\n${todo.length} image(s) would be generated with ${MODEL} (${QUALITY}).`); process.exit(0); }
if (!process.env.OPENAI_API_KEY) { console.error("Set OPENAI_API_KEY first (or use --dry-run)."); process.exit(1); }
if (!todo.length) { console.log("Every recipe already has an image. Use --force to regenerate."); process.exit(0); }

await mkdir(OUT, { recursive: true });
console.log(`Generating ${todo.length} image(s) with ${MODEL} (${QUALITY})…`);
let done = 0, failed = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let r; (r = queue.shift());) {
    try { await writeFile(join(OUT, r.id + ".jpg"), await generate(r, prompt(r))); console.log(`  ✓ ${r.id} (${++done}/${todo.length})`); }
    catch (e) { failed++; console.error(`  ✗ ${r.id}: ${e.message}`); }
  }
}));
console.log(`Done: ${done} generated, ${failed} failed.${failed ? " Re-run to retry the failures." : ""} Run ./build.sh to update index.html.`);
process.exit(failed && !done ? 1 : 0);
