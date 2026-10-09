# The Chambers Family Cookbook

An interactive website for the Chambers family recipe collection, dedicated to Nancy Chambers.

## What's in it

- 57 family recipes in 7 sections, searchable by name or ingredient
- Ingredient and step check-offs, ½×–3× batch scaling, favourites, a shopping list and a step-by-step cook mode
- A pencil on every ingredient and step for suggesting corrections, plus forms for memories, introductions and missing recipes
- A suggestions review queue (accept or decline, CSV export)
- An editor's desk listing manuscript issues to settle before printing

## Files

| Path | Purpose |
| --- | --- |
| `src/book.txt` | All recipe content in a simple line format (see below) |
| `src/head.html` | Title, fonts and styles |
| `src/body.html` | Page shell and dialogs |
| `src/app.js` | App logic |
| `build.sh` | Assembles `index.html` from `src/` |
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

## Shared features

Suggestions, memories, Ask Claude and CSV download use the claude.ai artifact runtime. The live version with those features is the Claude artifact. Opened anywhere else (for example GitHub Pages), the site still works for browsing and cooking, and the suggestion form offers "Copy suggestion" so it can be sent by email or text instead.
