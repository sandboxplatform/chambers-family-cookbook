# The Chambers Family Cookbook

An interactive website for the Chambers family recipe collection, dedicated to Nancy Chambers.

## What's in it

- 57 family recipes in 7 sections, searchable by name or ingredient
- Ingredient and step check-offs, ½×–3× batch scaling, favourites, a shopping list and a step-by-step cook mode
- A pencil on every ingredient and step for suggesting corrections, plus forms for memories, introductions and missing recipes
- A suggestions review queue (accept or decline, CSV export)
- An editor's desk listing manuscript issues to settle before printing
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

### Recipe format (`src/book.txt`)

```
# Section name
@ Recipe name
^ serves
> Introduction
-: Ingredient group heading
- Ingredient
= Step group heading
* Step
. Closing note
! Editor's note (manuscript issue)
```

Edit the text file, then run `./build.sh`.

## Pictures

**AI pictures.** Add a Google Gemini API key as a repository secret named `GEMINI_API_KEY` (Settings → Secrets and variables → Actions), or an OpenAI key as `OPENAI_API_KEY`, then run **Generate AI recipe images** from the Actions tab. It only creates pictures for recipes that don't have one, commits them and redeploys the site. To redo one, run it with the recipe id in "only" and "force" ticked. Locally: `GEMINI_API_KEY=... node scripts/generate-images.mjs` (`--dry-run` prints the prompts without calling the API).

**Real photos.** On any recipe, "Add a real photo" shows the photo on that device straight away and downloads it named `<recipe-id>.jpg`. Put that file in `photos/` (Add file → Upload files on GitHub) and it replaces the AI picture for everyone after the site redeploys.

## Shared features

Suggestions, memories, Ask Claude and CSV download use the claude.ai artifact runtime. The live version with those features is the Claude artifact. Opened anywhere else (for example GitHub Pages), the site still works for browsing and cooking, and the suggestion form offers "Copy suggestion" so it can be sent by email or text instead.
