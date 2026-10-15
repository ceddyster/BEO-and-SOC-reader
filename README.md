# BEO & SOC Charge Checker

A small, no-install browser tool that reads a **BEO** (Banquet/Event Order, PDF) and/or a
**SOC** (Statement of Charges, Word) for a Crown Events & Conferences Perth event and checks
that everything is **charged correctly** against the official **2026 menu price book**.

It answers three questions:

1. **Are the menu prices right?** Every per-person and package charge is matched to the
   price book and compared penny-for-penny — flagged `correct`, `undercharged`, or
   `overcharged`, with the per-person difference and the total impact across the guest count.
2. **Does the maths add up?** It recomputes `quantity × price` for every line and flags any
   line total that doesn't match.
3. **Do the BEO and SOC agree?** Load both and it reconciles them line by line, flagging any
   quantity, price, or total that differs between the two documents.

Operational charges with no menu price (audio-visual, security, room hire, attrition /
minimum spend) are listed separately as `non-menu` for manual confirmation.

Everything runs in your browser — the BEO and SOC are read locally and never uploaded.

## How to use it

Open **`index.html`** in any modern browser (Chrome, Edge, Firefox, Safari). Then:

1. Drag the **BEO PDF** onto the left box and/or the **SOC .docx** onto the right box.
2. Press **Check charges**.
3. Read the report: a summary banner, the line-by-line price check, the BEO-vs-SOC
   comparison (when both are loaded), and totals. **Copy summary** puts a plain-text version
   on your clipboard to paste into an email or note.

**Seeing a line on the actual BEO.** The BEO is rendered as **one continuous page** — all its
pages stacked into a single scrolling document — so nothing is split across page breaks. Press
**📄 View full BEO** to open it, or **click any line in the charge check** to open it scrolled to
that line with the menu heading and the `N guests @ $X` charge **highlighted**. So an
`unmatched`, `non-menu` or crew line takes one click to see in context on the real document (not
a text copy). Tick **Reviewed** on the viewer to check the line off (the row greys out and
strikes through). In a distribution, each BEO opens as its own continuous document (just its
pages). (If only a SOC is loaded — no BEO PDF to render — the line drops down a plain-text
excerpt instead.)

> The checker itself already reads the whole BEO as one continuous text, so page breaks never
> hide anything from the price check; the continuous viewer just makes it as easy for **you** to
> scroll to and point at any part.

You can check just one document or both. An internet connection is needed the first time so
the page can load the PDF and Word readers.

### BEO distributions (many BEOs in one PDF)

If you drop a **weekly BEO distribution** — a single PDF containing many BEOs back to back —
the tool detects it, **splits it into the individual BEOs** (on each `EVENT ORDER / BEO#: /
Page: 1 of N` boundary) and checks every one on **its own event date**. You get an overview up
top (how many BEOs, how many have charges to check) and a table of every BEO; click any row, or
expand a section below, for that BEO's full line-by-line check. **Copy summary** gives a
one-line-per-BEO rundown with the specific issues listed under each. A single BEO behaves exactly
as before.

### Worked example (the IGCC event)

For the Italian Golf Challenge Cup BEO/SOC, the tool confirms **Dinner Buffet Menu One** at
**$90pp** is correct, and flags **Crown Reserve Package – 6 Hours** charged at **$66pp** when
the 2026 book lists the 6-hour tier at **$70pp** — an undercharge of **$4pp (−$860 across 215
guests)**, noting that $66 is actually the *5-hour* price.

## Preview it live from GitHub (GitHub Pages)

To open the tool from a web link instead of a downloaded file, turn on GitHub Pages once:

1. Go to the repo on GitHub → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Set **Branch** to `claude/determined-pascal-0utbcf` and the folder to **`/ (root)`**, then **Save**.
4. Wait ~1 minute, then open:

   **https://ceddyster.github.io/BEO-and-SOC-reader/**

That's it — no build step. The root `index.html` is the tool.

> **Note on privacy:** this repository is private. On a free GitHub plan, a Pages
> site published from a private repo is **publicly viewable** (the tool and the menu
> price list would be reachable by anyone with the link). Your BEO/SOC files are never
> in the repo — they're read in the browser — but if the menu prices shouldn't be public,
> either keep Pages off (use the local `index.html`) or use GitHub Pro to set the Pages
> site to private.

## The price book

