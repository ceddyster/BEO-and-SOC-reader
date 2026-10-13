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

  var NUM_WORDS = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
    seven: "7", eight: "8", nine: "9", ten: "10", twelve: "12" };

  // Loose normalisation for matching names. Number words -> digits,
  // "hours" -> "hour", punctuation dropped, whitespace collapsed.
  function normalize(s) {
    s = String(s === null || s === undefined ? "" : s).toLowerCase();
    s = s.replace(/&/g, " and ");
    s = s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b/g,
      function (w) { return NUM_WORDS[w]; });
    s = s.replace(/\bhrs?\b/g, "hour").replace(/\bhours\b/g, "hour");
    s = s.replace(/\bpax\b/g, "").replace(/\bper person\b/g, "").replace(/\bpp\b/g, "");
    // Drop filler words BEOs insert that carry no identity, so e.g.
    // "Coffee Break Menu Two" matches the price-book "Coffee Break Two".
    s = s.replace(/\b(menu|package|pkg|option|selection)\b/g, " ");
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
  function findMatch(name, catalogue, threshold) {
    threshold = threshold === undefined ? 0.7 : threshold;
    var best = null;
    (catalogue.items || []).forEach(function (item) {
      buildMatchNames(item).forEach(function (candidate) {
        var sc = scoreNames(name, candidate);
        if (!best || sc > best.score) best = { item: item, score: sc };
      });
    });
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
        return x.name === it.name && x.unitPrice === it.unitPrice && x.qty === it.qty && x.kind === it.kind;
      });
      if (!dup) items.push(it);
    }

    var re, m;

    // Per-person food/beverage: "215 guests @ $90.00 per person"
    lines.forEach(function (line, i) {
      var pm = softNorm(line).match(/(\d+)\s+guests?\s*@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+person/);
      if (!pm) return;
      var qty = parseInt(pm[1], 10);
      var price = parseMoney(pm[2]);

      // Best catalogue match among the up-to-30 heading lines above the price.
      var best = null;
      for (var j = i - 1; j >= Math.max(0, i - 30); j--) {
        var cand = lines[j].replace(/\s+/g, " ").trim();
        if (cand.length < 3 || /@|\$|^\d/.test(cand)) continue; // skip charge/time lines
        var mm = findMatch(cand, catalogue);
        if (mm && (!best || mm.score > best.score)) best = { score: mm.score, name: cand, j: j };
      }

      // Count "alternating with" in the menu block (heading → price) for set menus.
      var altCourses = 0, nameOut = "(unidentified per-person item)";
      if (best) {
        nameOut = best.name;
        for (var k = best.j; k < i; k++) if (/alternating with/i.test(lines[k])) altCourses++;
      }
      pushUnique({ qty: qty, name: nameOut, unitPrice: price, lineTotal: round2(qty * price),
        kind: "per-person", alternatingCourses: altCourses, confident: !!best, source: "BEO" });
    });

    // On-consumption beverages: "Leeuwin Estate Sparkling Brut @ $75.00 per bottle"
    String(text || "").split(/\r?\n/).forEach(function (line) {
      var cm = line.match(/^(.*?)\s*@\s*\$([\d,]+(?:\.\d{1,2})?)\s*per\s+(bottle|glass|can|nip|jug|pint)\b/i);
      if (!cm) return;
      var nm = cm[1].replace(/\s+/g, " ").trim().replace(/^[>•\-\s]+/, "");
      if (nm.length < 2) return;
      pushUnique({ qty: null, name: nm, unitPrice: parseMoney(cm[2]),
        beoUnit: cm[3].toLowerCase(), kind: "consumption", source: "BEO" });
    });

    // Minimum / event spend: "1 @ $5,400.00 event spend"
    re = /\$([\d,]+(?:\.\d{1,2})?)\s*event spend/gi;
    while ((m = re.exec(soft)) !== null) {
      pushUnique({ qty: 1, name: "Minimum event spend", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", source: "BEO" });
    }

    // Security officer hours: "5 Security officer hours ... @ $75.00 per hour"
    re = /(\d+)\s+security officer hours?[\s\S]{0,120}?@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+hour/g;
    while ((m = re.exec(soft)) !== null) {
      var h = parseInt(m[1], 10), rate = parseMoney(m[2]);
      pushUnique({ qty: h, name: "Security officer hours", unitPrice: rate,
        lineTotal: round2(h * rate), kind: "non-menu", source: "BEO" });
    }

    // Attrition / minimum spend: "@ $5,460.00 per event"
    re = /attrition[\s\S]{0,80}?@\s*\$?([\d,]+(?:\.\d{1,2})?)\s*per\s+event/g;
    while ((m = re.exec(soft)) !== null) {
      pushUnique({ qty: 1, name: "Attrition to meet minimum spend", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", source: "BEO" });
    }

    // Audio visual quote: "... $3,589.65 per quote"
    re = /\$([\d,]+(?:\.\d{1,2})?)\s*per\s+quote/g;
    while ((m = re.exec(soft)) !== null) {
      pushUnique({ qty: 1, name: "Audio visual", unitPrice: parseMoney(m[1]),
        lineTotal: parseMoney(m[1]), kind: "non-menu", source: "BEO" });
    }

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
      guests: (function () { var m = t.match(/(\d+)\s+guests?\s*@/); return m ? parseInt(m[1], 10) : null; })()
    };
  }

  // ----------------------------------------------------------- price checking
  function checkItem(item, catalogue) {
    var result = {
      qty: item.qty, name: item.name, unitPrice: item.unitPrice, lineTotal: item.lineTotal,
      source: item.source, kind: item.kind || null, beoUnit: item.beoUnit || null,
      alternatingCourses: item.alternatingCourses || 0, status: "ok", notes: []
    };

    // Internal maths check (qty x unit price == line total) — only when we have both.
    if (item.lineTotal != null && item.unitPrice != null && item.qty != null) {
      var expectedTotal = round2(item.qty * item.unitPrice);
      if (Math.abs(expectedTotal - item.lineTotal) > 0.005) {
        result.status = "math-error";
        result.mathExpectedTotal = expectedTotal;
        result.notes.push("Line total should be " + money(expectedTotal) +
          " (" + item.qty + " × " + money(item.unitPrice) + "), but reads " + money(item.lineTotal) + ".");
      }
    }

    var per = item.beoUnit ? (" per " + item.beoUnit) : "";
    var match = findMatch(item.name, catalogue);
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
        if (result.menuNote) result.notes.push(result.menuNote);
        return result;
      }

      var base = match.item.price;
      var diff = round2(item.unitPrice - base);
      result.priceDiff = diff;
      result.priceImpact = (item.qty != null) ? round2(diff * item.qty) : null;

      if (match.item.composable && diff > 0.005) {
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
    } else if (looksNonMenu(item.name, catalogue) || item.kind === "non-menu") {
      if (result.status === "ok") result.status = "non-menu";
      result.priceStatus = "not-checked";
      result.notes.push("Not a menu item — confirm this charge manually (no menu price to check against).");
    } else {
      if (result.status === "ok") result.status = "unmatched";
      result.priceStatus = "no-match";
      result.notes.push("No menu match found — check the item name or add it to the price list.");
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

  function checkDocument(items, catalogue) {
    var checked = (items || []).map(function (it) { return checkItem(it, catalogue); });
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
    return { items: checked, summary: summary };
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
    parseBeo: parseBeo, parseBeoHeader: parseBeoHeader,
    checkItem: checkItem, checkDocument: checkDocument, reconcile: reconcile,
    money: money, unitLabel: unitLabel
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.BEOEngine = API;
})(typeof window !== "undefined" ? window : this);
