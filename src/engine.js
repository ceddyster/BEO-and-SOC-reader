/*
 * BEO & SOC charge checker — comparison engine.
 *
 * Pure, dependency-free logic so it can run both in the browser (via the UI)
 * and in Node (via the tests). It does three jobs:
 *   1. Turn a BEO (text extracted from the PDF) or a SOC (rows/text from the
 *      Word doc) into a list of charge line items.
 *   2. Price-check each line item against the menu catalogue (over/under).
 *   3. Reconcile a BEO against a SOC (do the two documents agree?).
 */
(function (root) {
  "use strict";

  // ---------------------------------------------------------------- helpers
  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  function parseMoney(s) {
    if (s === null || s === undefined) return null;
    var m = String(s).replace(/[,\s]/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  // Hours between the first "HH:MM - HH:MM" time range in a string (null if none).
  function hoursFromText(s) {
    var m = String(s || "").match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    var start = parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
    var end = parseInt(m[3], 10) + parseInt(m[4], 10) / 60;
    var h = end - start;
    if (h < 0) h += 24; // crosses midnight
    return round2(h);
  }

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function isoDate(y, mon, d) {
    if (y < 100) y += 2000;
    var dt = new Date(Date.UTC(y, mon, d));
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }
  // Pull the event date out of a BEO/SOC (ISO yyyy-mm-dd), or null.
  function parseEventDate(text) {
    var t = String(text || "");
    // "10 Oct 2026" / "Saturday, 10 October 2026"
    var m = t.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(20\d{2})\b/);
    if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] != null) return isoDate(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
    // "October 10, 2026"
    m = t.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(20\d{2})\b/);
    if (m && MONTHS[m[1].slice(0, 3).toLowerCase()] != null) return isoDate(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]);
    return null;
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[2] + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+p[1] - 1] + " " + p[0];
  }

  var WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Day of week for an ISO date (0 = Sunday .. 6 = Saturday), or null.
  function dayOfWeek(iso) {
    if (!iso) return null;
    var p = iso.split("-");
    if (p.length !== 3) return null;
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return isNaN(d.getTime()) ? null : d.getUTCDay();
  }

  var NUM_WORDS = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
    seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12" };

  // Loose normalisation for matching names. Number words -> digits,
  // "hours" -> "hour", punctuation dropped, whitespace collapsed.
  function normalize(s) {
    s = String(s === null || s === undefined ? "" : s).toLowerCase();
    s = s.replace(/['’]/g, "");   // collapse possessives: "chef's" -> "chefs"
    s = s.replace(/&/g, " and ");
    s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g,
      function (w) { return NUM_WORDS[w]; });
    s = s.replace(/\bhrs?\b/g, "hour").replace(/\bhours\b/g, "hour");
    s = s.replace(/\bpax\b/g, "").replace(/\bper person\b/g, "").replace(/\bpp\b/g, "");
    // Drop filler words BEOs insert that carry no identity, so e.g.
    // "Coffee Break Menu Two" matches the price-book "Coffee Break Two".
    s = s.replace(/\b(menu|package|pkg|option|selection|daily|of|the)\b/g, " ");
    s = s.replace(/[^a-z0-9 ]+/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }

  // Softer normalisation that KEEPS money/@ so charge phrases survive.
  function softNorm(s) {
    s = String(s === null || s === undefined ? "" : s).toLowerCase();
    s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g,
      function (w) { return NUM_WORDS[w]; });
    s = s.replace(/\bhours\b/g, "hour");
    s = s.replace(/[^a-z0-9 $.,@%&/():+-]+/g, " ");
    return s.replace(/[ \t]+/g, " ").trim();
  }

  function numMultiset(norm) {
    return (String(norm).match(/\d+/g) || []).slice().sort().join(",");
  }

  // ------------------------------------------------------------ name matching
  // Score how well a document item name matches a catalogue name: coverage of
  // the catalogue name's tokens, gated by matching numbers (so "6 hour" never
  // matches "5 hour", and "menu two" never matches "menu one").
  function scoreNames(docName, catName) {
    var d = normalize(docName), c = normalize(catName);
    if (!c) return 0;
    if (d === c) return 1; // exact full-name match always wins
    if (numMultiset(d) !== numMultiset(c)) return 0;
    var docTokens = {};
    var dList = d.split(" ").filter(Boolean);
    dList.forEach(function (t) { docTokens[t] = true; });
    var cTokens = c.split(" ").filter(Boolean);
    if (!dList.length || !cTokens.length) return 0;
    var hit = 0;
    cTokens.forEach(function (t) { if (docTokens[t]) hit++; });
    // F1 of precision (over doc tokens) and recall (over catalogue tokens), so a
    // short generic name can't fully "cover" a longer, more specific document name.
    var recall = hit / cTokens.length;
    var precision = hit / dList.length;
    if (hit === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
  }

  function buildMatchNames(item) {
    var names = [item.name];
    if (item.aliases) names = names.concat(item.aliases);
    return names;
  }

  // Return { item, score } for the best catalogue match, or null.
  // When `group` ("food"|"beverage") is given, a match in that group is
  // preferred — a BEO Menu item is checked against the food price books and a
  // Beverage item against the beverage price books — falling back to the overall
  // best only if nothing in the group clears the threshold.
  function findMatch(name, catalogue, threshold, group) {
    threshold = threshold === undefined ? 0.7 : threshold;
    var nn = normalize(name);
    var best = null, bestInGroup = null;
    (catalogue.items || []).forEach(function (item) {
      // Some items (e.g. children's meals) must not match unless the document
      // text actually carries an identifying word — stops a generic "Main Course"
      // heading matching "Children's Main Course".
      if (item.mustInclude && !item.mustInclude.some(function (t) {
        return (" " + nn + " ").indexOf(" " + normalize(t) + " ") !== -1;
      })) return;
      var sc = 0;
      buildMatchNames(item).forEach(function (candidate) {
        var s = scoreNames(name, candidate);
        if (s > sc) sc = s;
      });
      if (!best || sc > best.score) best = { item: item, score: sc };
      if (group && item.group === group && (!bestInGroup || sc > bestInGroup.score)) {
        bestInGroup = { item: item, score: sc };
      }
    });
    if (group && bestInGroup && bestInGroup.score >= threshold) return bestInGroup;
    if (best && best.score >= threshold) return best;
    return null;
  }

  function looksNonMenu(name, catalogue) {
    var n = normalize(name);
    return (catalogue.nonMenuHints || []).some(function (h) {
      return n.indexOf(normalize(h)) !== -1;
    });
  }

  // ------------------------------------------------------------- SOC parsing
  // Primary path: rows from the Word table, each an array of cell strings
  // [Qty, Name, Price, Discounts, Total]. Section headers / blank rows skipped.
  function parseSocRows(rows) {
    var items = [];
    var section = "";
    (rows || []).forEach(function (cells) {
      var clean = cells.map(function (c) { return String(c == null ? "" : c).trim(); });
      var nonEmpty = clean.filter(Boolean);
      if (!nonEmpty.length) return;

      // A data row starts with an integer quantity and carries a $ amount.
      var qty = clean[0] && /^\d+$/.test(clean[0]) ? parseInt(clean[0], 10) : null;
      var moneyCells = clean.filter(function (c) { return /\$\s*[\d,]/.test(c); });

      if (qty === null || moneyCells.length === 0) {
        // Treat a single-cell text row as a section header (e.g. "Food & Beverage").
        if (nonEmpty.length <= 2 && !moneyCells.length) section = nonEmpty.join(" ");
        return;
      }

      var name = clean[1] || "";
      var unitPrice = parseMoney(moneyCells[0]);
      var lineTotal = parseMoney(moneyCells[moneyCells.length - 1]);
      // If only one money cell is present, treat it as the line total.
      if (moneyCells.length === 1) { lineTotal = unitPrice; unitPrice = round2(lineTotal / qty); }

      items.push({ qty: qty, name: name, unitPrice: unitPrice, lineTotal: lineTotal,
        section: section, source: "SOC" });
    });
    return items;
  }

  // Fallback: group the SOC's plain text into (qty, name, price, total) blocks.
  function parseSocText(text) {
    var lines = String(text || "").split(/\r?\n/).map(function (l) { return l.trim(); })
      .filter(function (l) { return l.length; });
    var items = [], i = 0;
    while (i < lines.length) {
      if (/^\d+$/.test(lines[i])) {
        var qty = parseInt(lines[i], 10);
        var name = lines[i + 1] || "";
        var monies = [];
        var j = i + 2;
        while (j < lines.length && monies.length < 3 && /\$\s*[\d,]/.test(lines[j])) {
          monies.push(parseMoney(lines[j])); j++;
        }
        if (name && monies.length) {
          var unitPrice = monies[0];
          var lineTotal = monies[monies.length - 1];
          if (monies.length === 1) { lineTotal = unitPrice; unitPrice = round2(lineTotal / qty); }
          items.push({ qty: qty, name: name, unitPrice: unitPrice, lineTotal: lineTotal, source: "SOC" });
          i = j; continue;
        }
      }
      i++;
    }
    return items;
  }

  // ------------------------------------------------------------- BEO parsing
  // The BEO is prose. For each "N guests @ $X per person" charge, look back over
  // the preceding heading lines and pick the best catalogue match — so the BEO's
  // own wording ("Coffee Break Menu Two", "Dinner Set Menu Two") maps to the
  // right price-book page even when it differs from the catalogue name.
  function parseBeo(text, catalogue) {
    var lines = String(text || "").split(/\r?\n/);
    var soft = softNorm(text);
    var items = [];

    function pushUnique(it) {
      var dup = items.some(function (x) {
        return x.name === it.name && x.unitPrice === it.unitPrice && x.qty === it.qty &&
          x.kind === it.kind && (x.anchor || null) === (it.anchor || null);
      });
      if (!dup) items.push(it);
    }

    // The original BEO lines behind an item, so the UI can show the exact
    // section to eyeball. Trimmed, blanks dropped, capped to ~16 lines.
    function excerpt(from, to) {
      from = Math.max(0, from); to = Math.min(lines.length - 1, to);
      if (to < from) return "";
      if (to - from > 16) from = to - 16;
      return lines.slice(from, to + 1).map(function (s) { return s.replace(/\s+/g, " ").trim(); })
        .filter(Boolean).join("\n");
    }
    function lineIndexOf(re, startAfter) {
      for (var k = (startAfter || 0); k < lines.length; k++) if (re.test(lines[k])) return k;
      return -1;
    }
    // The item's own block: its heading line plus the dozen lines beneath it
    // (dishes / inclusions), then the "N guests @ $X" charge line — so a BEO
    // whose charge is page-split from its heading still shows the right section
    // without the interleaved program/setup columns in between.
    function excerptBlock(headIdx, chargeIdx) {
      headIdx = Math.max(0, headIdx);
      var end = Math.min(headIdx + 14, chargeIdx);
      var arr = lines.slice(headIdx, end).map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean);
      var charge = (lines[chargeIdx] || "").replace(/\s+/g, " ").trim();
      if (charge && arr.indexOf(charge) === -1) arr.push(charge);
      return arr.join("\n");
    }

    // Which BEO section a line sits in: the nearest "Menu" (food) or "Beverage"
    // (beverage) header above it. Other section headers are ignored, so the
    // two-column reading order doesn't flip it early.
    function sectionGroupBefore(idx) {
      for (var j = idx - 1; j >= 0; j--) {
        var l = lines[j].trim();
        if (/^beverages?$/i.test(l) || /beverages?\s+on\s+consumption/i.test(l)) return "beverage";
        if (/^menu$/i.test(l)) return "food";
      }
      return null;
    }

    var re, m;

    // Course-section labels and structural headers are never package names.
    var SECTION_RE = /^(entr[eé]{1,2}e?|main course|mains|entrees?|desserts?|dessert platters|sides?|cold canap\w*|hot canap\w*|canap\w*|cold dishes|hot dishes|pasta|salads?|soup|from the (bakery|pan)|continental selection|sandwich|menu|beverages?|program|setup|dietary requirements?|miscellaneous|technical requirement|health and safety|billing instructions|room set up|linen|table items)\b/i;

    // Per-person food/beverage: "215 guests @ $90.00 per person"
    // Also accepts "N children @ $30.00 per child" for the children's menu.
    lines.forEach(function (line, i) {
      var pm = softNorm(line).match(/(\d+)\s+(?:guests?|children|child|kids?|pax|people)\s*@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+(?:person|child|guest|head)/);
      if (!pm) return;
      var qty = parseInt(pm[1], 10);
      var price = parseMoney(pm[2]);

      // Each "N guests @ $X per person" charge delimits its own block. The
      // heading, time anchor and context for THIS charge must come from below
      // the PREVIOUS per-person charge line — never from a prior charge's block,
      // or a charge whose own heading doesn't match the menu would reach back and
      // steal the heading from the charge above it (two charges, one title).
      var blockStart = 0;
      for (var bs = i - 1; bs >= 0; bs--) {
        if (/(\d+)\s+(?:guests?|children|child|kids?|pax|people)\s*@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+(?:person|child|guest|head)/.test(softNorm(lines[bs]))) {
          blockStart = bs + 1; break;
        }
      }
      var floorA = Math.max(0, i - 40, blockStart);
      var floorW = Math.max(0, i - 90, blockStart);
      var winArr = lines.slice(floorA, i);
      var win = winArr.join("  ");
      var wideWin = lines.slice(floorW, i).join("  "); // page-split context (within this block)
      var grp = sectionGroupBefore(i); // food / beverage / null

      // Match among the heading lines above the price. BEOs are two-column, so
      // reading order can interleave unrelated right-column lines (e.g. a setup
      // note "...for Catering Break 1") between a heading and its price — hence a
      // wide window, and a preference for the NEAREST strong match so a weak
      // nearby line can't beat the real heading further up.
      var best = null, strong = null, strongPkg = null;
      for (var j = i - 1; j >= floorW; j--) {
        var cand = lines[j].replace(/\s+/g, " ").trim();
        if (cand.length < 3) continue;
        if (/[@$]/.test(cand)) continue;              // charge lines
        if (/^\d+\s+guests?\b/i.test(cand)) continue; // "N guests ..."
        if (/^\d{3,4}\b/.test(cand)) continue;        // program times (1905 ...)
        var mm = findMatch(cand, catalogue, undefined, grp);
        // Skip course dividers / section labels ("SANDWICH", "MENU", "Beverage",
        // "MAIN COURSE") — UNLESS the line is itself a strong menu-item name. A
        // real heading like "Sandwich Buffet Menu One" starts with a section word
        // but IS the item, so it must not be discarded as a divider.
        if ((!mm || mm.score < 0.85) && SECTION_RE.test(cand)) continue;
        // A "per person" charge names a package, a per-head menu, or a shared
        // platter — never an INDIVIDUAL drink (wine by the bottle, spirit by the
        // glass, beer or cocktail priced "each"). Reject only those: a crew
        // platter is priced per platter ("each") yet the BEO bills it per person,
        // so food "each"/"flat" items (platters, individual coffee) stay eligible.
        if (mm) {
          var u = (mm.item.unit || ""), g = mm.item.group;
          if (/^(bottle|glass)$/.test(u) || (u === "each" && g === "beverage")) mm = null;
        }
        // Stay in the charge's own section: a Beverage charge must not borrow a
        // food heading (or vice versa), so a line like "Crown Reserve Package -
        // 6.5 Hours" that has no exact tier can't bleed up to a crew meal.
        if (mm && grp && mm.item.group && mm.item.group !== grp) mm = null;
        if (!mm) continue;
        if (!best || mm.score > best.score) best = { score: mm.score, name: cand, j: j };
        if (mm.score >= 0.85) {
          if (!strong) strong = { score: mm.score, name: cand, j: j }; // closest strong (any)
          // Closest strong per-person PACKAGE. A buffet/package heading ("Dinner
          // Buffet Menu Three", pp) must win over a nearer composition dish that
          // happens to match a priced platter (e.g. a cheese/fruit platter line),
          // so the charge is checked against the package, not a dish within it.
          if (!strongPkg && /^(pp|child)/.test(mm.item.unit || "")) {
            strongPkg = { score: mm.score, name: cand, j: j };
          }
        }
      }
      // Prefer the nearest package heading; fall back to the nearest strong line
      // (a standalone platter with no package above it), then to the best overall.
      best = strongPkg || strong || best;

      // Nearest line above the charge that marks a minimum-spend / on-consumption
      // placeholder (e.g. "Soft drinks on consumption (Min)"). These aren't fixed
      // menu items; if this signal sits closer to the charge than any matched
      // heading, the charge is that placeholder, not the distant package.
      var minSpendJ = null;
      for (var ms = i - 1; ms >= floorW && minSpendJ === null; ms--) {
        if (/on\s+consumption|minimum[^.]{0,80}spend/i.test(lines[ms])) minSpendJ = ms;
      }
      var isMinSpend = minSpendJ !== null && (!best || minSpendJ > best.j);

      // Cocktail receptions are priced by number of canapés, not by name/hours.
      // Require a proper "N canapés served / per person" phrase on one line so a
      // stray "...Break 1  Canapes to be preset" can't fake a count.
      var canapCount = null;
      for (var w = 0; w < winArr.length; w++) {
        var cmx = winArr[w].match(/\b(\d+)\s+canap[eé]s?\b/i);
        if (cmx && /\b(served|per person|per guest|per head|pp)\b/i.test(winArr[w])) canapCount = cmx[1];
      }

      // A standalone "Tea and Coffee" section, priced by service duration.
      // (Excludes the "freshly brewed coffee and selection of teas" inclusion line.)
      var teaCoffee = winArr.some(function (l) {
        var t = l.replace(/\s+/g, " ").trim();
        return /\btea\s*(?:&|and)\s*coffee\b/i.test(t) && !/freshly brewed/i.test(t) && t.length < 60;
      });

      // Crew platters can be a multi-item selection sharing ONE per-person
      // charge — e.g. "Chef's selection of sandwiches" + "Sliced seasonal fresh
      // fruit" billed together at "$28.00 per person". The menu prices each
      // platter separately, so gather every platter line in this charge's block
      // (back to the block's time anchor / previous charge) and, when more than
      // one is chosen, check the charge against the SUM of the selected platters.
      var platters = [];
      if (grp === "food") {
        for (var pj = i - 1; pj >= floorA; pj--) {
          var pcand = lines[pj].replace(/\s+/g, " ").trim();
          if (!pcand) continue;
          if (/[@$]/.test(pcand)) break;                                   // previous charge line
          if (/^\d+\s+(?:guests?|children|child|kids?|pax|people)\b/i.test(pcand)) break;
          if (/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/.test(pcand)) break;   // time range = block start
          if (SECTION_RE.test(pcand)) break;
          var pmm = findMatch(pcand, catalogue, 0.85, "food");
          if (pmm && pmm.item.category === "Crew Packages" && pmm.item.unit === "each") {
            platters.unshift({ name: pcand, item: pmm.item, j: pj });
          }
        }
      }

      var altCourses = 0, kind = "per-person", nameOut, itemGroup = grp, serviceHours, bpm;
      if (platters.length >= 2) {
        // Multi-item platter selection — priced as the sum of the chosen platters.
        nameOut = platters.map(function (p) { return p.name; }).join(" + ");
        kind = "platter-selection";
        itemGroup = "food";
      } else if (canapCount) {
        nameOut = "Cocktail Reception " + canapCount + " Canapes";
        itemGroup = "food"; // canapés are a food (Canapés menu) even at a drinks reception
      } else if (isMinSpend) {
        // A per-person minimum-spend / on-consumption placeholder — not a fixed
        // menu item; confirm manually (don't price it against a distant package).
        nameOut = /soft\s*drink/i.test(wideWin) ? "Soft drink minimum spend (per person)" : "Minimum spend (per person)";
        kind = "non-menu";
        itemGroup = "beverage";
      } else if (best) {
        nameOut = best.name;
        for (var k = best.j; k < i; k++) if (/alternating with/i.test(lines[k])) altCourses++;
      } else if (teaCoffee) {
        nameOut = "Tea and Coffee";
        kind = "tea-coffee";
        itemGroup = "food";
        // Duration from the time range on (or nearest to) the Tea and Coffee line.
        for (var tw = winArr.length - 1; tw >= 0 && serviceHours == null; tw--) {
          if (/tea\s*(?:&|and)\s*coffee/i.test(winArr[tw])) serviceHours = hoursFromText(winArr[tw]);
        }
        if (serviceHours == null) {
          for (var tw2 = winArr.length - 1; tw2 >= 0 && serviceHours == null; tw2--) serviceHours = hoursFromText(winArr[tw2]);
        }
      } else if (/\bcustom\b/i.test(win)) {
        var cm = win.match(/custom[\w' ]*?(?:set menu|dinner|lunch|reception|menu|package)/i);
        nameOut = cm ? cm[0].replace(/\s+/g, " ").trim() : "Custom package";
        kind = "custom";
        itemGroup = null;
      } else if ((bpm = win.match(/(crown reserve|crown deluxe|wa premium|soft drink(?:\s*only)?)\s*(?:beverage\s*)?package\s*[-–—]?\s*([\d.]+)\s*hours?/i))) {
        // A beverage package whose duration isn't a standard whole-hour tier
        // (e.g. "Crown Reserve Package - 6.5 Hours") — recognised as that
        // package, flagged to confirm rather than mis-priced or left unknown.
        nameOut = bpm[1].replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + " Package - " + bpm[2] + " Hours";
        kind = "bev-nonstandard";
        itemGroup = "beverage";
      } else {
        nameOut = "(unidentified per-person item)";
      }

      // Keep the lines beneath the heading so compositions can be checked
      // (beverage-package add-ons, plated-breakfast selections, etc.).
      var contextLines;
      if (best) {
        contextLines = lines.slice(best.j + 1, i).map(function (s) { return s.trim(); }).filter(Boolean);
      }

      // Nearest time range above the charge (e.g. "09:30 - 10:00"), so the same
      // package served at two different times (morning tea vs afternoon tea) is
      // counted as two charges rather than collapsed into one.
      var anchor = null;
      for (var a = i - 1; a >= Math.max(0, i - 60, blockStart) && anchor === null; a--) {
        var tm = lines[a].match(/\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/);
        if (tm) anchor = tm[0];
      }

      // Lunch vs dinner, from an explicit word near the heading, else the
      // service start time (used to pick the crew set-menu lunch/dinner rate).
      var mealTime = null;
      if (/\bdinner\b/i.test(win) && !/\blunch\b/i.test(win)) mealTime = "dinner";
      else if (/\blunch\b/i.test(win) && !/\bdinner\b/i.test(win)) mealTime = "lunch";
      else if (anchor) {
        var sh = parseInt(anchor.match(/(\d{1,2}):/)[1], 10);
        mealTime = sh >= 16 ? "dinner" : (sh >= 11 ? "lunch" : null);
      }

      var headJ = platters.length >= 2 ? platters[0].j
        : (isMinSpend ? minSpendJ : (best ? best.j : null));
      pushUnique({ qty: qty, name: nameOut, unitPrice: price, lineTotal: round2(qty * price),
        kind: kind, alternatingCourses: altCourses, group: itemGroup, contextLines: contextLines,
        platterItems: platters.length >= 2 ? platters.map(function (p) { return p.item; }) : null,
        serviceHours: serviceHours, anchor: anchor, mealTime: mealTime,
        sourceExcerpt: excerptBlock(headJ != null ? headJ : i - 10, i),
        sourceLine: i, headLine: headJ,
        confident: !!best || kind !== "per-person" || /canap/i.test(nameOut), source: "BEO" });
    });

    // On-consumption beverages: "Leeuwin Estate Sparkling Brut @ $75.00 per bottle"
    lines.forEach(function (line, idx) {
      var cm = line.match(/^(.*?)\s*@\s*\$([\d,]+(?:\.\d{1,2})?)\s*per\s+(bottle|glass|can|nip|jug|pint)\b/i);
      if (!cm) return;
      var nm = cm[1].replace(/\s+/g, " ").trim().replace(/^[>•\-\s]+/, "");
      if (nm.length < 2) return;
      pushUnique({ qty: null, name: nm, unitPrice: parseMoney(cm[2]),
        beoUnit: cm[3].toLowerCase(), kind: "consumption", group: "beverage",
        sourceExcerpt: excerpt(idx, idx), sourceLine: idx, headLine: idx, source: "BEO" });
    });

    // Minimum / event spend: "1 @ $5,400.00 event spend"
    re = /\$([\d,]+(?:\.\d{1,2})?)\s*event spend/gi;
    while ((m = re.exec(soft)) !== null) {
      var esJ = lineIndexOf(/event spend/i);
      pushUnique({ qty: 1, name: "Minimum event spend", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", sourceExcerpt: excerpt(esJ - 2, esJ),
        sourceLine: esJ, headLine: esJ - 2, source: "BEO" });
    }

    // Security officer hours: "5 Security officer hours ... @ $75.00 per hour".
    // Rate depends on the event's day of week (Mon–Fri / Sat / Sun), so this is
    // price-checked (kind "security") against the catalogue's security rates.
    re = /(\d+)\s+security officer hours?[\s\S]{0,120}?@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+hour/g;
    while ((m = re.exec(soft)) !== null) {
      var h = parseInt(m[1], 10), rate = parseMoney(m[2]);
      // A security line often names its own day (e.g. "Saturday rate") because
      // an event can cross midnight into a higher-rate day; prefer that over the
      // event date.
      var secDay = /\bsunday\b/i.test(m[0]) ? "sunday"
        : /\bsaturday\b/i.test(m[0]) ? "saturday"
        : /\b(mon|tue|wed|thu|fri|weekday|week\s*day)\w*\b/i.test(m[0]) ? "weekday" : null;
      var secJ = lineIndexOf(/\d+\s+security officer hours?/i);
      pushUnique({ qty: h, name: "Security officer hours", unitPrice: rate,
        lineTotal: round2(h * rate), kind: "security", beoUnit: "hour", securityDay: secDay,
        sourceExcerpt: excerpt(secJ - 1, secJ + 2), sourceLine: secJ, headLine: secJ, source: "BEO" });
    }

    // Attrition / minimum spend: "@ $5,460.00 per event"
    re = /attrition[\s\S]{0,80}?@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+event/g;
    while ((m = re.exec(soft)) !== null) {
      var atJ = lineIndexOf(/attrition/i);
      pushUnique({ qty: 1, name: "Attrition to meet minimum spend", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", sourceExcerpt: excerpt(atJ, atJ + 2),
        sourceLine: atJ, headLine: atJ, source: "BEO" });
    }

    // Audio visual quote: "... $3,589.65 per quote"
    re = /\$([\d,]+(?:\.\d{1,2})?)\s*per\s+quote/g;
    while ((m = re.exec(soft)) !== null) {
      var avJ = lineIndexOf(/per\s+quote|audio visual|encore/i);
      pushUnique({ qty: 1, name: "Audio visual", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", sourceExcerpt: excerpt(avJ - 1, avJ + 1),
        sourceLine: avJ, headLine: avJ, source: "BEO" });
    }

    // Barista coffee cart — a flat fee PER CART ($495 half day / $640 full day),
    // so the charge should reflect the number of carts.
    lines.forEach(function (line, idx) {
      if (!/\b(barista|coffee cart|cart hire)\b/i.test(line)) return;
      var ctx = lines.slice(Math.max(0, idx - 2), idx + 3).join("  ");
      var full = /full day|eight hour|8\s*hour/i.test(ctx);
      var half = /half day|four hour|4\s*hour/i.test(ctx);
      if (!full && !half) return;
      var qm = ctx.match(/(\d+)\s*(?:x\b|carts?\b)/i) || ctx.match(/\bx\s*(\d+)\b/i);
      var carts = qm ? parseInt(qm[1], 10) : 1;
      var pmx = ctx.match(/\$([\d,]+(?:\.\d{1,2})?)/);
      pushUnique({ qty: carts, name: "Barista Coffee Cart " + (full ? "Full Day" : "Half Day"),
        unitPrice: full ? 640 : 495, lineTotal: pmx ? parseMoney(pmx[1]) : null,
        kind: "cart", group: "food", sourceExcerpt: excerpt(idx - 2, idx + 2),
        sourceLine: idx, headLine: idx, source: "BEO" });
    });

    return items;
  }

  // Pull a few event details out of a BEO for display.
  function parseBeoHeader(text) {
    var t = String(text || "");
    function grab(re) { var m = t.match(re); return m ? m[1].trim() : ""; }
    return {
      beoNumber: grab(/BEO#?:?\s*([0-9]{3,})/i),
      account: grab(/Account:\s*([^\n]+)/i),
      bookingName: grab(/Booking Name:\s*([^\n]+)/i),
      eventName: grab(/BEO Name:\s*([^\n]+)/i),
      eventDate: parseEventDate(t),
      guests: (function () { var m = t.match(/(\d+)\s+guests?\s*@/); return m ? parseInt(m[1], 10) : null; })()
    };
  }

  // A "BEO distribution" is one PDF holding many BEOs back to back. Each BEO's
  // pages carry a repeated "EVENT ORDER / BEO#: <n> / Page: <k> of <total>"
  // header; a new BEO begins at "Page: 1 of N" (or wherever the BEO number
  // changes). Split the extracted text into one text block per BEO so each can
  // be parsed and checked on its own. A single BEO returns one segment.
  function splitBeoDistribution(text) {
    var lines = String(text || "").split(/\r?\n/);
    var starts = [];
    for (var i = 0; i < lines.length; i++) {
      var mb = lines[i].match(/^BEO#?:\s*(\d+)/i);
      if (!mb) continue;
      var mp = (lines[i + 1] || "").match(/^Page:\s*(\d+)\s*of\s*(\d+)/i);
      var pageNum = mp ? parseInt(mp[1], 10) : 1;
      var prev = starts[starts.length - 1];
      if (pageNum === 1 || !prev || prev.beoNumber !== mb[1]) {
        // Begin the segment at the "EVENT ORDER" banner line just above when present.
        var startIdx = (i > 0 && /^EVENT ORDER$/i.test(lines[i - 1].trim())) ? i - 1 : i;
        if (!prev || prev.idx !== startIdx) {
          starts.push({ idx: startIdx, beoNumber: mb[1], pages: mp ? parseInt(mp[2], 10) : 1 });
        }
      }
    }
    if (starts.length <= 1) {
      return [{ beoNumber: starts[0] ? starts[0].beoNumber : null, pages: starts[0] ? starts[0].pages : null, startLine: starts[0] ? starts[0].idx : 0, text: String(text || "") }];
    }
    var segs = [];
    for (var s = 0; s < starts.length; s++) {
      var from = starts[s].idx;
      var to = (s + 1 < starts.length) ? starts[s + 1].idx : lines.length;
      segs.push({ beoNumber: starts[s].beoNumber, pages: starts[s].pages, startLine: from, text: lines.slice(from, to).join("\n") });
    }
    return segs;
  }

  // ----------------------------------------------------------- price checking
  function checkItem(item, catalogue, eventDate) {
    var result = {
      qty: item.qty, name: item.name, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
      source: item.source, kind: item.kind || null, beoUnit: item.beoUnit || null,
      alternatingCourses: item.alternatingCourses || 0,
      sourceExcerpt: item.sourceExcerpt || null,
      sourceLine: (item.sourceLine != null ? item.sourceLine : null),
      headLine: (item.headLine != null ? item.headLine : null),
      status: "ok", notes: []
    };

    // Internal maths check (qty x unit price == line total) — only when we have both.
    // (Carts handle this themselves against the per-cart menu price.)
    if (item.kind !== "cart" && item.lineTotal != null && item.unitPrice != null && item.qty != null) {
      var expectedTotal = round2(item.qty * item.unitPrice);
      if (Math.abs(expectedTotal - item.lineTotal) > 0.005) {
        result.status = "math-error";
        result.mathExpectedTotal = expectedTotal;
        result.notes.push("Line total should be " + money(expectedTotal) +
          " (" + item.qty + " × " + money(item.unitPrice) + "), but reads " + money(item.lineTotal) + ".");
      }
    }

    // Tea and Coffee: priced by service duration (<=4 hrs $22, >4-8 hrs $28).
    if (item.kind === "tea-coffee") {
      result.category = "Coffee Breaks";
      result.matchedName = "Tea and Coffee";
      var tcCharged = item.unitPrice, h = item.serviceHours;
      if (h == null) {
        if (result.status !== "math-error") result.status = "review";
        result.priceStatus = "review";
        result.notes.push("Tea and Coffee — couldn't read the service duration. It's $22pp up to 4 hrs, or $28pp over 4 and up to 8 hrs; charged " + money(tcCharged) + ". Confirm the duration.");
        return result;
      }
      if (h > 8.01) {
        if (result.status !== "math-error") result.status = "review";
        result.priceStatus = "review";
        result.notes.push("Tea and Coffee service is " + h.toFixed(1) + " hrs, over the 8-hour maximum — confirm.");
        return result;
      }
      var tcExp = h <= 4.01 ? 22 : 28;
      var tcTier = h <= 4.01 ? "up to 4 hrs" : "over 4, up to 8 hrs";
      result.expectedPrice = tcExp;
      var tcD = round2(tcCharged - tcExp);
      result.priceDiff = tcD;
      result.priceImpact = item.qty != null ? round2(tcD * item.qty) : null;
      if (Math.abs(tcD) <= 0.005) {
        result.priceStatus = "correct";
        result.notes.push("Tea and Coffee " + h.toFixed(1) + " hrs (" + tcTier + ") = " + money(tcExp) + "pp. Correct.");
      } else {
        result.priceStatus = tcD < 0 ? "undercharged" : "overcharged";
        if (result.status !== "math-error") result.status = result.priceStatus;
        result.notes.push("Tea and Coffee " + h.toFixed(1) + " hrs (" + tcTier + ") should be " + money(tcExp) +
          "pp; charged " + money(tcCharged) + " (" + (tcD < 0 ? "under" : "over") + " by " + money(Math.abs(tcD)) +
          " each" + (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
      }
      return result;
    }

    // Barista coffee cart — flat fee per cart, charge should be carts × cart price.
    if (item.kind === "cart") {
      result.category = "Coffee Breaks";
      result.matchedName = item.name;
      var cartUnit = item.unitPrice, carts = item.qty || 1;
      var cartExp = round2(carts * cartUnit);
      result.expectedPrice = cartUnit;
      if (item.lineTotal == null) {
        if (result.status !== "math-error") result.status = "review";
        result.priceStatus = "review";
        result.notes.push(carts + " × " + item.name + " at " + money(cartUnit) + " per cart = " + money(cartExp) +
          ". Couldn't read the charged total — confirm it reflects " + carts + " cart" + (carts > 1 ? "s" : "") + ".");
        return result;
      }
      var cartD = round2(item.lineTotal - cartExp);
      result.priceDiff = cartD;
      if (Math.abs(cartD) <= 0.005) {
        result.priceStatus = "correct";
        result.notes.push(carts + " cart" + (carts > 1 ? "s" : "") + " × " + money(cartUnit) + " = " + money(cartExp) + ". Correct.");
      } else {
        result.priceStatus = cartD < 0 ? "undercharged" : "overcharged";
        if (result.status !== "math-error") result.status = result.priceStatus;
        result.notes.push(carts + " cart" + (carts > 1 ? "s" : "") + " × " + money(cartUnit) + " per cart should be " +
          money(cartExp) + "; charged " + money(item.lineTotal) + " (" + (cartD < 0 ? "under" : "over") + " by " + money(Math.abs(cartD)) + ").");
      }
      return result;
    }

    // Security officers — charged per officer-hour at a day-of-week rate
    // (Mon–Fri / Sat / Sun). The day comes from the event date.
    if (item.kind === "security") {
      result.category = "Security";
      result.matchedName = "Security Officer";
      var rates = (catalogue.securityRates) || { weekday: 63, saturday: 75, sunday: 86 };
      var secCharged = item.unitPrice;
      var secExp, dayLabel;
      if (item.securityDay === "sunday") { secExp = rates.sunday; dayLabel = "Sunday"; }
      else if (item.securityDay === "saturday") { secExp = rates.saturday; dayLabel = "Saturday"; }
      else if (item.securityDay === "weekday") { secExp = rates.weekday; dayLabel = "a weekday (Mon–Fri)"; }
      else {
        // No day on the line — fall back to the event date.
        var dow = dayOfWeek(eventDate);
        if (dow == null) {
          if (result.status !== "math-error") result.status = "review";
          result.priceStatus = "review";
          result.notes.push("Security officer charged " + money(secCharged) + "/hour — couldn't tell the day (no day on the line and no event date) to pick the rate " +
            "(Mon–Fri $" + rates.weekday + ", Sat $" + rates.saturday + ", Sun $" + rates.sunday + "/hour). Confirm the day.");
          return result;
        }
        secExp = dow === 0 ? rates.sunday : dow === 6 ? rates.saturday : rates.weekday;
        dayLabel = WEEKDAY_NAMES[dow] + (dow === 0 || dow === 6 ? "" : " (weekday)");
      }
      result.expectedPrice = secExp;
      var secD = round2(secCharged - secExp);
      result.priceDiff = secD;
      result.priceImpact = item.qty != null ? round2(secD * item.qty) : null;
      if (Math.abs(secD) <= 0.005) {
        result.priceStatus = "correct";
        result.notes.push("Security officer on " + dayLabel + " = $" + secExp + "/hour" +
          (item.qty != null ? " × " + item.qty + " hour" + (item.qty > 1 ? "s" : "") : "") + ". Correct.");
      } else {
        result.priceStatus = secD < 0 ? "undercharged" : "overcharged";
        if (result.status !== "math-error") result.status = result.priceStatus;
        result.notes.push("Security officer on " + dayLabel + " should be $" + secExp + "/hour; charged " + money(secCharged) +
          "/hour (" + (secD < 0 ? "under" : "over") + " by " + money(Math.abs(secD)) + "/hour" +
          (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty + " hour" + (item.qty > 1 ? "s" : "") : "") + ").");
      }
      return result;
    }

    // Beverage package with a non-standard duration (e.g. 6.5 hours) — the menu
    // only lists whole-hour tiers, so confirm the rate against the quote.
    if (item.kind === "bev-nonstandard") {
      result.category = "Beverage Package";
      result.matchedName = item.name;
      if (result.status !== "math-error") result.status = "review";
      result.priceStatus = "review";
      result.notes.push(item.name + " charged " + money(item.unitPrice) +
        "pp — the menu only lists whole-hour tiers (e.g. 6 Hour), so this duration isn't a standard rate. Confirm against the quote.");
      return result;
    }

    // Multi-item crew-platter selection sharing one per-person charge — the
    // expected rate is the sum of the chosen platters' menu prices.
    if (item.kind === "platter-selection" && item.platterItems && item.platterItems.length) {
      var psum = 0, pparts = [];
      item.platterItems.forEach(function (p) { psum += (p.price || 0); pparts.push(p.name + " " + money(p.price)); });
      psum = round2(psum);
      result.category = "Crew Packages";
      result.matchedName = item.platterItems.map(function (p) { return p.name; }).join(" + ");
      result.expectedPrice = psum;
      result.unit = "pp";
      var pdiff = round2(item.unitPrice - psum);
      result.priceDiff = pdiff;
      result.priceImpact = item.qty != null ? round2(pdiff * item.qty) : null;
      result._explained = true;
      if (Math.abs(pdiff) <= 0.005) {
        result.priceStatus = "correct";
        result.notes.push("Platter selection — " + pparts.join(" + ") + " = " + money(psum) + " per person. Correct.");
      } else {
        result.priceStatus = pdiff < 0 ? "undercharged" : "overcharged";
        if (result.status !== "math-error") result.status = result.priceStatus;
        result.notes.push("Platter selection — " + pparts.join(" + ") + " = " + money(psum) +
          " per person; charged " + money(item.unitPrice) + "pp (" + (pdiff < 0 ? "under" : "over") +
          " by " + money(Math.abs(pdiff)) + "pp" +
          (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty + " guests" : "") + ").");
      }
      return result;
    }

    var per = item.beoUnit ? (" per " + item.beoUnit) : "";
    var match = findMatch(item.name, catalogue, undefined, item.group);
    // Crew set menu has a lunch and a dinner rate; the matcher can't tell them
    // apart from "Chef's selection of main course", so pick by the service time.
    if (match && item.mealTime && /^Crew Set Menu .*(Lunch|Dinner)$/.test(match.item.name)) {
      var want = item.mealTime === "dinner" ? "Dinner" : "Lunch";
      if (!new RegExp(want + "$").test(match.item.name)) {
        var target = match.item.name.replace(/(Lunch|Dinner)$/, want);
        var alt = (catalogue.items || []).filter(function (x) { return x.name === target; })[0];
        if (alt) match = { item: alt, score: match.score };
      }
    }
    if (match) {
      result.matchedName = match.item.name;
      result.matchScore = round2(match.score);
      result.expectedPrice = match.item.price;
      result.unit = match.item.unit;
      result.category = match.item.category;
      result.menuNote = match.item.note || null;

      if (match.item.price == null) {
        // Package whose price isn't fixed in the menu (e.g. Day Delegate).
        result.priceStatus = "review";
        if (result.status !== "math-error") result.status = "review";
        result._explained = true;
        result.notes.push("Menu price varies for " + match.item.name + " — confirm against the quote.");
        if (match.item.minGuests && item.qty != null && item.qty < match.item.minGuests) {
          result.notes.push("Below the " + match.item.minGuests + "-guest minimum for " + match.item.name +
            " (" + item.qty + " guests) — confirm.");
        }
        if (result.menuNote) result.notes.push(result.menuNote);
        return result;
      }

      var base = match.item.price;
      var diff = round2(item.unitPrice - base);
      result.priceDiff = diff;
      result.priceImpact = (item.qty != null) ? round2(diff * item.qty) : null;

      var bevInfo = (match.item.category === "Beverage Package" && item.contextLines)
        ? analyzeBeveragePackage(item, match.item, catalogue) : null;
      var bfInfo = (match.item.breakfast && item.contextLines)
        ? analyzePlatedBreakfast(item, match.item, catalogue) : null;
      var cbInfo = (match.item.breakItems && item.contextLines)
        ? analyzeCoffeeBreakItems(item, match.item) : null;
      var compInfo = (match.item.composition && item.contextLines)
        ? analyzeComposition(item, match.item, catalogue) : null;
      if (bevInfo) {
        explainBeveragePackage(result, item, match.item, base, bevInfo, catalogue);
      } else if (bfInfo) {
        explainPlatedBreakfast(result, item, match.item, base, diff, bfInfo);
      } else if (cbInfo) {
        explainCoffeeBreak(result, item, match.item, base, diff, cbInfo);
      } else if (compInfo && compInfo.total > 0) {
        explainComposition(result, item, match.item, base, diff, compInfo);
      } else if (match.item.composable && diff > 0.005) {
        composableExplain(result, item, match.item, base, diff);
      } else if (Math.abs(diff) <= 0.005) {
        result.priceStatus = "correct";
      } else {
        result.priceStatus = diff < 0 ? "undercharged" : "overcharged";
        if (result.status !== "math-error") result.status = result.priceStatus;
        var sameCat = (catalogue.items || []).filter(function (x) {
          return x.category === match.item.category && Math.abs(x.price - item.unitPrice) <= 0.005;
        });
        if (sameCat.length) {
          result.notes.push("Charged price " + money(item.unitPrice) + " matches " + sameCat[0].name + ".");
        }
        var impactText = (item.qty != null)
          ? (money(Math.abs(diff)) + " each, " + money(Math.abs(result.priceImpact)) + " across " + item.qty)
          : (money(Math.abs(diff)) + per);
        result.notes.push("Menu price for " + match.item.name + " is " + money(base) + per +
          "; charged " + money(item.unitPrice) + per + " (" + (diff < 0 ? "under" : "over") +
          " by " + impactText + ").");
      }
      if (match.score < 0.999) {
        result.notes.push("Matched to “" + match.item.name + "”" +
          (normalize(item.name) !== normalize(match.item.name) ? " (from “" + item.name + "”)" : "") + ".");
      }
      if (result.menuNote) result.notes.push(result.menuNote);
    } else if (item.kind === "custom") {
      if (result.status !== "math-error") result.status = "review";
      result.priceStatus = "review";
      result.notes.push("Custom / bespoke package — no standard menu price. Confirm the agreed price manually.");
    } else if (looksNonMenu(item.name, catalogue) || item.kind === "non-menu") {
      if (result.status === "ok") result.status = "non-menu";
      result.priceStatus = "not-checked";
      result.notes.push("Not a menu item — confirm this charge manually (no menu price to check against).");
    } else {
      if (result.status === "ok") result.status = "unmatched";
      result.priceStatus = "no-match";
      result.notes.push("No menu match found — check the item name or add it to the price list.");
    }

    // Seasonal-menu validity and minimum-guest checks for a matched menu item.
    if (match && match.item) {
      if (eventDate && match.item.validTo && eventDate > match.item.validTo) {
        result.notes.push("Seasonal menu: " + match.item.category + " is only valid to " + fmtDate(match.item.validTo) +
          ", but the event is dated " + fmtDate(eventDate) + " — confirm the correct menu and price apply.");
        if (result.status === "ok" || result.priceStatus === "correct") { result.status = "review"; result.priceStatus = "review"; }
      } else if (eventDate && match.item.validFrom && eventDate < match.item.validFrom) {
        result.notes.push("This menu is valid from " + fmtDate(match.item.validFrom) + "; the event is dated " +
          fmtDate(eventDate) + " — confirm.");
        if (result.status === "ok" || result.priceStatus === "correct") { result.status = "review"; result.priceStatus = "review"; }
      }
      if (match.item.minGuests && item.qty != null && item.qty < match.item.minGuests) {
        result.notes.push("Below the " + match.item.minGuests + "-guest minimum for " + match.item.name +
          " (" + item.qty + " guests) — confirm.");
      }
    }
    return result;
  }

  // A set/plated menu charged above its base price: explain the excess via the
  // alternating-service and additional-course surcharges.
  function composableExplain(result, item, cat, base, diff) {
    var altCourses = item.alternatingCourses || 0;
    var altPrice = cat.altPrice || 10;
    var altAmount = round2(altCourses * altPrice);
    var remainder = round2(diff - altAmount);
    result._explained = true;

    if (altCourses > 0 && Math.abs(remainder) <= 0.005) {
      // Fully explained by the alternating courses the BEO actually shows.
      result.priceStatus = "correct";
      result.notes.push("Correct: base " + cat.name + " " + money(base) + " + " + altCourses +
        " alternating course" + (altCourses > 1 ? "s" : "") + " (+" + money(altAmount) + ") = " +
        money(item.unitPrice) + " per person.");
      return;
    }

    result.priceStatus = "review";
    if (result.status !== "math-error") result.status = "review";
    var note = "Charged " + money(item.unitPrice) + " is " + money(diff) + " above the base " +
      cat.name + " (" + money(base) + ").";
    if (altCourses > 0) {
      note += " " + altCourses + " alternating course" + (altCourses > 1 ? "s" : "") +
        " accounts for " + money(altAmount) + ", leaving " + money(remainder) + ".";
    }
    var hints = [];
    var altN = remainder / altPrice;
    if (Math.abs(altN - Math.round(altN)) < 0.001 && Math.round(altN) > 0) {
      hints.push(Math.round(altN) + " alternating course" + (Math.round(altN) > 1 ? "s" : "") +
        " (" + money(altPrice) + "pp each)");
    }
    if (cat.addCoursePrice) {
      var addN = remainder / cat.addCoursePrice;
      if (Math.abs(addN - Math.round(addN)) < 0.001 && Math.round(addN) > 0) {
        hints.push(Math.round(addN) + " additional course" + (Math.round(addN) > 1 ? "s" : "") +
          " (" + money(cat.addCoursePrice) + "pp)");
      }
    }
    if (hints.length) note += " The extra " + money(remainder) + " matches " + hints.join(" or ") + " — confirm the menu composition.";
    else note += " The extra " + money(remainder) + " isn't a standard add-on — please check.";
    result.notes.push(note);
  }

  function checkDocument(items, catalogue, eventDate) {
    var checked = (items || []).map(function (it) { return checkItem(it, catalogue, eventDate); });
    var summary = {
      total: checked.length,
      correct: 0, undercharged: 0, overcharged: 0, mathErrors: 0, nonMenu: 0, unmatched: 0, review: 0,
      chargedTotal: 0, expectedTotal: 0, variance: 0, issues: 0
    };
    checked.forEach(function (r) {
      if (r.status === "math-error") summary.mathErrors++;
      if (r.priceStatus === "undercharged") summary.undercharged++;
      else if (r.priceStatus === "overcharged") summary.overcharged++;
      else if (r.priceStatus === "correct") summary.correct++;
      else if (r.priceStatus === "not-checked") summary.nonMenu++;
      else if (r.priceStatus === "no-match") summary.unmatched++;
      else if (r.priceStatus === "review") summary.review++;

      // Lines with no quantity (beverages on consumption) can't be totalled.
      var charged = r.lineTotal != null ? r.lineTotal
        : (r.qty != null ? round2(r.qty * (r.unitPrice || 0)) : 0);
      summary.chargedTotal = round2(summary.chargedTotal + charged);
      // Only over/undercharges carry an independent expectation; everything else
      // (correct, review, non-menu, unmatched) expects what was charged.
      var expectedLine = (r.qty != null && (r.priceStatus === "overcharged" || r.priceStatus === "undercharged"))
        ? round2(r.qty * r.expectedPrice)
        : charged;
      summary.expectedTotal = round2(summary.expectedTotal + expectedLine);
    });
    summary.variance = round2(summary.chargedTotal - summary.expectedTotal);
    summary.issues = summary.undercharged + summary.overcharged + summary.mathErrors + summary.unmatched;
    // Whole-event validity against the price book's own window.
    if (eventDate && catalogue.meta) {
      if (catalogue.meta.validTo && eventDate > catalogue.meta.validTo) {
        summary.validityNote = "Event is dated " + fmtDate(eventDate) + ", after this price book's validity (to " +
          fmtDate(catalogue.meta.validTo) + "). Confirm you're using the current prices.";
      } else if (catalogue.meta.validFrom && eventDate < catalogue.meta.validFrom) {
        summary.validityNote = "Event is dated " + fmtDate(eventDate) + ", before this price book's validity (from " +
          fmtDate(catalogue.meta.validFrom) + "). Confirm the price book.";
      }
    }
    return { items: checked, summary: summary, eventDate: eventDate || null };
  }

  // A beverage package: classify the drinks listed under it and work out the
  // add-on surcharge (extra wines/beers beyond the standard inclusions).
  function analyzeBeveragePackage(item, catItem, catalogue) {
    var family = catItem.name.replace(/\s*-\s*\d+\s*hours?.*$/i, "").trim();
    var inc = (catalogue.packageInclusions || {})[family];
    if (!inc || !item.contextLines || !item.contextLines.length) return null;

    var beers = [], winesByColor = { Sparkling: [], White: [], Red: [] };
    item.contextLines.forEach(function (line) {
      if (/soft drink|orange juice|beverage note|^>|per person|per bottle|per glass/i.test(line)) return;
      var mm = findMatch(line, catalogue, undefined, "beverage");
      if (!mm) return;
      var c = mm.item.category;
      if (c === "Beer and Cider") beers.push(mm.item.name);
      else if (/Sparkling/.test(c)) winesByColor.Sparkling.push(mm.item.name);
      else if (/White/.test(c)) winesByColor.White.push(mm.item.name);
      else if (/Red/.test(c)) winesByColor.Red.push(mm.item.name);
    });

    // Extra beers: more than one from an "OR" group, or a beer in no group.
    var groupCounts = inc.beerGroups.map(function () { return 0; }), ungrouped = 0;
    beers.forEach(function (b) {
      var gi = -1;
      inc.beerGroups.forEach(function (g, idx) {
        if (g.some(function (x) { return normalize(x) === normalize(b); })) gi = idx;
      });
      if (gi >= 0) groupCounts[gi]++; else ungrouped++;
    });
    var extraBeers = ungrouped;
    groupCounts.forEach(function (c) { if (c > 1) extraBeers += c - 1; });

    // Extra wines: more than one per colour. Keep the lowest-tier one as the
    // included wine; the rest are extras. Only Crown Deluxe (+$10) and WA Premium
    // (+$15) wines are valid add-ons. A Reserve wine added, or any wine that isn't
    // a package selection at all, is flagged to be checked (not auto-priced).
    var rank = { reserve: 0, deluxe: 1, wapremium: 2, other: 3 };
    var wineSur = catalogue.packageSurcharges.extraWine; // { deluxe:10, wapremium:15 }
    var extraWineCount = 0, extraWineSurcharge = 0, flagWines = [];
    ["Sparkling", "White", "Red"].forEach(function (col) {
      var list = winesByColor[col].map(function (nm) {
        return { nm: nm, tier: (catalogue.wineTier || {})[nm] || "other" };
      });
      // Any wine that isn't one of the package selections isn't a valid add-on.
      list.forEach(function (w) { if (w.tier === "other") flagWines.push(w.nm + " (not a package wine)"); });
      list.sort(function (a, b) { return rank[a.tier] - rank[b.tier]; });
      for (var k = 1; k < list.length; k++) { // first = included, rest = extras
        var t = list[k].tier;
        if (t === "deluxe" || t === "wapremium") { extraWineCount++; extraWineSurcharge += wineSur[t]; }
        else if (t === "reserve") flagWines.push(list[k].nm + " (Reserve wines can't be added to a package)");
        // "other" wines were already flagged above
      }
    });

    var beerSurcharge = round2(extraBeers * catalogue.packageSurcharges.extraBeer);
    return {
      addon: round2(beerSurcharge + extraWineSurcharge),
      extraBeers: extraBeers, beerSurcharge: beerSurcharge,
      extraWineCount: extraWineCount, extraWineSurcharge: round2(extraWineSurcharge),
      flagWines: flagWines,
      detectedBeers: beers.length,
      detectedWines: winesByColor.Sparkling.length + winesByColor.White.length + winesByColor.Red.length
    };
  }

  // Note when the charged price matches a different hour tier of the same package.
  function tierMatchNote(catItem, charged, catalogue) {
    var family = catItem.name.replace(/\s*-\s*\d+\s*hours?.*$/i, "").trim();
    var hit = (catalogue.items || []).filter(function (x) {
      return x.category === "Beverage Package" && x.name.indexOf(family) === 0 &&
        x.name !== catItem.name && Math.abs(x.price - charged) <= 0.005;
    })[0];
    return hit ? ("Charged " + money(charged) + " matches " + hit.name + ".") : null;
  }

  function explainBeveragePackage(result, item, catItem, base, info, catalogue) {
    var charged = item.unitPrice;
    var expected = round2(base + info.addon);
    var diffBase = round2(charged - base);
    var diffExp = round2(charged - expected);
    result.priceDiff = diffBase;
    result.priceImpact = item.qty != null ? round2(diffBase * item.qty) : null;
    result.packageExpected = expected;
    result._explained = true;

    var bd = [];
    if (info.extraBeers) bd.push(info.extraBeers + " extra beer/cider (+" + money(info.beerSurcharge) + "pp)");
    if (info.extraWineCount) bd.push(info.extraWineCount + " extra wine (+" + money(info.extraWineSurcharge) + "pp)");
    var addonTxt = bd.join(" and ");

    // Wines that aren't a valid package add-on — always needs a human check.
    if (info.flagWines && info.flagWines.length) {
      result.priceStatus = "review";
      if (result.status !== "math-error") result.status = "review";
      result.notes.push("Wines to check on " + catItem.name + ": " + info.flagWines.join("; ") +
        ". Only Crown Deluxe (+$10pp) or WA Premium (+$15pp) wines can be added to a package." +
        (addonTxt ? " Also detected " + addonTxt + "." : "") + " Confirm the wines and the price.");
      return;
    }

    // Charged exactly matches base + detected add-ons.
    if (info.addon > 0 && Math.abs(diffExp) <= 0.005) {
      result.priceStatus = "correct";
      result.notes.push("Correct with add-ons: " + money(base) + "pp base + " + addonTxt + " = " + money(expected) + "pp.");
      return;
    }
    // Below base — undercharged however you count it.
    if (diffBase < -0.005) {
      result.priceStatus = "undercharged";
      if (result.status !== "math-error") result.status = "undercharged";
      var tn = tierMatchNote(catItem, charged, catalogue);
      if (tn) result.notes.push(tn);
      result.notes.push("Standard " + catItem.name + " is " + money(base) + "pp; charged " + money(charged) +
        "pp (under by " + money(Math.abs(diffBase)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
      if (info.addon > 0) result.notes.push("Also detected " + addonTxt + " — with add-ons the price should be about " + money(expected) + "pp. Confirm.");
      return;
    }
    // At/above base with detected extras that don't reconcile — confirm.
    if (info.addon > 0) {
      result.priceStatus = "review";
      if (result.status !== "math-error") result.status = "review";
      result.notes.push("Standard " + catItem.name + " is " + money(base) + "pp; detected " + addonTxt +
        " → expected " + money(expected) + "pp. Charged " + money(charged) + "pp (" +
        (diffExp < 0 ? money(Math.abs(diffExp)) + " under" : money(Math.abs(diffExp)) + " over") +
        " expected). Confirm the package add-ons.");
      return;
    }
    // No extras detected: compare to base.
    if (Math.abs(diffBase) <= 0.005) {
      result.priceStatus = "correct";
    } else {
      result.priceStatus = "overcharged";
      if (result.status !== "math-error") result.status = "overcharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "pp; charged " + money(charged) +
        "pp (over by " + money(Math.abs(diffBase)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    }
  }

  // Plated breakfast: count how many selections a BEO made per category and
  // flag any category that exceeds what the menu allows (Menu One = 1 bakery /
  // 1 continental / 1 pan; Menu Two = 2 bakery / 1 continental / 1 pan).
  function analyzePlatedBreakfast(item, catItem, catalogue) {
    var rules = catItem.breakfast;
    var sel = catalogue.breakfastSelections;
    if (!rules || !sel || !item.contextLines || !item.contextLines.length) return null;
    var text = " " + normalize(item.contextLines.join("  ")) + " ";
    var counts = {}, flags = [];
    ["bakery", "continental", "pan"].forEach(function (cat) {
      var n = 0;
      (sel[cat] || []).forEach(function (kw) {
        if (text.indexOf(normalize(kw)) !== -1) n++;
      });
      counts[cat] = n;
      if (rules[cat] != null && n > rules[cat]) {
        flags.push(n + " " + cat + " item" + (n > 1 ? "s" : "") + " selected but the menu allows " + rules[cat]);
      }
    });
    return { counts: counts, rules: rules, flags: flags };
  }

  function explainPlatedBreakfast(result, item, catItem, base, diff, info) {
    result.priceDiff = diff;
    result.priceImpact = item.qty != null ? round2(diff * item.qty) : null;
    result._explained = true;
    var countTxt = "bakery " + info.counts.bakery + "/" + info.rules.bakery +
      ", continental " + info.counts.continental + "/" + info.rules.continental +
      ", pan " + info.counts.pan + "/" + info.rules.pan;

    if (diff < -0.005) {
      result.priceStatus = "undercharged";
      if (result.status !== "math-error") result.status = "undercharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (under by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    } else if (diff > 0.005) {
      result.priceStatus = "overcharged";
      if (result.status !== "math-error") result.status = "overcharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (over by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    } else if (info.flags.length) {
      result.priceStatus = "review";
      if (result.status !== "math-error") result.status = "review";
      result.notes.push("Selections exceed the menu — " + info.flags.join("; ") + " (" + countTxt + "). Check the BEO.");
    } else {
      result.priceStatus = "correct";
      result.notes.push("Price and selections OK (" + countTxt + ").");
    }
  }

  // Selection-based menus (buffets, Indian, children's): count how many dishes
  // the BEO listed in each course category and flag any category that exceeds
  // the menu tier's allowance. Dish phrases are distinctive to one category, so
  // a BEO that lists its chosen dishes can be counted; a bare line (just the
  // menu name) detects nothing and falls through to the normal price check.
  function analyzeComposition(item, catItem, catalogue) {
    var comp = catItem.composition;
    var sets = catalogue.compositionSets;
    if (!comp || !sets || !sets[comp.set]) return null;
    if (!comp.limits && !comp.options) return null;
    if (!item.contextLines || !item.contextLines.length) return null;
    var sel = sets[comp.set];
    var text = " " + normalize(item.contextLines.join("  ")) + " ";

    function countCat(cat) {
      var seen = {}, n = 0;
      (sel[cat] || []).forEach(function (kw) {
        var k = normalize(kw);
        if (!seen[k] && text.indexOf(k) !== -1) { seen[k] = 1; n++; }
      });
      return n;
    }

    // Options mode (e.g. the lunchbox): each category is a whole menu option;
    // flag when more distinct options are detected than the package allows.
    if (comp.options) {
      var detected = [], counts0 = {};
      comp.options.forEach(function (opt) {
        var n = countCat(opt);
        counts0[opt] = n;
        if (n > 0) detected.push(opt);
      });
      var oflags = [];
      if (comp.maxOptions != null && detected.length > comp.maxOptions) {
        oflags.push(detected.length + " menu options selected (" + detected.join(", ") +
          ") but the package allows a maximum of " + comp.maxOptions);
      }
      return { mode: "options", counts: counts0, detected: detected, maxOptions: comp.maxOptions,
        flags: oflags, total: detected.length };
    }

    // Limits mode: count dishes per course against each course's allowance.
    var limits = comp.limits;
    var counts = {}, flags = [], total = 0, cats = Object.keys(limits);
    cats.forEach(function (cat) {
      var n = countCat(cat);
      counts[cat] = n;
      total += n;
      if (limits[cat] != null && n > limits[cat]) {
        flags.push(n + " " + cat + " item" + (n > 1 ? "s" : "") + " selected but the menu allows " + limits[cat]);
      }
    });
    return { mode: "limits", counts: counts, limits: limits, cats: cats, flags: flags, total: total };
  }

  function compositionCountText(info) {
    if (info.mode === "options") {
      return (info.detected.length ? info.detected.join(", ") : "none") +
        " (" + info.detected.length + "/" + info.maxOptions + " options)";
    }
    return info.cats.map(function (c) {
      return c + " " + info.counts[c] + "/" + info.limits[c];
    }).join(", ");
  }

  function explainComposition(result, item, catItem, base, diff, info) {
    result.priceDiff = diff;
    result.priceImpact = item.qty != null ? round2(diff * item.qty) : null;
    result._explained = true;
    var countTxt = compositionCountText(info);
    if (diff < -0.005) {
      result.priceStatus = "undercharged";
      if (result.status !== "math-error") result.status = "undercharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (under by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
      if (info.flags.length) {
        result.notes.push("Also: selections exceed the menu — " + info.flags.join("; ") + " (" + countTxt + ").");
      }
    } else if (diff > 0.005) {
      result.priceStatus = "overcharged";
      if (result.status !== "math-error") result.status = "overcharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (over by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    } else if (info.flags.length) {
      result.priceStatus = "review";
      if (result.status !== "math-error") result.status = "review";
      result.notes.push("Selections exceed the menu — " + info.flags.join("; ") + " (" + countTxt +
        "). The price is right for " + catItem.name + ", but confirm the extra items were meant to be included.");
    } else {
      result.priceStatus = "correct";
      result.notes.push("Price and selections OK (" + countTxt + ").");
    }
  }

  // Coffee break package: count the sweet/savoury items the BEO selected and
  // flag if more were chosen than the package allows (One 1, Two 2, Three 4).
  function analyzeCoffeeBreakItems(item, catItem) {
    var allowed = catItem.breakItems;
    // Operational / room-setup content (which can interleave from the BEO's other
    // column) ends the food-selection list.
    var stopRe = /\b(room|linen|napkin|tablecloth|table|tables|chair|chairs|floor ?plan|preset|station|stage|dance floor|cluster|clusters|glasses|ice bucket|lectern|microphone|security|please refer|set ?up|allocated|centrepiece|cabaret|trestle|banquet|av desk|whiteboard|projector|screen|signage|pinboard|water and mint|chef notes?)\b/i;
    var inSel = false, count = 0;
    (item.contextLines || []).forEach(function (l) {
      var t = l.replace(/\s+/g, " ").trim();
      if (!t) return;
      if (/^(sweet|savoury|savory)\b.*\b(items?|selections?)\b/i.test(t)) { inSel = true; return; }
      if (/^(from the|continental|menu$|beverages?$|program|dietary|miscellaneous|technical)/i.test(t)) { inSel = false; return; }
      if (stopRe.test(t)) { inSel = false; return; }
      if (!inSel) return;
      if (/^~+$/.test(t) || /^[>*]/.test(t)) return;               // separators / notes
      if (/assorted cookies|freshly brewed|selection of teas/i.test(t)) return; // always included
      count++;
    });
    return { count: count, allowed: allowed, flag: count > allowed };
  }

  function explainCoffeeBreak(result, item, catItem, base, diff, info) {
    result.priceDiff = diff;
    result.priceImpact = item.qty != null ? round2(diff * item.qty) : null;
    result._explained = true;
    var allowTxt = catItem.name + " allows " + info.allowed + " item" + (info.allowed > 1 ? "s" : "");
    if (diff < -0.005) {
      result.priceStatus = "undercharged";
      if (result.status !== "math-error") result.status = "undercharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (under by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    } else if (diff > 0.005) {
      result.priceStatus = "overcharged";
      if (result.status !== "math-error") result.status = "overcharged";
      result.notes.push("Menu price for " + catItem.name + " is " + money(base) + "; charged " + money(item.unitPrice) +
        " (over by " + money(Math.abs(diff)) + " each" +
        (item.qty != null ? ", " + money(Math.abs(result.priceImpact)) + " across " + item.qty : "") + ").");
    } else if (info.flag) {
      result.priceStatus = "review";
      if (result.status !== "math-error") result.status = "review";
      result.notes.push("BEO appears to list about " + info.count + " sweet/savoury item(s), but " + allowTxt +
        ". Check the selections.");
    } else {
      result.priceStatus = "correct";
      result.notes.push("Price OK — " + allowTxt + (info.count ? " (about " + info.count + " listed)" : "") + ".");
    }
  }

  // ------------------------------------------------------------- reconcile
  // Compare a BEO's charges against a SOC's charges item by item.
  function reconcile(beoItems, socItems) {
    var rows = [];
    var usedSoc = {};
    (beoItems || []).forEach(function (b) {
      var bestIdx = -1, bestScore = 0;
      (socItems || []).forEach(function (s, idx) {
        if (usedSoc[idx]) return;
        var sc = scoreNames(b.name, s.name);
        if (sc > bestScore) { bestScore = sc; bestIdx = idx; }
      });
      if (bestIdx >= 0 && bestScore >= 0.6) {
        usedSoc[bestIdx] = true;
        var s = socItems[bestIdx];
        var diffs = [];
        if (b.qty != null && s.qty != null && b.qty !== s.qty) diffs.push("qty " + b.qty + " vs " + s.qty);
        if (b.unitPrice != null && s.unitPrice != null && Math.abs(b.unitPrice - s.unitPrice) > 0.005)
          diffs.push("price " + money(b.unitPrice) + " vs " + money(s.unitPrice));
        if (b.lineTotal != null && s.lineTotal != null && Math.abs(b.lineTotal - s.lineTotal) > 0.005)
          diffs.push("total " + money(b.lineTotal) + " vs " + money(s.lineTotal));
        rows.push({ status: diffs.length ? "mismatch" : "match", beo: b, soc: s, diffs: diffs });
      } else {
        rows.push({ status: "beo-only", beo: b, soc: null, diffs: ["On BEO but not matched on SOC"] });
      }
    });
    (socItems || []).forEach(function (s, idx) {
      if (!usedSoc[idx]) rows.push({ status: "soc-only", beo: null, soc: s, diffs: ["On SOC but not matched on BEO"] });
    });
    var mismatches = rows.filter(function (r) { return r.status !== "match"; }).length;
    return { rows: rows, mismatches: mismatches, matched: rows.length - mismatches };
  }

  // ------------------------------------------------------------- formatting
  function money(n) {
    if (n == null || isNaN(n)) return "—";
    return "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function unitLabel(u) {
    return ({ pp: "person", pp_per_course: "person per course", pp_per_selection: "person per selection",
      child: "child", glass: "glass", bottle: "bottle", each: "item", flat: "event" })[u] || "unit";
  }

  var API = {
    round2: round2, parseMoney: parseMoney, normalize: normalize, softNorm: softNorm,
    scoreNames: scoreNames, findMatch: findMatch, looksNonMenu: looksNonMenu,
    parseSocRows: parseSocRows, parseSocText: parseSocText,
    parseBeo: parseBeo, parseBeoHeader: parseBeoHeader, parseEventDate: parseEventDate, fmtDate: fmtDate,
    splitBeoDistribution: splitBeoDistribution,
    checkItem: checkItem, checkDocument: checkDocument, reconcile: reconcile,
    money: money, unitLabel: unitLabel
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.BEOEngine = API;
})(typeof window !== "undefined" ? window : this);
