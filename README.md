# Neruson Creations

A monochrome digital gallery / sketchbook for Neruson Creations, plus a
built-in admin dashboard for adding and managing artwork without touching
any code.

## What's inside

```
index.html      the public site (home, works, collections, about, process, archive, contact)
admin.html      the content dashboard (/admin.html) — add, edit, delete, feature, hide, reorder
css/style.css   the site's design system (all monochrome tokens live at the top)
css/admin.css   dashboard styling
js/data.js      the data layer — all content, saved to the browser's localStorage
js/main.js      renders every section of the public site from js/data.js
js/admin.js     the dashboard's add/edit/delete logic
assets/works    placeholder artwork (replace these with your real drawings)
assets/refs     placeholder "reference photo" pairs for the process slider
```

## Running it

No build step needed — it's plain HTML/CSS/JS. Two options:

1. **Open directly**: double-click `index.html`. Works out of the box.
2. **Local server** (recommended, avoids any browser file:// quirks):
   ```
   cd neruson
   python3 -m http.server 8000
   ```
   then visit `http://localhost:8000`.

To publish it, upload the whole `neruson` folder to any static host
(Netlify, Vercel, GitHub Pages, your own server) — there's nothing to
compile.

## Managing your artwork

Open **`admin.html`** (or click "＋ Manage Artwork" in the bottom-left
corner of the public site). From there you can:

- **Upload artwork** — drag images onto the upload box, or click to browse.
  Each image becomes a new draft artwork you can fill in with a title,
  date, medium, category, collection, tags, reference type, and description.
- **Edit / delete / reorder** any piece, and toggle **Featured** (shows in
  "The Latest") or **Hidden** (keeps it off the public site without deleting it).
- **Collections** — create, rename, or remove groupings like Portraits, Self,
  People, Studies, Archive.
- **About** — edit the artist statement and choose the portrait image.
- **Site & Social** — artist name, tagline, hero artwork, footer phrase,
  and your Instagram / Facebook / email / other link.

Changes save instantly and the public site updates automatically — no
redeploy needed as long as you and your visitors are using the same
browser storage (see note below).

## Important note on where content lives

Right now all content is stored in the browser's **localStorage** — that
keeps this project entirely code-free to run, but it means:

- Content you add in the admin dashboard is saved **on your device, in
  that browser**. It won't automatically appear for other visitors unless
  you also update the live copy of the site.
- Use the **Export JSON** button (top of the dashboard) any time to
  download a full backup of your content. Use **Import JSON** to load it
  back in, or to move your content to another browser/device.

**To make uploads visible to every visitor**, the cleanest next step is to
connect a small backend: swap the methods inside `js/data.js`
(`NerusonStoreImpl`) for calls to a real database and image storage
(for example Supabase, Firebase, or a simple Node/Express API). The rest
of the site — `main.js`, `admin.js`, and every HTML template — was built
against that same store interface, so nothing else needs to change.

## Replacing the placeholder artwork

The drawings you see now are generated placeholders so the layout and
interactions can be judged with real image proportions. Replace them by
uploading your own drawings through the admin dashboard, or by swapping
the files in `assets/works` / `assets/refs` and updating the `image` /
`refImage` paths for the matching pieces in `js/data.js`.

## Design notes

- Palette is strictly black / off-white / warm gray — no color anywhere.
- Display type is Fraunces (editorial serif), body is Inter, and dates/
  tags/counters use Space Mono for that catalog-card feel.
- The custom cursor, film grain overlay, and page-load sequence are
  automatically disabled on touch devices for performance and usability.
- The "From Reference to Drawing" slider on the homepage is built from
  each artwork's `refImage` field — set one in the admin dashboard to
  feature that piece there.
