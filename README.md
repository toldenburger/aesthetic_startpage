# aesthetic startpage — folders edition

A new tab page for Chromium-based browsers (made for [Helium](https://helium.computer/), works in Chrome, Chromium, Brave, …) built on top of **[Aesthetic Startpage](https://github.com/Nainish-Rai/Aesthetic-Startpage) by [Nainish Rai](https://github.com/Nainish-Rai)**. All the themes, gifs and the original look come from that project; this fork turns it into a browser extension with multiple pages you can edit in place.

## What's different from the original

- **Installs as the new tab page** (a small Manifest V3 extension) instead of a homepage URL.
- **Folders**: the card is a paper folder with a tab per page on its top edge. Click a tab to open that page; the open one sits in front, the others nestle behind it.
- **A theme per page**: the ☰ menu changes the theme of the page that's open. Each tab's label is drawn in its own page's colour.
- **Edit in place**, no HTML editing needed:
  - **＋** (bottom-right of the card): add a bookmark (name, url, page, section) or a new page (name, theme, image). Pick "+ new section…" to start a new section.
  - **✎**: edit mode. Click a link to rename, move or delete it; click a section heading to rename or delete it; click the open tab to rename, re-theme or delete that page.
  - **Toolbar button**: adds the site you're on to the page and section you choose.
  - **Backup**: export your pages to a JSON file, or import one.
- **Typeface**: set in [Libron](https://github.com/nicoverbruggen/libron) (bundled, no web font service), with all titles in its real small caps (no larger first letter).
- Fixed the "animated-gradient" theme, which threw an error in the original menu.

The original single-file page (`index.html`) and its README (`README.original.md`) are still here, untouched.

## Install

1. Clone the repo somewhere permanent:
   ```sh
   git clone https://github.com/toldenburger/aesthetic_startpage.git ~/.local/share/aesthetic_startpage
   ```
2. Load it as an unpacked extension: open `chrome://extensions`, switch on **Developer mode**, click **Load unpacked** and pick the folder.
3. Open a new tab. If the browser asks whether to keep the changed new tab page, choose **Keep**.

### Loading it from a flags file (Helium on Arch)

Instead of step 2 you can let the browser load it on every start. For `helium-browser-bin`, put this in `~/.config/helium-browser-flags.conf`:

```
--disable-features=DisableLoadExtensionCommandLineSwitch
--load-extension=/home//<you>/.local/share/aesthetic_startpage
```

The double slash in `/home//<you>` is deliberate: the `helium-browser` launcher script rewrites any literal `/home/<you>` in that file into `~`, which breaks the path. The flags only take effect after the browser has fully quit (including web-app windows) and restarted.

## Your pages

Pages and bookmarks are stored in the browser (`chrome.storage.local`). On first run they're seeded from:

1. `my_pages.json` if it exists. It is **git-ignored**, so your personal bookmarks never end up on GitHub. Use **＋ › backup › export** to save one.
2. otherwise `pages.default.json`, the example page that ships with the repo.

The format is simple enough to edit by hand:

```json
{
  "pages": [
    {
      "id": "start",
      "name": "start",
      "theme": "blue",
      "image": null,
      "sections": [
        { "title": "Daily", "links": [{ "name": "Github", "url": "https://github.com" }] }
      ]
    }
  ]
}
```

`theme` is one of the folder names in `main-themes/`. `image` is `null` (use the theme's own gif) or a path such as `./page_images/zines.gif`. To make your own gif selectable in the page editor, drop it into `page_images/` and add it to the `IMAGES` list in `store.js`.

A page fits about 20 links before the fixed-height card runs out of room.

## Files

| file | what it is |
| --- | --- |
| `manifest.json` | the extension: new tab override and toolbar button |
| `newtab.html`, `newtab.css`, `newtab.js` | the new tab page and its editor |
| `popup.html`, `popup.js` | the toolbar button's "add this page" form |
| `store.js` | page data storage, shared by both |
| `pages.default.json` | example pages for a fresh install |
| `page_images/` | extra gifs pages can use (copied from the original project's themes) |
| `fonts/` | the Libron web fonts, its license, and `libron.css` |
| `main-themes/`, `new-themes/`, `template-theme/`, `index.html` | the original project |

## Credits and license

Based on [Nainish-Rai/Aesthetic-Startpage](https://github.com/Nainish-Rai/Aesthetic-Startpage) and the people who contributed themes to it.

The typeface is [Libron](https://github.com/nicoverbruggen/libron) by Nico Verbruggen, licensed under the SIL Open Font License 1.1 (`fonts/libron/LICENSE`). Like the original, this project is licensed under the **GNU General Public License v3.0** (see `LICENSE`). Changes made in this fork are listed under "What's different" above.
