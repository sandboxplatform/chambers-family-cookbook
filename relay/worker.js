// POST { images: [base64 JPEG, ...], sections: [string, ...] } -> transcribed recipe JSON.
// Only the cookbook site may call it; the prompt and model are fixed here so the relay
// can't be used as a general-purpose Gemini proxy.
const MODEL = "gemini-2.5-flash";
const MAX_IMAGES = 4, MAX_IMAGE_B64 = 3_000_000;

const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
const cors = origin => origin ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" } : {};

function prompt(sections) {
  return `These photos show one family recipe (a handwritten card, a printed page, or several pages of the same recipe). Transcribe it exactly as written.
- Keep the original wording, quantities and fractions (write ½, ¼, ⅓ etc. as the characters). Do not add, convert or guess amounts.
- One ingredient per line, one method step per line, in order. Drop numbering and bullets.
- If a word can't be read, write [illegible] in its place.
- "section" is the best fit among: ${sections.join(", ")}.
- "notes" holds anything else on the card worth keeping (serving size, oven temperature, who it's from, tips). Empty if none.
- If the photos don't show a recipe at all, set "isRecipe" to false.`;
}

// Daily total across everyone, so a leaked or abused relay can't run up the bill.
async function underDailyLimit(env) {
  if (!env.COUNTS) return true;
  const key = "reads:" + new Date().toISOString().slice(0, 10);
  const n = +(await env.COUNTS.get(key)) || 0;
  if (n >= +(env.DAILY_LIMIT || 200)) return false;
  await env.COUNTS.put(key, String(n + 1), { expirationTtl: 60 * 60 * 48 });
  return true;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).includes(origin) ? origin : "";
    if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers: cors(allowed) });
    if (!allowed) return json({ error: "forbidden" }, 403);
    if (req.method !== "POST") return json({ error: "method" }, 405, allowed);

    const ip = req.headers.get("CF-Connecting-IP") || "unknown";
    if (env.PER_IP && !(await env.PER_IP.limit({ key: ip })).success) return json({ error: "rate_limited" }, 429, allowed);

    let body;
    try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400, allowed); }
    const images = Array.isArray(body.images) ? body.images : [];
    const sections = (Array.isArray(body.sections) ? body.sections : []).filter(s => typeof s === "string" && s.length < 40).slice(0, 12);
    if (!images.length || images.length > MAX_IMAGES || !sections.length || images.some(d => typeof d !== "string" || d.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(d)))
      return json({ error: "bad_request" }, 400, allowed);
    if (!(await underDailyLimit(env))) return json({ error: "daily_limit" }, 429, allowed);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [...images.map(data => ({ inline_data: { mime_type: "image/jpeg", data } })), { text: prompt(sections) }] }],
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
};