Prices come from the **E&C Menu 2026** PDFs in Google Drive (dinner, lunch, breakfast,
canapés, beverage packages, wine/beer/spirits, and more). They're stored in
[`src/prices.js`](src/prices.js). Food and most beverages are valid **01 Jul 2026 – 30 Jun
2027**; the Christmas buffet to **31 Dec 2026**.

**When a menu price changes:** edit the relevant entry in `src/prices.js`, bump
`CATALOGUE_META.updated`, and reload the page (or re-run the build for the shareable version).

## Project layout

```
index.html         The tool (open this). Loads src/prices.js + src/engine.js.
src/prices.js       The 2026 menu price catalogue — the source of truth.
src/engine.js       Parsing + price-check + reconciliation logic (no dependencies).
test/run-tests.js   Tests for the engine, incl. the real IGCC figures.
build.js            Bundles everything into dist/index.html (single shareable file).
dist/index.html     Generated single-file build (after `npm run build`).
```

## Developing

```bash
npm test     # run the engine tests (node test/run-tests.js)
npm run build  # regenerate dist/index.html
```

### What each BEO section is checked against

The tool reads the BEO's structure and checks each charge against the right price book:

- **Menu** section (food) → Dinner Buffet · Dinner Plated · Dinner Indian · Chinese Banquet ·
  Children's · Christmas Buffet · Lunch Buffet · Lunch Plated · Working Lunch · Lunchbox ·
  Breakfast Plated / Buffet / Continental / Standup · Coffee Breaks · Crew Packages ·
  Day Delegate · Canapés
- **Beverage** section (drinks) → Beverage Package · Cocktails · Beer & Cider ·
  Wine (Sparkling / White / Red / Dessert & Fortified) · Spirits · Non-Alcoholic

A line under the BEO's **Menu** header is matched against the food price books, and a line
under the **Beverage** header (or any "@ $X per bottle/glass" drink) against the beverage price
books. The report shows which menu each line was checked against.

**Beverage packages** are checked two ways: the **package + hours** must match a tier price
(e.g. Crown Reserve 4 Hour = $62), and the **drinks listed** under it are read to find
**add-ons**. The standard package is 1 sparkling + 1 white + 1 red + the package's beer set
("Corona OR Heineken" = one choice); beyond that, each **extra beer/cider** adds **$4.50pp** and
each **extra wine** adds **$10pp** (Crown Deluxe selection) or **$15pp** (WA Premium selection).
So a Crown Deluxe 2 Hour at $65 with a second wine and an extra beer should read $79.50pp — the
tool shows that breakdown and flags the line to confirm if the charge doesn't match.

Only **Crown Deluxe** and **WA Premium** wines can be added to a package. A **Reserve** wine, or
any wine that isn't one of the package's own selections, is **not** a valid add-on — the tool
flags the line "to check" and names the wine, rather than silently pricing it. Extras that appear
with no matching price increase are flagged the same way.

The **Soft Drink (Only) Package** is its own tier (1hr $16 → 5hr $24, +$2/hour), recognised as a
soft-drink package in its own right rather than mistaken for a Crown Reserve line. A 6-hour tier
at **$26** is included (continuing the pattern) even though the 2026 menu only prints up to 5
hours.

**Beverages on consumption** (drinks billed per bottle/glass) are simply matched to each item's
list price — no package maths.

**Composition checking.** Several menus are checked not just on price but on **how many dishes
were selected per course**. The tool reads the dishes listed under the menu line, classifies
each into its course using the menu's own dish names, and shows the counts (e.g. "cold 3/3,
hot 3/3, pasta 1/1, side 1/1, dessert 2/2"). If a course has **more** dishes than the menu
allows, the line is flagged *to check* — the price may be right, but the extra dishes should be
confirmed. A bare line with no dishes listed is simply price-checked. The menus with composition
rules are:

- **Dinner & Christmas buffets** — Menu One 3 cold / 3 hot / 1 pasta / 1 side / 2 dessert;
  Menu Two 4 / 4 / 1 / 1 / 3; Menu Three 5 / 4 / 1 / 2 / 3 (incl. the Christmas enhancements).
- **Lunch Buffet Menu Three** (the custom build) — 1 sandwich / 1 cold savoury / 1 salad /
  3 hot / 3 dessert. (Menu One and Two are fixed daily set menus with nothing to select, so
  they're priced but not composition-checked.)
- **Indian buffet** — Package One 2 entrée / 3 salad / 2 meat-fish / 2 veg / 1 paneer / 1 dahl /
  1 rice / 3 dessert / 2 naan; Package Two 3 / 4 / 3 / 3 / 1 / 1 / 1 / 3 / 2; Vegetarian 2 entrée /
  3 salad / 4 veg / 1 paneer / 1 dahl / 1 rice / 3 dessert / 2 naan.
- **Children's menu** — one main + one dessert per child ($30). Selecting two mains (or two
  desserts) is flagged to check.
