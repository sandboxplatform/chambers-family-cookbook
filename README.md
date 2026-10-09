# The Chambers Family Cookbook

An interactive website for the Chambers family recipe collection, dedicated to Nancy Chambers.

## What's in it

- 56 family recipes in 7 sections, searchable by name or ingredient
- Ingredient and step check-offs, ½×–3× batch scaling, favourites, a shopping list and a step-by-step cook mode
- Anyone can edit: a pencil on the name, introduction, every ingredient, step and step heading, and a + to add ingredients, steps and sub-steps. Changes are saved straight into the book for everyone
- "Add a recipe", typed in or read from a photo of the card
- Family memories and comments on every recipe
- A page-turning book edition (`book.html`) with a photo-and-title spread for every recipe, which prints to PDF at 8 × 10 in
- A picture for every recipe: AI-generated stand-ins until the family adds real photos

## Files

| Path | Purpose |
| --- | --- |
| `src/book.txt` | All recipe content in a simple line format (see below) |
| `src/head.html` | Title, fonts and styles |
| `src/body.html` | Page shell and dialogs |
| `src/app.js` | App logic |
| `images/ai/` | AI-generated picture per recipe, `<recipe-id>.jpg` |
| `photos/` | Real family photos, `<recipe-id>.jpg`; these replace the AI picture |
| `scripts/generate-images.mjs` | Creates the AI pictures with Google Gemini (or OpenAI) |
| `build.sh` | Assembles `index.html` from `src/` (and lists the images) |
| `index.html` | The built, single-file site |
| `src/book.html` → `book.html` | The page-turning book (same recipes and pictures), printable at 8 × 10 in |

### Recipe format (`src/book.txt`)

```
# Section name
@ Recipe name
~ old-recipe-id   (added automatically when a recipe is renamed, so old links still work)
^ serves
> Introduction
-: Ingredient group heading
- Ingredient
= Step group heading
* Step
. Closing note
```

Edit the text file and run `./build.sh`, or just edit on the website.

## Pictures

**AI pictures.** Add a Google Gemini API key as a repository secret named `GEMINI_API_KEY` (Settings → Secrets and variables → Actions), or an OpenAI key as `OPENAI_API_KEY`, then run **Generate AI recipe images** from the Actions tab. It only creates pictures for recipes that don't have one, commits them and redeploys the site. To redo one, run it with the recipe id in "only" and "force" ticked. Locally: `GEMINI_API_KEY=... node scripts/generate-images.mjs` (`--dry-run` prints the prompts without calling the API).

**Real photos.** On any recipe, "Add a real photo" shows the photo on that device straight away and downloads it named `<recipe-id>.jpg`. Put that file in `photos/` (Add file → Upload files on GitHub) and it replaces the AI picture for everyone after the site redeploys.

## Editing on the website, memories and comments

The site runs in the browser, so anything that needs a secret or shared storage goes through a small relay (`relay/`, a Cloudflare Worker at https://cookbook-relay.chambers-cookbook.workers.dev):

- **Edits** (pencils, the + menu, "Add a recipe") are sent as small, specific changes. The relay applies each one to `src/book.txt` and commits it to GitHub with a message saying what changed and who made it, then the site redeploys. Visitors also get the latest book from the relay on load, so changes show straight away. Every change is in the repository history, so any edit can be reverted there. If two people change the same line at once, the second is told to check and try again.
- **Memories and comments** are stored by the relay (Cloudflare KV), per recipe. People can delete their own from the device they posted on.
- **Reading a recipe photo** sends it to Gemini, using a fixed model and prompt.

The relay only answers the cookbook site and limits each person to 10 of each a minute, with daily caps (`DAILY_LIMIT`, `DAILY_EDITS`, `DAILY_NOTES` in `relay/wrangler.toml`).

Secrets (set with `npx wrangler@4 secret put <NAME> --name cookbook-relay`; on Windows PowerShell use `npx.cmd`):
- `GEMINI_API_KEY`: Google AI Studio key for reading photos
- `GITHUB_TOKEN`: fine-grained GitHub token with Contents read/write on this repository only

Redeploy after editing `relay/`: `cd relay && npx wrangler@4 deploy`.

Ask Claude only works in the Claude artifact version of the cookbook.