- **Working Lunch** — Menu One 3 sandwiches + 1 salad; Menu Two and Menu Three 4 sandwiches.
  Picking more than allowed is flagged.
- **Lunchbox** ($48.50pp) — a function may offer a **maximum of two** of the four box menus.
  The tool recognises each box by its contents and flags a BEO that uses three or more.

**Plated lunch and dinner** are seated set menus, so they aren't dish-counted. Instead they're
priced as **base + surcharges**: the Two/Three-Course tier price, plus **+$10pp per alternating
course** and **+$18pp (lunch) / +$22pp (dinner) per additional course**, with the breakdown
shown on the line.

**Day Delegate packages** are **price-varies** in the menu, so the tool doesn't assert a price —
it matches the package, lists the inclusions (morning tea, lunch, afternoon tea, plenary room
hire, mints & water, lectern/mic, notepads & pens) and flags the line to **confirm against the
quote**, noting the 30-guest minimum when it isn't met. The optional **arrival coffee & tea**
add-on is price-checked at **$8pp**.

**Crew packages** are a flat per-person price list (hot breakfast, set menus, hot foods,
platters, crew buffet). Every line is price-checked against the book; there's no composition to
count because all crew items are *chef's selection*. The matcher also knows the menu's own
wording (e.g. "Chef's selection of 2 course" → Crew Set Menu Two Course).

**Security officers** are charged per officer-hour at a **day-of-week rate**: **Mon–Fri $63**,
**Saturday $75**, **Sunday $86** per hour. The tool reads the hours and rate from the BEO's
security line, works out the day from the **event date**, and flags any line that doesn't match
the right rate (e.g. a Saturday event billed at $63 → undercharged by $12/hour). If the event
date can't be read, the line is flagged to confirm. (Rates live in `securityRates` in
`src/prices.js`.)

**Christmas Buffet** is priced like the Dinner Buffet (Menu One $90 / Two $104 / Three $120,
min 50 guests) but is **seasonal** — valid only 01 Jul–31 Dec 2026. The tool reads the event
date from the BEO/SOC and flags a Christmas Buffet booked **after 31 Dec 2026** (and raises a
notice if the whole event falls outside the price book's dates). It also notes when a menu's
**guest minimum** isn't met.

**Coffee breaks** are checked by type:

- **Coffee Break One / Two / Three** — price ($30 / $37 / $55) plus the number of sweet/savoury
  items selected on the BEO (max **1 / 2 / 4**). More than allowed flags "to check".
- **Tea and Coffee** (its own section) — priced by service duration: **$22pp up to 4 hrs**,
  **$28pp over 4 and up to 8 hrs**, read from the time range on the BEO.
- **Barista Coffee Cart** — priced **per cart**: expected = number of carts × $495 (half day) or
  $640 (full day), so two half-day carts should read $990.

**Plated breakfast** is checked on price ($56 Menu One / $60 Menu Two) and on **how many items
were selected per category**. Menu One allows 1 from the bakery, 1 continental and 1 from the
pan; Menu Two allows **both** bakery items plus 1 continental and 1 from the pan. If a category
has more selections than the menu allows (e.g. two bakery items on Menu One), the line is flagged
"to check".

### How names are matched

The matcher is built for BEO wording, which differs from the price-book wording:

- **Filler words are ignored** — "Coffee Break **Menu** Two" matches the Breaks page's
  "Coffee Break Two" ($37), "Crown Reserve **Beverage Package** - 6 Hours" matches "Crown
  Reserve Package - 6 Hour", and so on. Words like *menu*, *package* and *selection* are
  dropped before matching.
- **Tier-aware** — a "6 Hour" package only matches the 6-hour price, and "Menu Two" never
  matches "Menu One".
- **Set / plated menus** carry alternating-service and additional-course surcharges, so they
  are validated against their base price plus those add-ons rather than flagged outright.
- **Package inclusions are shown** — when a line matches, the report prints what that package
  includes (e.g. "select two items from sweet or savoury") so you can confirm it's the right
  one. Day Delegate and other variable-price packages are flagged *to confirm* rather than
  priced.

If a document uses wording the matcher still doesn't recognise, the line is shown as
`unmatched` so it's never silently passed — add an alias in `src/prices.js` to teach it.
