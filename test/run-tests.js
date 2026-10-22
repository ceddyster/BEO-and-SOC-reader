/* Tests for the charge-checking engine. Run: node test/run-tests.js */
"use strict";
var fs = require("fs");
var path = require("path");
var engine = require("../src/engine.js");
var catalogue = require("../src/prices.js");

var passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error("  ✗ FAIL: " + msg); }
}
function section(name) { console.log("\n" + name); }

// The real IGCC SOC table, as rows [Qty, Name, Price, Discounts, Total].
var socRows = [
  ["Food & Beverage"],
  ["Qty", "Name", "Price", "Discounts", "Total"],
  ["215", "Crown Reserve Package - 6 Hours", "$66.00", "", "$14,190.00"],
  ["215", "Dinner Buffet Menu One", "$90.00", "", "$19,350.00"],
  ["Additional Revenue"],
  ["Qty", "Name", "Price", "Discounts", "Total"],
  ["1", "Attrition to meet minimum spend", "$5,460.00", "", "$5,460.00"],
  ["1", "Audio visual supplied by Encore Event Technologies", "$3,589.65", "", "$3,589.65"],
  ["5", "Security officer hours - Saturday rate (2 x guards 17:30 - 22:30)", "$75.00", "", "$375.00"]
];

section("SOC parsing");
var socItems = engine.parseSocRows(socRows);
ok(socItems.length === 5, "parses 5 SOC line items (got " + socItems.length + ")");
var reserve = socItems.find(function (i) { return /crown reserve/i.test(i.name); });
ok(reserve && reserve.qty === 215 && reserve.unitPrice === 66 && reserve.lineTotal === 14190,
  "Crown Reserve row: qty 215, $66.00, total $14,190.00");
var buffet = socItems.find(function (i) { return /dinner buffet/i.test(i.name); });
ok(buffet && buffet.unitPrice === 90 && buffet.lineTotal === 19350,
  "Dinner Buffet row: $90.00, total $19,350.00");

section("Price checking (SOC)");
var report = engine.checkDocument(socItems, catalogue);
var rReserve = report.items.find(function (r) { return /crown reserve/i.test(r.name); });
ok(rReserve.priceStatus === "undercharged", "Crown Reserve 6hr flagged undercharged ($66 vs $70)");
ok(rReserve.expectedPrice === 70, "expected Crown Reserve 6hr price is $70");
ok(rReserve.priceDiff === -4, "per-person difference is -$4");
ok(rReserve.priceImpact === -860, "total impact is -$860 across 215 guests");
ok(rReserve.notes.join(" ").indexOf("5 Hour") !== -1,
  "note points out $66 matches the 5 Hour tier");

var rBuffet = report.items.find(function (r) { return /dinner buffet/i.test(r.name); });
ok(rBuffet.priceStatus === "correct", "Dinner Buffet Menu One priced correctly at $90");

var rAttr = report.items.find(function (r) { return /attrition/i.test(r.name); });
ok(rAttr.priceStatus === "not-checked", "Attrition treated as non-menu (not price-checked)");
var rAv = report.items.find(function (r) { return /audio visual/i.test(r.name); });
ok(rAv.priceStatus === "not-checked", "AV treated as non-menu");
var rSec = report.items.find(function (r) { return /security/i.test(r.name); });
ok(rSec.priceStatus === "not-checked", "Security treated as non-menu");

ok(report.summary.undercharged === 1, "summary: 1 undercharged");
ok(report.summary.overcharged === 0, "summary: 0 overcharged");
ok(report.summary.mathErrors === 0, "summary: 0 math errors");
ok(report.summary.correct === 1, "summary: 1 correct");
ok(report.summary.chargedTotal === 42964.65,
  "summary: charged total $42,964.65 (got " + report.summary.chargedTotal + ")");

section("Summary totals: undercharged/overcharged dollar amounts & variance");
// One undercharge (80 × ($11−$8) = $240) and one overcharge (10 × ($90−$62) = $280).
var totDoc = engine.checkDocument(engine.parseBeo(
  "Menu\n08:00 - 09:00 Arrival\nArrival Tea and Coffee\n80 guests @ $8.00 per person\n" +
  "12:00 - 13:00 Lunch\nLunch Buffet Menu One\nGarden salad\n10 guests @ $90.00 per person\n",
  catalogue), catalogue).summary;
ok(totDoc.underchargedAmount === 240, "total undercharged = $240 (got " + totDoc.underchargedAmount + ")");
ok(totDoc.overchargedAmount === 280, "total overcharged = $280 (got " + totDoc.overchargedAmount + ")");
ok(totDoc.variance === 40, "variance = charged − expected = overcharged − undercharged = $40 (got " + totDoc.variance + ")");
ok(totDoc.variance === engine.round2(totDoc.overchargedAmount - totDoc.underchargedAmount), "variance reconciles with over − under amounts");

section("Math-error detection");
var badRows = [["10", "Dinner Buffet Menu One", "$90.00", "", "$950.00"]];
var badReport = engine.checkDocument(engine.parseSocRows(badRows), catalogue);
ok(badReport.items[0].status === "math-error", "detects 10 x $90 != $950");

section("Overcharge detection");
var overRows = [["100", "Lunch Buffet Menu One", "$70.00", "", "$7,000.00"]];
var overReport = engine.checkDocument(engine.parseSocRows(overRows), catalogue);
ok(overReport.items[0].priceStatus === "overcharged", "Lunch Buffet One $70 vs $62 flagged overcharged");
ok(overReport.items[0].priceImpact === 800, "overcharge impact +$800 across 100");

section("BEO parsing");
var beoText = fs.readFileSync(path.join(__dirname, "fixtures", "igcc_beo.txt"), "utf8");
var beoItems = engine.parseBeo(beoText, catalogue);
var bBuffet = beoItems.find(function (i) { return /dinner buffet menu one/i.test(i.name); });
ok(bBuffet && bBuffet.qty === 215 && bBuffet.unitPrice === 90, "BEO: Dinner Buffet Menu One 215 @ $90");
var bReserve = beoItems.find(function (i) { return /crown reserve/i.test(i.name); });
ok(bReserve && bReserve.qty === 215 && bReserve.unitPrice === 66, "BEO: Crown Reserve 6hr 215 @ $66");
var bSec = beoItems.find(function (i) { return /security/i.test(i.name); });
ok(bSec && bSec.qty === 5 && bSec.unitPrice === 75, "BEO: Security 5 hrs @ $75");
var bAttr = beoItems.find(function (i) { return /attrition/i.test(i.name); });
ok(bAttr && bAttr.unitPrice === 5460, "BEO: Attrition $5,460");
var bAv = beoItems.find(function (i) { return /audio visual/i.test(i.name); });
ok(bAv && bAv.unitPrice === 3589.65, "BEO: AV $3,589.65");

var beoHeader = engine.parseBeoHeader(beoText);
ok(beoHeader.beoNumber === "55754", "BEO header: number 55754");
ok(/Italian Golf/i.test(beoHeader.bookingName), "BEO header: booking name captured");

section("BEO vs SOC reconciliation");
var rec = engine.reconcile(beoItems, socItems);
var recReserve = rec.rows.find(function (r) { return r.beo && /crown reserve/i.test(r.beo.name); });
ok(recReserve && recReserve.status === "match", "BEO and SOC agree on Crown Reserve line");
var recBuffet = rec.rows.find(function (r) { return r.beo && /dinner buffet/i.test(r.beo.name); });
ok(recBuffet && recBuffet.status === "match", "BEO and SOC agree on Dinner Buffet line");

// Disagreement case: SOC price changed.
var socAltered = JSON.parse(JSON.stringify(socItems));
socAltered.find(function (i) { return /crown reserve/i.test(i.name); }).unitPrice = 70;
var rec2 = engine.reconcile(beoItems, socAltered);
var m2 = rec2.rows.find(function (r) { return r.beo && /crown reserve/i.test(r.beo.name); });
ok(m2 && m2.status === "mismatch", "reconcile flags a BEO/SOC price disagreement");

section("Set / plated dinner menu (BEO #56002, alternating service)");
var beo2 = fs.readFileSync(path.join(__dirname, "fixtures", "shvfrs_beo.txt"), "utf8");
var beo2Items = engine.parseBeo(beo2, catalogue);

var setMenu = beo2Items.find(function (i) { return /set menu/i.test(i.name); });
ok(setMenu && setMenu.qty === 64 && setMenu.unitPrice === 125, "parses Dinner Set Menu Two 64 @ $125");
ok(setMenu && setMenu.alternatingCourses === 2, "detects 2 alternating courses (got " + (setMenu && setMenu.alternatingCourses) + ")");

var rep2 = engine.checkDocument(beo2Items, catalogue);
var rSet = rep2.items.find(function (r) { return /set menu/i.test(r.name); });
ok(rSet.matchedName === "Plated Dinner Menu Two", "Set Menu Two matched to Plated Dinner Menu Two");
ok(rSet.priceStatus === "correct", "$125 validated correct ($105 base + 2 × $10 alternating)");
ok(rSet.notes.join(" ").indexOf("alternating") !== -1, "explanation mentions alternating service");

section("On-consumption beverage checks");
var rBrut = rep2.items.find(function (r) { return /sparkling brut/i.test(r.name); });
ok(rBrut && rBrut.priceStatus === "correct", "Leeuwin Sparkling Brut $75/bottle correct");
var rHeineken = rep2.items.find(function (r) { return /heineken zero/i.test(r.name); });
ok(rHeineken && rHeineken.priceStatus === "undercharged", "Heineken Zero $12.00 flagged (menu $12.50)");
ok(rHeineken && rHeineken.priceDiff === -0.5, "Heineken Zero under by $0.50");
var rKetel = rep2.items.find(function (r) { return /ketel one/i.test(r.name); });
ok(rKetel && rKetel.priceStatus === "correct", "Ketel One $15.50/glass correct (matched to Ketel One Vodka)");
var rSpend = rep2.items.find(function (r) { return /event spend/i.test(r.name); });
ok(rSpend && rSpend.priceStatus === "not-checked", "minimum event spend treated as non-menu");
var rSec2 = rep2.items.find(function (r) { return /security/i.test(r.name); });
ok(rSec2 && rSec2.qty === 6 && rSec2.priceStatus === "correct" && rSec2.expectedPrice === 75,
  "Security 6 hrs @ $75 correct via the line's own 'Saturday rate' label (no event date needed)");

section("Set menu on a SOC (no alternating info) → review, not false overcharge");
var socSet = engine.parseSocRows([["64", "Dinner Set Menu Two", "$125.00", "", "$8,000.00"]]);
var repSocSet = engine.checkDocument(socSet, catalogue);
ok(repSocSet.items[0].priceStatus === "review", "SOC set menu $125 marked review (not overcharged)");
ok(repSocSet.items[0].notes.join(" ").indexOf("alternating") !== -1, "review note explains the $20 as alternating courses");

section("Regression: undercharge below base is still caught");
var under = engine.checkDocument(engine.parseSocRows([["50", "Dinner Set Menu Two", "$100.00", "", "$5,000.00"]]), catalogue);
ok(under.items[0].priceStatus === "undercharged", "$100 below base $105 flagged undercharged");

section("BEO wording maps to the right price-book page");
[
  ["Coffee Break Menu Two", "Coffee Break Two", 37],
  ["Coffee Break Menu Three", "Coffee Break Three", 55],
  ["Crown Reserve Beverage Package - 6 Hours", "Crown Reserve Package - 6 Hour", 70],
  ["Cocktail Package - 3 Hours", "Cocktail Reception Three Hour", 75],
  ["Working Lunch Menu One", "Working Lunch Menu One", 44],
  ["Plated Breakfast Menu One", "Plated Breakfast Menu One", 56]
].forEach(function (c) {
  var mm = engine.findMatch(c[0], catalogue);
  ok(mm && mm.item.name === c[1] && mm.item.price === c[2],
    "\"" + c[0] + "\" -> " + c[1] + " ($" + c[2] + ")");
});

section("Coffee Break Two price + inclusions note");
var cb = engine.checkDocument(engine.parseSocRows([["80", "Coffee Break Menu Two", "$37.00", "", "$2,960.00"]]), catalogue);
ok(cb.items[0].priceStatus === "correct", "Coffee Break Menu Two @ $37 correct");
ok(cb.items[0].notes.join(" ").toLowerCase().indexOf("two items") !== -1, "shows 'select two items' inclusions note");
var cbOver = engine.checkDocument(engine.parseSocRows([["80", "Coffee Break Menu Two", "$40.00", "", "$3,200.00"]]), catalogue);
ok(cbOver.items[0].priceStatus === "overcharged", "Coffee Break Two @ $40 flagged overcharged");

section("Coffee break recognised from BEO wording/line layout");
var cbBeo = engine.parseBeo("Catering\nCoffee Break Menu Two\nSelect two items\n80 guests @ $37.00 per person\n", catalogue);
var cbItem = engine.checkDocument(cbBeo, catalogue).items[0];
ok(cbItem && cbItem.matchedName === "Coffee Break Two" && cbItem.priceStatus === "correct",
  "BEO 'Coffee Break Menu Two' line matched and priced");

section("Day Delegate (variable price) → confirm, not a false flag");
var dd = engine.checkDocument(engine.parseSocRows([["100", "Day Delegate Package One", "$75.00", "", "$7,500.00"]]), catalogue);
ok(dd.items[0].matchedName === "Day Delegate Package One", "Day Delegate Package One matched");
ok(dd.items[0].priceStatus === "review", "Day Delegate flagged as confirm (price varies)");
ok(dd.items[0].notes.join(" ").toLowerCase().indexOf("varies") !== -1, "note says price varies");

section("Cocktail reception priced by canapé count (BEO wording)");
var cocktailBeo = "18:00 - 18:30 Pre-Event Drinks\nCrown Ballroom Foyer\nCustom Cocktail Reception - 30 minutes\n6 canapes served per person\nCOLD CANAPES\nCured salmon, nashi pear, Pemberton lime\nGoat cheese tartlet, pistachio, strawberry\nHOT CANAPES\nWA lobster spring rolls, sweet chilli sauce\nMargaret River wagyu beef sirloin, country bread\n700 guests @ $58.00 per person\n";
var ckItems = engine.parseBeo(cocktailBeo, catalogue);
var ck = engine.checkDocument(ckItems, catalogue).items.find(function (r) { return /canap/i.test(r.name) || /cocktail/i.test(r.name); });
ok(ck && ck.matchedName === "Cocktail Reception Two Hour", "6 canapés mapped to Cocktail Reception Two Hour");
ok(ck && ck.priceStatus === "correct", "6 canapés @ $58 validated correct");
ok(engine.findMatch("Cocktail Reception 10 Canapes", catalogue).item.price === 75, "10 canapés -> $75 tier");

section("Generic course headings no longer mis-match Children's menu");
ok(engine.findMatch("MAIN COURSE", catalogue) === null, "'MAIN COURSE' does not match any item");
ok(engine.findMatch("ENTREE", catalogue) === null, "'ENTREE' does not match any item");
ok(engine.findMatch("Children's Main Course", catalogue).item.name === "Children's Main Course", "real children's main course still matches");

section("Custom / bespoke set menu → confirm, not a false overcharge");
var customBeo = "Crown Ballroom\nCustom Dinner Set Menu\nAssorted bread rolls and PEPE SAYA butter\nENTREE\nSquid, Hokkaido scallop, furikake, finger lime\nMAIN COURSE\nMargaret River beef, potato\nDESSERT\nChocolate delice\n700 guests @ $167.00 per person\n";
var customItems = engine.parseBeo(customBeo, catalogue);
var cu = engine.checkDocument(customItems, catalogue).items[0];
ok(cu && /custom/i.test(cu.name), "custom set menu captured by name (got: " + (cu && cu.name) + ")");
ok(cu && cu.priceStatus === "review" && cu.status !== "overcharged", "custom set menu flagged review, not overcharged");
ok(!customItems.some(function (x) { return /children/i.test(x.name); }), "no spurious children's line produced");

section("Coffee break: real heading wins over a nearby 'Break 1' setup line");
ok(engine.findMatch("Break 1", catalogue) === null, "'Break 1' alone does not match a coffee break");
ok(engine.findMatch("Catering Break 1", catalogue) === null, "'Catering Break 1' does not match a coffee break");
// Two-column interleaving: the real heading sits above a block of setup lines
// that includes "Break 1", then the price.
var breakBeo = "20:00 - 20:20 VIP Catering Break 2\nCoffee Break Menu Two\nAssorted cookies\nSWEET ITEMS\nScones, strawberry preserve, whipped cream\nSAVOURY ITEMS\nSerrano ham, Manchego cheese, caramelised onion toastie\nFreshly brewed coffee and selection of teas\nROOM SET UP\nPlease refer to floorplan on file\n10 Cocktail tables - White Marble\nClusters of glasses set per table\nBottles of soft drink PRESET in ice buckets for Catering\nBreak 1\nCanapes to be PRESET on station at rear of room\n35 guests @ $37.00 per person\n";
var brkItems = engine.parseBeo(breakBeo, catalogue);
var brk = engine.checkDocument(brkItems, catalogue).items.find(function (r) { return r.qty === 35; });
ok(brk && brk.matchedName === "Coffee Break Two", "35 @ $37 matched to Coffee Break Two, not 'Break 1' (got: " + (brk && brk.matchedName) + ")");
ok(brk && brk.priceStatus === "correct", "Coffee Break Menu Two @ $37 is correct, not overcharged");

section("Section-aware matching: Menu vs Beverage");
// Every catalogue item is tagged food or beverage.
ok(catalogue.items.every(function (i) { return i.group === "food" || i.group === "beverage"; }),
  "every price-book item is tagged food or beverage");
ok(catalogue.items.filter(function (i) { return i.category === "Beverage Package"; })[0].group === "beverage",
  "Beverage Package tagged beverage");
ok(catalogue.items.filter(function (i) { return /^Wine/.test(i.category); })[0].group === "beverage",
  "Wine tagged beverage");
ok(catalogue.items.filter(function (i) { return i.category === "Dinner Buffet"; })[0].group === "food",
  "Dinner Buffet tagged food");

// A per-person charge under the BEO "Beverage" header is checked against beverages.
var secBeo = "Menu\n18:30 - 22:00 Dinner Buffet\nDinner Buffet Menu One\nAssorted bread rolls\n215 guests @ $90.00 per person\nBeverage\n18:30 - 22:00 Dinner Buffet\nCrown Reserve Package - 6 Hours\nWoodbrook Vineyards NV Brut Cuvee\n215 guests @ $66.00 per person\n";
var secItems = engine.parseBeo(secBeo, catalogue);
var food = secItems.find(function (x) { return x.qty === 215 && /dinner buffet/i.test(x.name); });
var bev = secItems.find(function (x) { return x.qty === 215 && /crown reserve/i.test(x.name); });
ok(food && food.group === "food", "Dinner Buffet line tagged as a Menu (food) item");
ok(bev && bev.group === "beverage", "Crown Reserve line tagged as a Beverage item");
var secReport = engine.checkDocument(secItems, catalogue);
ok(secReport.items.find(function (r) { return /dinner buffet/i.test(r.name); }).category === "Dinner Buffet",
  "food line checked against Dinner Buffet");
ok(secReport.items.find(function (r) { return /crown reserve/i.test(r.name); }).category === "Beverage Package",
  "beverage line checked against Beverage Package");

section("Beverage package add-ons (extra wines / beers)");
function bevBEO(pkgLine, drinks, price) {
  return "Beverage\n18:00 - 20:00 Dinner\n" + pkgLine + "\n" + drinks.join("\n") +
    "\nAssorted soft drinks and orange juice\n100 guests @ $" + price + " per person\n";
}
// Crown Deluxe 2hr ($65) + a 2nd wine (+$10) + an extra beer (+$4.50) = $79.50.
var deluxe = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Deluxe Package - 2 Hours",
  ["Veuve Tailhan Blanc de Blancs Brut NV", "Vasse Felix Filius Sauvignon Blanc Semillon",
   "Vasse Felix Filius Chardonnay", "Vasse Felix Filius Shiraz",
   "Corona", "Hahn Premium Light", "Hahn Super Dry 3.5", "Heineken Zero", "Little Creatures Pale Ale"],
  "79.50"), catalogue), catalogue).items[0];
ok(deluxe.matchedName === "Crown Deluxe Package - 2 Hour", "matched Crown Deluxe 2 Hour");
ok(deluxe.priceStatus === "correct", "Deluxe $79.50 correct with add-ons (got " + deluxe.priceStatus + ")");
ok(deluxe.notes.join(" ").indexOf("1 extra wine") !== -1 && deluxe.notes.join(" ").indexOf("1 extra beer") !== -1,
  "breakdown shows 1 extra wine and 1 extra beer");

// Crown Reserve with BOTH Hahns (standard inclusions, not an OR) → no extra beer.
var resBothHahn = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Corona", "Hahn Super Dry 3.5", "Hahn Premium Light", "Heineken Zero"], "62.00"), catalogue), catalogue).items[0];
ok(resBothHahn.priceStatus === "correct",
  "Crown Reserve with both Hahns @ $62 is correct (both Hahns included, not an extra)");

// Crown Reserve 4hr standard, no extras, $62 → correct.
var resStd = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Corona", "Hahn Super Dry 3.5", "Heineken Zero"], "62.00"), catalogue), catalogue).items[0];
ok(resStd.priceStatus === "correct", "Crown Reserve 4hr standard @ $62 correct");

// Crown Reserve 4hr with an extra beer billed at $66.50 → correct with add-on.
var resAdd = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Corona", "Hahn Super Dry 3.5", "Heineken Zero", "Peroni"], "66.50"), catalogue), catalogue).items[0];
ok(resAdd.priceStatus === "correct", "Crown Reserve 4hr + 1 beer @ $66.50 correct");

// WA Premium 2hr ($85) + a second white (WA Premium selection, +$15) = $100.
var waExtra = engine.checkDocument(engine.parseBeo(bevBEO(
  "WA Premium Package - 2 Hours",
  ["Leeuwin Estate Sparkling Brut", "Leeuwin Estate Art Series Sauvignon Blanc",
   "Leeuwin Estate Prelude Vineyards Chardonnay", "Leeuwin Estate Art Series Shiraz",
   "Corona", "Little Creatures Pale Ale", "Rogers Amber Ale", "Heineken",
   "Hahn Super Dry 3.5", "Hahn Premium Light", "Heineken Zero"], "100.00"), catalogue), catalogue).items[0];
ok(waExtra.matchedName === "WA Premium Package - 2 Hour", "matched WA Premium 2 Hour");
ok(waExtra.priceStatus === "correct", "WA Premium + 2nd white @ $100 correct");
ok(waExtra.notes.join(" ").indexOf("+$15.00pp") !== -1, "extra WA Premium wine priced at $15pp");

// Crown Reserve 4hr ($62) + a Crown Deluxe wine (+$10) = $72 — needs the Reserve
// base wines to be recognised so the added wine counts as the second.
var resWine = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Vasse Felix Filius Chardonnay", "Corona", "Hahn Super Dry 3.5", "Hahn Premium Light", "Heineken Zero"],
  "72.00"), catalogue), catalogue).items[0];
ok(resWine.priceStatus === "correct", "Crown Reserve + 1 Deluxe wine @ $72 correct");
ok(resWine.notes.join(" ").indexOf("1 extra wine (+$10.00pp)") !== -1, "extra Deluxe wine priced at $10pp");

// A wine that isn't a package selection (general wine-list wine) → flag to check.
var otherWine = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Shaw and Smith M3 Chardonnay", "Corona", "Hahn Super Dry 3.5", "Hahn Premium Light", "Heineken Zero"],
  "72.00"), catalogue), catalogue).items[0];
ok(otherWine.priceStatus === "review", "non-package wine flags the package to check");
ok(otherWine.notes.join(" ").indexOf("Shaw and Smith M3 Chardonnay") !== -1, "flag names the wine");
ok(catalogue.packageSurcharges.extraWine.reserve === undefined, "Reserve wines are not a priced add-on option");

// Same extra beer but billed at base $62 (add-on not charged) → review.
var resMiss = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Corona", "Hahn Super Dry 3.5", "Heineken Zero", "Peroni"], "62.00"), catalogue), catalogue).items[0];
ok(resMiss.priceStatus === "review", "extra beer not billed -> review");
ok(resMiss.notes.join(" ").indexOf("66.50") !== -1, "review note shows expected $66.50");

section("Plated breakfast selection rules");
function bfBEO(menuLine, bakery, cont, pan, price) {
  return "Menu\n07:00 - 08:00 Breakfast\n" + menuLine + "\nFROM THE BAKERY\n" + bakery.join("\n") +
    "\nCONTINENTAL SELECTION\n" + cont + "\nFROM THE PAN\n" + pan + "\n50 guests @ $" + price + " per person\n";
}
// Menu One: 1 bakery + 1 continental + 1 pan @ $56 → correct.
var bf1 = engine.checkDocument(engine.parseBeo(bfBEO("Plated Breakfast Menu One",
  ["Mini butter croissants, continental Danish pastries"], "Seasonal fresh fruit platter",
  "Eggs benedict, Black Forest ham, wilted spinach, English muffin, chicken chipolata, hollandaise",
  "56.00"), catalogue), catalogue).items[0];
ok(bf1.matchedName === "Plated Breakfast Menu One", "matched Plated Breakfast Menu One");
ok(bf1.priceStatus === "correct", "Menu One 1/1/1 @ $56 correct (got " + bf1.priceStatus + ")");

// Menu One with BOTH bakery items → exceeds the 1 allowed → review.
var bf1x = engine.checkDocument(engine.parseBeo(bfBEO("Plated Breakfast Menu One",
  ["Mini butter croissants, continental Danish pastries", "Assorted petite muffins"],
  "Seasonal fresh fruit platter", "Eggs benedict, Black Forest ham, hollandaise", "56.00"),
  catalogue), catalogue).items[0];
ok(bf1x.priceStatus === "review", "Menu One with 2 bakery items flagged to check");
ok(bf1x.notes.join(" ").indexOf("bakery") !== -1, "flag names the bakery category");

// Menu Two with BOTH bakery items → allowed → correct.
var bf2 = engine.checkDocument(engine.parseBeo(bfBEO("Plated Breakfast Menu Two",
  ["Mini butter croissants, continental Danish pastries", "Assorted petite muffins"],
  "Seasonal fresh fruit platter",
  "Scrambled eggs, grilled sourdough, bacon rasher, gourmet sausage, flat mushroom", "60.00"),
  catalogue), catalogue).items[0];
ok(bf2.matchedName === "Plated Breakfast Menu Two", "matched Plated Breakfast Menu Two");
ok(bf2.priceStatus === "correct", "Menu Two 2/1/1 @ $60 correct (both bakery allowed)");

// Menu Two but two pan items → exceeds 1 → review.
var bf2x = engine.checkDocument(engine.parseBeo(bfBEO("Plated Breakfast Menu Two",
  ["Mini butter croissants", "Assorted petite muffins"], "Seasonal fresh fruit platter",
  "Eggs benedict, hollandaise. Poached egg, potato rosti, smoked salmon", "60.00"),
  catalogue), catalogue).items[0];
ok(bf2x.priceStatus === "review", "Menu Two with 2 pan items flagged to check");

section("Coffee break selection count");
var cbTwoOk = engine.checkDocument(engine.parseBeo(
  "Menu\n20:00 - 20:20 VIP Catering Break\nCoffee Break Menu Two\nAssorted cookies\n~~~~~\nSWEET ITEMS\nSultana scones, strawberry preserve, whipped cream\n~~~~~\nSAVOURY ITEMS\nChicken curry pie, tomato relish\n35 guests @ $37.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbTwoOk.matchedName === "Coffee Break Two", "matched Coffee Break Two");
ok(cbTwoOk.priceStatus === "correct", "Coffee Break Two with 2 items @ $37 correct (got " + cbTwoOk.priceStatus + ")");

var cbTwoOver = engine.checkDocument(engine.parseBeo(
  "Menu\n20:00 - 20:20 Break\nCoffee Break Menu Two\nAssorted cookies\nSWEET ITEMS\nSultana scones\nCarrot cake\nSAVOURY ITEMS\nChicken curry pie\n35 guests @ $37.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbTwoOver.priceStatus === "review", "Coffee Break Two with 3 items flagged to check");

section("Coffee break tier is set by the item count, not the named tier");
// Four items under "Coffee Break Menu One" is really Coffee Break Three ($55);
// the $30 charge is undercharged. The item count tracks the price.
var cbFour = engine.checkDocument(engine.parseBeo(
  "Menu\n10:35 - 11:00 Morning Tea\nCoffee Break Menu One\nAssorted cookies\n~~~~~\n" +
  "SWEET ITEMS\nMini continental Danish pastries\nRaspberry and chocolate lamingtons, vanilla cream\n" +
  "SAVOURY ITEMS\nMini gourmet quiches\nGourmet finger sandwiches\n~~~~~\n" +
  "Freshly brewed coffee and selection of teas\n2 guests @ $30.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbFour.matchedName === "Coffee Break Three",
  "four items → Coffee Break Three despite 'Menu One' label (got " + cbFour.matchedName + ")");
ok(cbFour.priceStatus === "undercharged" && cbFour.expectedPrice === 55,
  "checked against $55 (Three), $30 undercharged (got " + cbFour.expectedPrice + "/" + cbFour.priceStatus + ")");
ok(cbFour.notes.join(" ").indexOf("by item count") !== -1, "note explains it was re-tiered by item count");
// A dish that wraps across two lines is one item, not two — so a genuine
// single-item Coffee Break One is not wrongly upgraded.
var cbWrap = engine.checkDocument(engine.parseBeo(
  "Menu\n14:45 - 15:15 Afternoon Tea\nCoffee Break Menu One\nAssorted cookies\n~~~~~\n" +
  "SAVOURY ITEMS\nRoasted pumpkin and sweet potato frittata,\ntomato salsa verde, basil pesto\n~~~~~\n" +
  "Freshly brewed coffee and selection of teas\n50 guests @ $30.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbWrap.matchedName === "Coffee Break One" && cbWrap.priceStatus === "correct",
  "a wrapped single dish stays Coffee Break One (got " + cbWrap.matchedName + "/" + cbWrap.priceStatus + ")");

// A dish that wraps WITHOUT a trailing comma (the continuation line starts
// lower-case) is still one item — "... toastie" / "on country bread".
var cbWrap2 = engine.checkDocument(engine.parseBeo(
  "Menu\n11:00 - 11:30 Morning Tea\nCoffee Break Menu One\nAssorted cookies\n~~~~~\n" +
  "SAVOURY ITEMS\nSerrano ham, Manchego cheese, caramelised onion toastie\non country bread\n~~~~~\n" +
  "Freshly brewed coffee and selection of teas\n1000 guests @ $29.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbWrap2.matchedName === "Coffee Break One" && cbWrap2.priceStatus === "undercharged" && cbWrap2.expectedPrice === 30,
  "a dish wrapping onto a lower-case line is one item → Coffee Break One $30 (got " +
  cbWrap2.matchedName + "/" + cbWrap2.expectedPrice + ")");

// When a coffee break spans a page break, the right-column program/setup/
// signature/page-footer content interleaves between the one chosen item and the
// charge; none of it should be counted as extra items.
var cbPage = engine.checkDocument(engine.parseBeo(
  "Menu\n10:00 - 10:30 Morning Tea\nCoffee Break Menu One\nAssorted cookies\n~~~~~\n" +
  "SWEET ITEMS\nRaspberry and chocolate lamingtons, vanilla cream\n~~~~~\n" +
  "Michaela Davies Date Maeve Cooney Date\n6100\nPhone: 61 8 9362 7574\nProgram\nPROGRAM\n" +
  "0600 Client access\n0800 Meeting commences\nSERVICE NOTES:\nSetup\nROOM SET UP\n" +
  "24 Banquet chairs\nEVENT ORDER\nBEO#: 56051\nPage: 2 of 2\nCreated: 16-Oct-26 09:16\n" +
  "Freshly brewed coffee and selection of teas\n~~~~~\n* Denotes vegetarian dish\n~~~~~\n" +
  "24 guests @ $30.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbPage.matchedName === "Coffee Break One" && cbPage.priceStatus === "correct",
  "page-break right-column junk isn't counted → Coffee Break One $30 correct (got " +
  cbPage.matchedName + "/" + cbPage.priceStatus + ")");

// A two-item Coffee Break Two across a page break, with the right-column text
// grouped as the browser tends to (the "Name Date" sign-off SPLIT across two
// lines, program times, an "@ … per cart" charge, digit-led setup lines). Only
// the two real items (one sweet, one savoury) should be counted.
var cbPage2 = engine.checkDocument(engine.parseBeo(
  "Menu\n11:30 - 12:00 Morning Tea\nCoffee Break Menu Two\nAssorted cookies\n~~~~~\n" +
  "SWEET ITEMS\nBlueberry lemon cake, chia crumble\n~~~~~\nSAVOURY ITEMS\nMini gourmet quiches\n- Lorraine\n" +
  "Veronica Twynham Date\nMolly Coogan Date\n6100\nPhone: 61 8 9362 7574\n" +
  "0830 BARISTA COFFEE CART opens\n08:30 - 15:30 Barista Coffee Cart\n1 Coffee Cart - Crown @ $640.00 per cart\n" +
  "2 Conference table - brown\nROOM SET UP\nEVENT ORDER\nBEO#: 55704\nPage: 2 of 4\n- Florentine\n~~~~~\n" +
  "Freshly brewed coffee and selection of teas\n~~~~~\n145 guests @ $35.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbPage2.matchedName === "Coffee Break Two" && cbPage2.priceStatus === "undercharged" && cbPage2.expectedPrice === 37,
  "two items across a page break stay Coffee Break Two $37 (got " +
  cbPage2.matchedName + "/" + cbPage2.expectedPrice + "/" + cbPage2.priceStatus + ")");

section("Tea and Coffee priced by duration");
var tc4 = engine.checkDocument(engine.parseBeo(
  "Menu\n08:00 - 12:00 Tea and Coffee\nTea and Coffee\nFreshly brewed coffee and selection of teas\n50 guests @ $22.00 per person\n",
  catalogue), catalogue).items[0];
ok(tc4 && tc4.priceStatus === "correct", "Tea & Coffee 4 hrs @ $22 correct (got " + (tc4 && tc4.priceStatus) + ")");
var tc8 = engine.checkDocument(engine.parseBeo(
  "Menu\n08:00 - 16:00 Tea and Coffee\nTea and Coffee\nFreshly brewed coffee and selection of teas\n50 guests @ $28.00 per person\n",
  catalogue), catalogue).items[0];
ok(tc8 && tc8.priceStatus === "correct", "Tea & Coffee 8 hrs @ $28 correct");
var tc9 = engine.checkDocument(engine.parseBeo(
  "Menu\n08:00 - 17:00 Tea and Coffee\nTea and Coffee\n50 guests @ $28.00 per person\n",
  catalogue), catalogue).items[0];
ok(tc9 && tc9.priceStatus === "review", "Tea & Coffee 9 hrs (over 8-hr max) flagged to check");
var tc8b = engine.checkDocument(engine.parseBeo(
  "Menu\n08:00 - 15:00 Tea and Coffee\nTea and Coffee\n50 guests @ $22.00 per person\n",
  catalogue), catalogue).items[0];
ok(tc8b && tc8b.priceStatus === "undercharged", "Tea & Coffee 7 hrs charged $22 (should be $28) -> undercharged");
ok(tc8b && tc8b.expectedPrice === 28, "7 hrs expects $28");

section("Barista coffee cart hire (per cart; half/full day by run time)");
// Real wording: the cart HIRE sits in the Setup column as "N Coffee Cart … @ $X
// per cart". A 4-hour run is a half day ($495); more is a full day ($640).
var cartHalf = engine.checkDocument(engine.parseBeo(
  "Setup\n09:00 - 13:00 Barista Coffee Cart\nAstral 2\n2 Coffee Cart - Crown @ $495.00 per cart\n",
  catalogue), catalogue).items[0];
ok(cartHalf && /Half Day/.test(cartHalf.matchedName || cartHalf.name),
  "4-hour run → Half Day cart (got " + (cartHalf && cartHalf.matchedName) + ")");
ok(cartHalf && cartHalf.qty === 2, "reads 2 carts (got " + (cartHalf && cartHalf.qty) + ")");
ok(cartHalf && cartHalf.priceStatus === "correct", "2 × $495 = $990 correct (got " + (cartHalf && cartHalf.priceStatus) + ")");
// 8-hour run → full day $640; charged the half-day $495 → undercharged.
var cartFull = engine.checkDocument(engine.parseBeo(
  "Setup\n07:30 - 15:30 Barista Coffee Cart\nAstral 2\n1 Coffee Cart - Crown @ $495.00 per cart\n",
  catalogue), catalogue).items[0];
ok(cartFull && /Full Day/.test(cartFull.matchedName || cartFull.name) && cartFull.expectedPrice === 640,
  "8-hour run → Full Day $640 (got " + (cartFull && cartFull.matchedName) + "/" + (cartFull && cartFull.expectedPrice) + ")");
ok(cartFull && cartFull.priceStatus === "undercharged", "full-day cart charged $495 → undercharged (got " + (cartFull && cartFull.priceStatus) + ")");
// An 8-hour full-day cart charged correctly at $640.
var cartOk = engine.checkDocument(engine.parseBeo(
  "Setup\n07:30 - 15:30 Barista Coffee Cart\nAstral 2\n1 Coffee Cart - Crown @ $640.00 per cart\n",
  catalogue), catalogue).items[0];
ok(cartOk && cartOk.priceStatus === "correct", "full-day cart @ $640 correct (got " + (cartOk && cartOk.priceStatus) + ")");
// A Menu-side "Barista coffee charged on consumption / $X per person" line is an
// estimate, NOT the cart hire — it must not be parsed as a cart.
var cartCons = engine.checkDocument(engine.parseBeo(
  "Menu\n07:30 - 15:30 Barista Coffee Cart\nAstral 2\nBarista Coffee - 8 Hours\nBarista coffee charged on consumption\n" +
  "Please note that an estimated $5.00 per person spend has\n173 guests @ $5.00 per person\n",
  catalogue), catalogue).items;
ok(!cartCons.some(function (r) { return r.kind === "cart"; }),
  "a per-consumption barista line is not treated as a cart hire");

section("Christmas Buffet — seasonal validity (to 31 Dec 2026)");
ok(engine.parseEventDate("Saturday 10 Oct 2026") === "2026-10-10", "parses event date '10 Oct 2026'");
ok(engine.parseEventDate("Monday, 13 February 2027") === "2027-02-13", "parses event date '13 February 2027'");
function xmasBEO(dateLine, pkg, qty, price) {
  return "EVENT ORDER\nBEO#: 60001\n" + dateLine + "\nAccount: Test Co\nBooking Name: Xmas Party\nMenu\n18:00 - 20:00 Dinner\n" +
    pkg + "\nAssorted bread rolls and butter\n" + qty + " guests @ $" + price + " per person\n";
}
var xmasItems = engine.parseBeo(xmasBEO("Saturday 12 Dec 2026", "Christmas Buffet Menu One", 60, "90.00"), catalogue);
var xmasOk = engine.checkDocument(xmasItems, catalogue, "2026-12-12").items[0];
ok(xmasOk.matchedName === "Christmas Buffet Menu One", "matched Christmas Buffet Menu One");
ok(xmasOk.priceStatus === "correct", "Christmas Buffet in December is correct");

var xmasLate = engine.checkDocument(
  engine.parseBeo(xmasBEO("Saturday 13 Feb 2027", "Christmas Buffet Menu One", 60, "90.00"), catalogue),
  catalogue, "2027-02-13").items[0];
ok(xmasLate.priceStatus === "review", "Christmas Buffet after 31 Dec 2026 flagged to check");
ok(xmasLate.notes.join(" ").indexOf("31 Dec 2026") !== -1, "flag names the 31 Dec 2026 cut-off");

section("Minimum guests note + whole-event validity");
var belowMin = engine.checkDocument(
  engine.parseBeo(xmasBEO("Saturday 12 Dec 2026", "Christmas Buffet Menu One", 40, "90.00"), catalogue),
  catalogue, "2026-12-12").items[0];
ok(belowMin.notes.join(" ").indexOf("50-guest minimum") !== -1, "notes below the 50-guest minimum");

var outOfBook = engine.checkDocument(
  engine.parseBeo("Menu\n01:00 Dinner\nDinner Buffet Menu One\n60 guests @ $90.00 per person\n", catalogue),
  catalogue, "2027-08-01");
ok(outOfBook.summary.validityNote && outOfBook.summary.validityNote.indexOf("after this price book") !== -1,
  "event after 30 Jun 2027 raises a price-book validity note");

section("Buffet composition (dish counts per course)");
function buffetBEO(menuLine, dishes, qty, price) {
  return "Menu\n18:30 - 20:30 Dinner\n" + menuLine + "\nArtisan bread rolls and butter\n" +
    dishes.join("\n") + "\n" + qty + " guests @ $" + price + " per person\n";
}
// Menu One: exactly 3 cold / 3 hot / 1 pasta / 1 side / 2 dessert → correct.
var buOne = engine.checkDocument(engine.parseBeo(buffetBEO("Dinner Buffet Menu One", [
  "Tasmanian smoked salmon, capers, horseradish", "Fresh mozzarella, vine tomato, basil", "Thai beef salad, green papaya",
  "Butter chicken, cashew nuts, rice pilaf", "Lamb rogan josh, garam masala, rice", "Braised pork belly, potato, carrot",
  "Gnocchi, basil pesto, semi dried tomato",
  "Truffled mashed potato",
  "Layered opera gateaux", "Mango lassi chia pudding, saffron"
], 60, "90.00"), catalogue), catalogue).items[0];
ok(buOne.matchedName === "Dinner Buffet Menu One", "matched Dinner Buffet Menu One");
ok(buOne.priceStatus === "correct", "Menu One 3/3/1/1/2 @ $90 correct (got " + buOne.priceStatus + ")");
ok(buOne.notes.join(" ").indexOf("cold 3/3") !== -1, "shows the per-course counts");

// Menu One but 5 cold dishes selected → exceeds 3 → review (price still right).
var buOneX = engine.checkDocument(engine.parseBeo(buffetBEO("Dinner Buffet Menu One", [
  "Tasmanian smoked salmon, capers", "Fresh mozzarella, vine tomato", "Thai beef salad, green papaya",
  "Kachumber salad, onion, tomato", "Italian cold meat platter, prosciutto, salami",
  "Butter chicken, rice pilaf", "Lamb rogan josh, rice", "Braised pork belly, carrot",
  "Gnocchi, basil pesto", "Truffled mashed potato", "Layered opera gateaux", "Ras malai"
], 60, "90.00"), catalogue), catalogue).items[0];
ok(buOneX.priceStatus === "review", "Menu One with 5 cold dishes flagged to check (got " + buOneX.priceStatus + ")");
ok(buOneX.notes.join(" ").indexOf("cold") !== -1 && buOneX.notes.join(" ").indexOf("allows 3") !== -1,
  "flag names the cold course and the allowance");

// Menu Three allows 5 cold / 4 hot / 1 pasta / 2 side / 3 dessert → the same dishes are fine.
var buThree = engine.checkDocument(engine.parseBeo(buffetBEO("Dinner Buffet Menu Three", [
  "Tasmanian smoked salmon", "Fresh mozzarella, basil", "Thai beef salad", "Kachumber salad", "Italian cold meat platter",
  "Butter chicken", "Lamb rogan josh", "Braised pork belly", "Angus beef fillet, veal jus",
  "Gnocchi, basil pesto", "Truffled mashed potato", "Wok fried rice",
  "Layered opera gateaux", "Ras malai", "Seasonal fruit platter"
], 60, "120.00"), catalogue), catalogue).items[0];
ok(buThree.matchedName === "Dinner Buffet Menu Three", "matched Dinner Buffet Menu Three");
ok(buThree.priceStatus === "correct", "Menu Three 5/4/1/2/3 @ $120 correct (got " + buThree.priceStatus + ")");

// A bare buffet line with no dishes listed detects nothing → normal price check (correct).
var buBare = engine.checkDocument(engine.parseBeo(
  "Menu\n18:30 - 20:30 Dinner\nDinner Buffet Menu One\n60 guests @ $90.00 per person\n", catalogue),
  catalogue).items[0];
ok(buBare.priceStatus === "correct", "bare buffet line (no dishes) still prices correctly");
ok(buBare.notes.join(" ").indexOf("cold 3/3") === -1 && buBare.notes.join(" ").indexOf("selections OK") === -1,
  "no composition note when no dishes are listed");

// Christmas Buffet composition is checked too (festive dishes count).
var buXmas = engine.checkDocument(engine.parseBeo(
  "EVENT ORDER\nSaturday 12 Dec 2026\nMenu\n18:00 - 20:00 Dinner\nChristmas Buffet Menu One\n" +
  "Smoked salmon, watercress, radish\nSeafood salad, mango, tomato\nEndive, rocket, fig, pear salad\n" +
  "Marmalade glazed ham, burnt orange\nCharred lamb cutlets, white beans\nWa grass fed beef fillet, truffle jus\n" +
  "Porcini mushroom ravioli, parmesan cream\nKipfler potato, rosemary\nCherry pavlova, lemon curd\nBlack forest yule log\n" +
  "60 guests @ $90.00 per person\n", catalogue), catalogue, "2026-12-12").items[0];
ok(buXmas.matchedName === "Christmas Buffet Menu One", "matched Christmas Buffet Menu One");
ok(buXmas.priceStatus === "correct", "Christmas Buffet 3/3/1/1/2 @ $90 correct (got " + buXmas.priceStatus + ")");

section("Lunch Buffet Menu Three composition (custom build)");
function lunchBEO(dishes, price) {
  return "Menu\n12:00 - 13:00 Lunch\nLunch Buffet Menu Three\nAssorted bread and butter\n" +
    dishes.join("\n") + "\n40 guests @ $" + price + " per person\n";
}
// Menu Three allows sandwich 1 / cold savoury 1 / salad 1 / hot 3 / dessert 3.
var lu3 = engine.checkDocument(engine.parseBeo(lunchBEO([
  "Reuben - silverside beef, sauerkraut, ranch dressing",
  "Tasmanian smoked salmon, capers, horseradish",
  "Quinoa, asparagus, heirloom tomato, feta",
  "Lamb ragu, carrot, peas", "Barramundi, sea herbs, Livornese sauce", "Butter chicken, cashew nuts, rice pilaf",
  "Apple custard, hazelnut sponge", "Medjool date cake, salted caramel", "Seasonal fruit platter"
], "88.00"), catalogue), catalogue).items[0];
ok(lu3.matchedName === "Lunch Buffet Menu Three", "matched Lunch Buffet Menu Three");
ok(lu3.priceStatus === "correct", "Lunch Menu Three 1/1/1/3/3 @ $88 correct (got " + lu3.priceStatus + ")");
ok(lu3.notes.join(" ").indexOf("hot 3/3") !== -1, "shows the lunch per-course counts");

// Four hot dishes → exceeds 3 → review.
var lu3x = engine.checkDocument(engine.parseBeo(lunchBEO([
  "Reuben - silverside beef", "Tasmanian smoked salmon, capers", "Quinoa, asparagus, heirloom",
  "Lamb ragu, carrot", "Barramundi, sea herbs", "Butter chicken, rice pilaf", "Angus beef fillet, artichoke",
  "Apple custard, hazelnut sponge", "Medjool date cake", "Seasonal fruit platter"
], "88.00"), catalogue), catalogue).items[0];
ok(lu3x.priceStatus === "review", "Lunch Menu Three with 4 hot dishes flagged (got " + lu3x.priceStatus + ")");
ok(lu3x.notes.join(" ").indexOf("hot") !== -1 && lu3x.notes.join(" ").indexOf("allows 3") !== -1,
  "lunch flag names the hot course and allowance");

section("Indian Buffet composition");
function indianBEO(pkg, dishes, price) {
  return "Menu\n18:30 - 20:30 Dinner\n" + pkg + "\nPapad and pickles\n" + dishes.join("\n") +
    "\n60 guests @ $" + price + " per person\n";
}
// Package One: entrée 2 / salad 3 / meat-fish 2 / veg 2 / paneer 1 / dahl 1 / rice 1 / dessert 3 / bread 2.
var inOne = engine.checkDocument(engine.parseBeo(indianBEO("Indian Buffet Package One", [
  "Onion bhaji", "Vegetarian samosa",
  "Aloo chana chaat", "Cucumber mint raita", "Kachumbar salad",
  "Lamb rogan josh, red chillies", "Butter chicken, creamy tomato",
  "Dum aloo, spiced potatoes", "Dhingri matar, mushroom and pea curry",
  "Mattar paneer, peas, cottage cheese",
  "Dal makhani, kidney beans",
  "Jeera pilaf, cumin rice",
  "Gulab jamun", "Gajar halwa", "Ras malai",
  "Plain naan", "Garlic naan"
], "129.00"), catalogue), catalogue).items[0];
ok(inOne.matchedName === "Indian Buffet Package One", "matched Indian Buffet Package One");
ok(inOne.priceStatus === "correct", "Indian Package One full selection @ $129 correct (got " + inOne.priceStatus + ")");
ok(inOne.notes.join(" ").indexOf("meat/fish 2/2") !== -1, "shows the Indian per-course counts");

// Three meat/fish on Package One → exceeds 2 → review.
var inOneX = engine.checkDocument(engine.parseBeo(indianBEO("Indian Buffet Package One", [
  "Onion bhaji", "Vegetarian samosa", "Aloo chana chaat", "Cucumber mint raita", "Kachumbar salad",
  "Lamb rogan josh", "Butter chicken", "Chicken chettinad, roasted pepper",
  "Dum aloo", "Dhingri matar", "Mattar paneer", "Dal makhani", "Jeera pilaf",
  "Gulab jamun", "Gajar halwa", "Ras malai", "Plain naan", "Garlic naan"
], "129.00"), catalogue), catalogue).items[0];
ok(inOneX.priceStatus === "review", "Indian Package One with 3 meat/fish flagged (got " + inOneX.priceStatus + ")");
ok(inOneX.notes.join(" ").indexOf("meat/fish") !== -1 && inOneX.notes.join(" ").indexOf("allows 2") !== -1,
  "Indian flag names the meat/fish course and allowance");

section("Children's menu — one main + one dessert");
function childBEO(dishes, qty, price) {
  return "Menu\n18:30 Dinner\nChildren's Menu\n" + dishes.join("\n") + "\n" + qty + " children @ $" + price + " per person\n";
}
var ch1 = engine.checkDocument(engine.parseBeo(childBEO([
  "Mini beef sliders, cheddar cheese, French fries", "Ice cream sundae"
], 12, "30.00"), catalogue), catalogue).items[0];
ok(ch1.matchedName === "Children's Main Course", "matched Children's Main Course (got " + (ch1 && ch1.matchedName) + ")");
ok(ch1.priceStatus === "correct", "Children's 1 main + 1 dessert @ $30 correct (got " + ch1.priceStatus + ")");
ok(ch1.notes.join(" ").indexOf("main 1/1") !== -1, "shows main/dessert counts");

// Two mains selected → exceeds 1 → review.
var ch1x = engine.checkDocument(engine.parseBeo(childBEO([
  "Mini beef sliders, cheddar cheese", "Chicken nuggets, chips", "Ice cream sundae"
], 12, "30.00"), catalogue), catalogue).items[0];
ok(ch1x.priceStatus === "review", "Children's with 2 mains flagged to check (got " + ch1x.priceStatus + ")");
ok(ch1x.notes.join(" ").indexOf("main") !== -1 && ch1x.notes.join(" ").indexOf("allows 1") !== -1,
  "children flag names the main course and allowance");

section("Working Lunch sandwich/salad selection");
function workBEO(menuLine, dishes, price) {
  return "Menu\n12:00 - 13:00 Working Lunch\n" + menuLine + "\nFreshly brewed coffee and tea\n" +
    dishes.join("\n") + "\n40 guests @ $" + price + " per person\n";
}
// Menu One: 3 sandwiches + 1 salad → correct.
var wl1 = engine.checkDocument(engine.parseBeo(workBEO("Working Lunch Menu One", [
  "Chicken Caesar salad", "Tuna, celery, caper mayo, red onion", "Pastrami, Swiss cheese, truffle aioli",
  "Quinoa, asparagus, heirloom tomato, feta"
], "44.00"), catalogue), catalogue).items[0];
ok(wl1.matchedName === "Working Lunch Menu One", "matched Working Lunch Menu One");
ok(wl1.priceStatus === "correct", "Working Lunch Menu One 3 sandwiches + 1 salad @ $44 correct (got " + wl1.priceStatus + ")");
ok(wl1.notes.join(" ").indexOf("sandwich 3/3") !== -1, "shows the sandwich/salad counts");

// Menu One with 4 sandwiches → exceeds 3 → review.
var wl1x = engine.checkDocument(engine.parseBeo(workBEO("Working Lunch Menu One", [
  "Chicken Caesar salad", "Tuna, celery, caper mayo", "Pastrami, Swiss cheese", "Barbecue pulled pork, chipotle mayo",
  "Quinoa, asparagus, heirloom tomato"
], "44.00"), catalogue), catalogue).items[0];
ok(wl1x.priceStatus === "review", "Working Lunch Menu One with 4 sandwiches flagged (got " + wl1x.priceStatus + ")");
ok(wl1x.notes.join(" ").indexOf("sandwich") !== -1 && wl1x.notes.join(" ").indexOf("allows 3") !== -1,
  "working-lunch flag names the sandwich allowance");

// Menu Two: 4 sandwiches allowed → correct.
var wl2 = engine.checkDocument(engine.parseBeo(workBEO("Working Lunch Menu Two", [
  "Chicken Caesar salad", "Turkey, mango chutney, cucumber, mesclun", "Smoked salmon, horseradish cream, pickled onion",
  "Reuben - silverside beef, sauerkraut"
], "49.00"), catalogue), catalogue).items[0];
ok(wl2.matchedName === "Working Lunch Menu Two", "matched Working Lunch Menu Two");
ok(wl2.priceStatus === "correct", "Working Lunch Menu Two 4 sandwiches @ $49 correct (got " + wl2.priceStatus + ")");

section("Lunchbox — maximum two menu options");
function boxBEO(dishes, price) {
  return "Menu\n12:30 Lunch\nLunchbox Package\nBottled water or juice\n" + dishes.join("\n") +
    "\n50 guests @ $" + price + " per person\n";
}
// Two box options (Menu One + Menu Three) → correct.
var lb2 = engine.checkDocument(engine.parseBeo(boxBEO([
  "Pastrami, Swiss cheese, truffle aioli, gherkin, baguette", "Dark chocolate tart, truffle ganache, orange gel",
  "Prosciutto, salami, brie, mesclun, sourdough", "Carrot cake, honey roasted walnut, cream cheese frosting"
], "48.50"), catalogue), catalogue).items[0];
ok(lb2.matchedName === "Lunchbox Package", "matched Lunchbox Package (got " + (lb2 && lb2.matchedName) + ")");
ok(lb2.priceStatus === "correct", "Lunchbox with 2 options @ $48.50 correct (got " + lb2.priceStatus + ")");
ok(lb2.notes.join(" ").indexOf("Menu One") !== -1 && lb2.notes.join(" ").indexOf("Menu Three") !== -1,
  "names the detected box options");

// Three box options → exceeds the two-option maximum → review.
var lb3 = engine.checkDocument(engine.parseBeo(boxBEO([
  "Pastrami, Swiss cheese, truffle aioli, baguette", "Dark chocolate tart, truffle ganache",
  "Ras el hanout lamb loin, pearl couscous", "Cherry ripple cheese cake",
  "Prosciutto, salami, brie, mesclun, sourdough", "Carrot cake, honey roasted walnut"
], "48.50"), catalogue), catalogue).items[0];
ok(lb3.priceStatus === "review", "Lunchbox with 3 options flagged to check (got " + lb3.priceStatus + ")");
ok(lb3.notes.join(" ").indexOf("maximum of 2") !== -1, "lunchbox flag names the two-option maximum");

section("Plated Lunch (composable price + surcharges)");
// Three-course @ base price → correct.
var pl3 = engine.checkDocument(engine.parseBeo(
  "Menu\n12:00 Lunch\nPlated Lunch Menu One Three Course\nCured salmon, Waldorf salad\nChicken breast, potato pave\nBaked lemon tart\n40 guests @ $99.00 per person\n",
  catalogue), catalogue).items[0];
ok(pl3.matchedName === "Plated Lunch Menu One Three Course", "matched Plated Lunch Menu One Three Course");
ok(pl3.priceStatus === "correct", "Plated Lunch three-course @ $99 correct (got " + pl3.priceStatus + ")");
// Base + one alternating course (+$10) → correct via composable explain.
var plAlt = engine.checkDocument(engine.parseBeo(
  "Menu\n12:00 Lunch\nPlated Lunch Menu One Three Course\nChicken breast, potato pave alternating with Angus beef tenderloin\nBaked lemon tart\n40 guests @ $109.00 per person\n",
  catalogue), catalogue).items[0];
ok(plAlt.priceStatus === "correct", "Plated Lunch + 1 alternating course @ $109 explained correct (got " + plAlt.priceStatus + ")");

section("Day Delegate (price varies) + arrival coffee add-on");
var ddp1 = engine.checkDocument(engine.parseSocRows([["80", "Day Delegate Package One", "$95.00", "", "$7,600.00"]]), catalogue).items[0];
ok(ddp1.matchedName === "Day Delegate Package One", "matched Day Delegate Package One");
ok(ddp1.priceStatus === "review", "Day Delegate price flagged to confirm (varies by package)");
ok(ddp1.notes.join(" ").toLowerCase().indexOf("varies") !== -1, "note says the price varies");

var ddpMin = engine.checkDocument(engine.parseSocRows([["20", "Day Delegate Package Two", "$110.00", "", "$2,200.00"]]), catalogue).items[0];
ok(ddpMin.notes.join(" ").indexOf("30-guest minimum") !== -1, "flags below the 30-guest DDP minimum");

// Arrival coffee & tea with a Day Delegate package in the same document → the
// $8 add-on rate applies.
var ddpArr = engine.checkDocument(engine.parseSocRows([
  ["80", "Day Delegate Package One", "$95.00", "", "$7,600.00"],
  ["80", "Arrival Coffee and Tea", "$8.00", "", "$640.00"]
]), catalogue).items;
var arr = ddpArr.filter(function (r) { return /arrival/i.test(r.name); })[0];
ok(arr.matchedName === "Day Delegate Arrival Coffee and Tea", "DDP arrival matched the $8 add-on (got " + (arr && arr.matchedName) + ")");
ok(arr.expectedPrice === 8 && arr.priceStatus === "correct", "DDP arrival coffee & tea @ $8 correct (got " + (arr && arr.expectedPrice) + "/" + (arr && arr.priceStatus) + ")");

section("Arrival tea & coffee is $11 for non–Day Delegate events");
// No Day Delegate package in the document → the standalone $11 rate applies.
var arrStd = engine.checkDocument(engine.parseSocRows([["80", "Arrival Tea and Coffee", "$11.00", "", "$880.00"]]), catalogue).items[0];
ok(arrStd.matchedName === "Arrival Tea and Coffee" && arrStd.expectedPrice === 11,
  "non-DDP arrival priced at $11 (got " + (arrStd && arrStd.matchedName) + "/" + (arrStd && arrStd.expectedPrice) + ")");
ok(arrStd.priceStatus === "correct", "non-DDP arrival @ $11 correct (got " + (arrStd && arrStd.priceStatus) + ")");
// A non-DDP arrival charged the old $8 add-on rate is undercharged.
var arrUnder = engine.checkDocument(engine.parseSocRows([["80", "Arrival Tea and Coffee", "$8.00", "", "$640.00"]]), catalogue).items[0];
ok(arrUnder.expectedPrice === 11 && arrUnder.priceStatus === "undercharged" && arrUnder.priceImpact === -240,
  "non-DDP arrival @ $8 flagged undercharged vs $11, -$240 across 80 (got " + (arrUnder && arrUnder.priceStatus) + "/" + (arrUnder && arrUnder.priceImpact) + ")");

section("A banquet dessert dish never becomes the charge heading");
// A full Indian banquet runs well past the old 90-line heading window, so the
// "Seasonal fruit platter" dessert deep in the menu was matched to the $12.50
// Crew Fresh Fruit Platter and wrongly became the $129 charge's heading. The
// heading must come from "Indian Buffet Menu" at the top of the block instead.
var filler = [];
for (var fi = 0; fi < 95; fi++) filler.push("Menu dish line " + fi);
var indianBeo = "Package Quantity Per Person Price\nMenu\n" +
  "17:00 - 18:00 Children's Buffet\nYouth Menu\n18 guests @ $64.50 per person\n" +
  "18:00 - 22:00 Dinner Buffet\nIndian Buffet Menu\nPapadums, pickles\n" +
  filler.join("\n") + "\n~~~~~\nDESSERT\nGulab jamun\nSeasonal fruit platter\n" +
  "~~~~~\nFreshly brewed coffee and selection of teas\n209 guests @ $129.00 per person\n";
var indianItems = engine.checkDocument(engine.parseBeo(indianBeo, catalogue), catalogue).items;
var indianR = indianItems.filter(function (r) { return r.unitPrice === 129; })[0];
ok(indianR && indianR.matchedName === "Indian Buffet Package One",
  "$129 banquet → Indian Buffet Package One, not the fruit platter dessert (got " + (indianR && indianR.matchedName) + ")");
ok(indianR && indianR.expectedPrice === 129, "Indian Buffet Package One priced at $129 (got " + (indianR && indianR.expectedPrice) + ")");
ok(!indianItems.some(function (r) { return r.matchedName === "Crew Fresh Fruit Platter"; }),
  "no phantom Crew Fresh Fruit Platter charge from the dessert line");

section("Indian buffet tier is chosen by the dishes selected");
// Package Two: 3 entrées, 4 salads, 3 meat/fish, 3 veg → $150.
var indTwo = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n18:00 Dinner Buffet\nIndian Buffet Menu\n" +
  "Onion bhaji\nLamb curry puff\nVegetarian samosa\nKachumbar\nAloo chana chaat\nCucumber mint raita\nGrilled paneer salad\n" +
  "Butter chicken\nLamb rogan josh\nChicken chettinad\nDum aloo\nKadai subzi\nVegetable jalfrezi\n" +
  "Mattar paneer\nDal tadka\nJeera pilaf\nGulab jamun\nGarlic naan\nPlain paratha\n100 guests @ $150.00 per person\n",
  catalogue), catalogue).items[0];
ok(indTwo.matchedName === "Indian Buffet Package Two" && indTwo.expectedPrice === 150 && indTwo.priceStatus === "correct",
  "3 entrée / 4 salad / 3 meat-fish / 3 veg → Package Two $150 (got " + indTwo.matchedName + "/" + indTwo.expectedPrice + ")");
// Vegetarian option: no meat/fish, 4 veg → $126.
var indVeg = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n18:00 Dinner Buffet\nIndian Buffet Menu\n" +
  "Onion bhaji\nVegetarian samosa\nKachumbar\nAloo chana chaat\nCucumber mint raita\n" +
  "Dum aloo\nKadai subzi\nVegetable jalfrezi\nNavratan vegetable korma\nMattar paneer\nDal tadka\nJeera pilaf\n" +
  "Gulab jamun\nGarlic naan\nPlain paratha\n100 guests @ $126.00 per person\n",
  catalogue), catalogue).items[0];
ok(indVeg.matchedName === "Indian Buffet Vegetarian Option" && indVeg.expectedPrice === 126 && indVeg.priceStatus === "correct",
  "no meat/fish + 4 veg → Vegetarian Option $126 (got " + indVeg.matchedName + "/" + indVeg.expectedPrice + ")");
// Package One stays One even with one course over its limit (not a Two majority).
ok(indianR && indianR.matchedName === "Indian Buffet Package One",
  "a single over-limit course does not bump Package One to Two");

section("Youth / children's soft drink package → Children's beverages menu");
// "Youth Soft Drink Package - 5 Hours" is the $12.50 Children's beverages menu,
// not the adult $24 Soft Drink package the 5-hour tier would otherwise match.
var youthBev = engine.checkDocument(engine.parseSocRows([["18", "Youth Soft Drink Package - 5 Hours", "$12.50", "", "$225.00"]]), catalogue).items[0];
ok(youthBev.matchedName === "Children's Beverages" && youthBev.expectedPrice === 12.5,
  "youth soft drink package → Children's Beverages $12.50 (got " + youthBev.matchedName + "/" + youthBev.expectedPrice + ")");
ok(youthBev.priceStatus === "correct", "youth soft drink @ $12.50 correct (got " + youthBev.priceStatus + ")");
var adultBev = engine.checkDocument(engine.parseSocRows([["209", "Soft Drink Package - 5 Hours", "$24.00", "", "$5,016.00"]]), catalogue).items[0];
ok(adultBev.matchedName === "Soft Drink Only Package - 5 Hour" && adultBev.priceStatus === "correct",
  "adult soft drink package still matches the $24 adult 5-hour tier (got " + adultBev.matchedName + ")");

section("Crew Packages price checks");
var crewRows = [
  ["50", "Crew Set Menu Main Dinner", "$44.00", "", "$2,200.00"],
  ["50", "Crew Buffet Package", "$42.00", "", "$2,100.00"],
  ["50", "Crew Hot Breakfast Plate", "$31.00", "", "$1,550.00"]
];
var crew = engine.checkDocument(engine.parseSocRows(crewRows), catalogue);
ok(crew.items[0].priceStatus === "correct", "Crew Set Menu Main Dinner @ $44 correct");
ok(crew.items[1].priceStatus === "correct", "Crew Buffet Package @ $42 correct");
ok(crew.items[2].priceStatus === "correct", "Crew Hot Breakfast Plate @ $31 correct");

// Menu-wording alias + wrong price → overcharged.
var crewAlias = engine.checkDocument(engine.parseSocRows([["50", "Chef's selection of 2 course Dinner", "$70.00", "", "$3,500.00"]]), catalogue).items[0];
ok(crewAlias.matchedName === "Crew Set Menu Two Course Dinner", "menu-wording matched Crew Two Course Dinner (got " + (crewAlias && crewAlias.matchedName) + ")");
ok(crewAlias.priceStatus === "overcharged", "Crew two-course dinner billed $70 (should be $61) -> overcharged");

// Crew set menu lunch vs dinner picked by the service time on the BEO.
var crewDin = engine.checkDocument(engine.parseBeo(
  "Menu\n20:00 - 21:00 Crew Catering - AV Desk\nCrew Catering - Set Menu\nChef's selection of main course\n12 guests @ $44.00 per person\n",
  catalogue), catalogue).items[0];
ok(crewDin.matchedName === "Crew Set Menu Main Dinner" && crewDin.priceStatus === "correct",
  "crew main at 20:00 → Dinner rate $44 correct (got " + (crewDin && crewDin.matchedName) + ")");
var crewLun = engine.checkDocument(engine.parseBeo(
  "Menu\n12:00 - 13:00 Staff Lunch\nCrew Catering - Set Menu\nChef's selection of main course\n10 guests @ $39.00 per person\n",
  catalogue), catalogue).items[0];
ok(crewLun.matchedName === "Crew Set Menu Main Lunch" && crewLun.priceStatus === "correct",
  "crew main at 12:00 (Staff Lunch) → Lunch rate $39 correct (got " + (crewLun && crewLun.matchedName) + ")");

section("A beverage charge never borrows a food heading (no phantom line)");
// A non-standard-tier beverage package ("6.5 Hours") sits below a crew meal;
// its charge must not bleed up to the crew heading and double-count it.
var mixBeo = "Menu\n20:00 - 21:00 Crew Catering\nCrew Catering - Set Menu\nChef's selection of main course\n12 guests @ $44.00 per person\n" +
  "Beverage\n19:00 - 01:00 Dinner\nCrown Reserve Package - 6.5 Hours\nWoodbrook Vineyards NV Brut Cuvee\n707 guests @ $64.00 per person\n";
var mix = engine.checkDocument(engine.parseBeo(mixBeo, catalogue), catalogue).items;
ok(mix.filter(function (r) { return /main course/i.test(r.name); }).length === 1,
  "crew meal counted once, not twice");
var bevNS = mix.find(function (r) { return /6\.5 Hours/.test(r.name); });
ok(bevNS && bevNS.matchedName === "Crown Reserve Package - 6.5 Hours" && bevNS.priceStatus === "review",
  "non-standard 6.5-hour beverage package flagged to confirm (got " + (bevNS && bevNS.matchedName) + ")");
ok(!mix.some(function (r) { return /Crew Set Menu/.test(r.matchedName || "") && r.unitPrice === 64; }),
  "no phantom crew charge at $64");

section("A beverage package is found even when its heading is far above the charge");
// The package heading sits well above its charge — the included drinks are
// listed between them, then setup / table text and a page break interleave.
var farBev = "Beverage\n19:00 - 23:30 Dinner\nCrown Deluxe Package - 5.5 Hours\n" +
  "Veuve Tailhan Blanc de Blancs Brut NV\nVasse Felix Filius Sauvignon Blanc Semillon\nCorona\nHahn Premium Light\n" +
  "ROOM SET UP\nSet banquet style\n62 Banquet round - 6ft\n630 Banquet chairs\nLINEN\n63 Black linen tablecloths\n" +
  "TABLE ITEMS\nMenus supplied by Crown - Black\nCROWN BALLROOM STAGE SET UP\n2 Centre steps\n" +
  "Heineken Zero\nAssorted soft drinks and orange juice\n630 guests @ $79.50 per person\n";
var farBevR = engine.checkDocument(engine.parseBeo(farBev, catalogue), catalogue).items.find(function (r) { return /Deluxe/.test(r.name); });
ok(farBevR && farBevR.matchedName === "Crown Deluxe Package - 5.5 Hours",
  "far-above Crown Deluxe 5.5h package is identified (got " + (farBevR && farBevR.matchedName) + ")");
ok(farBevR && farBevR.expectedPrice === 82.5 && farBevR.priceStatus === "undercharged",
  "5.5h Deluxe priced at $82.50 (80 + 2.50), $79.50 undercharged (got " + (farBevR && farBevR.expectedPrice) + "/" + (farBevR && farBevR.priceStatus) + ")");

section("Beverage packages price half-hour increments (2–6 hrs)");
function bevHalf(name, charge) {
  return engine.checkDocument(engine.parseBeo(
    "Beverage\n19:00 - 00:00 Dinner\n" + name + "\n100 guests @ $" + charge + " per person\n",
    catalogue), catalogue).items[0];
}
var rHalf = bevHalf("Crown Reserve Package - 2.5 Hours", "56.00");
ok(rHalf.expectedPrice === 56 && rHalf.priceStatus === "correct",
  "Reserve 2.5h = 54 + 2 = $56 correct (got " + rHalf.expectedPrice + "/" + rHalf.priceStatus + ")");
var dHalf = bevHalf("Crown Deluxe Package - 2.5 Hours", "67.50");
ok(dHalf.expectedPrice === 67.5 && dHalf.priceStatus === "correct",
  "Deluxe 2.5h = 65 + 2.50 = $67.50 correct (got " + dHalf.expectedPrice + ")");
var wHalf = bevHalf("WA Premium Package - 2.5 Hours", "88.50");
ok(wHalf.expectedPrice === 88.5 && wHalf.priceStatus === "correct",
  "WA Premium 2.5h = 85 + 3.50 = $88.50 correct (got " + wHalf.expectedPrice + ")");
var rHalf45 = bevHalf("Crown Reserve Package - 4.5 Hours", "60.00");
ok(rHalf45.expectedPrice === 64 && rHalf45.priceStatus === "undercharged",
  "Reserve 4.5h = 62 + 2 = $64; $60 undercharged (got " + rHalf45.expectedPrice + "/" + rHalf45.priceStatus + ")");
var over = bevHalf("Crown Reserve Package - 6.5 Hours", "72.00");
ok(over.priceStatus === "review",
  "6.5h is outside the 2–6 hour range → review (got " + over.priceStatus + ")");
var under2 = bevHalf("Crown Deluxe Package - 1.5 Hours", "63.00");
ok(under2.priceStatus === "review",
  "1.5h is below the 2-hour minimum → review (got " + under2.priceStatus + ")");
// Duration written as "N Hours M minutes" (BEO CECP 10-15-2026) must fold the
// minutes in — "5 Hours 30 minutes" is 5.5 hrs, not read as the 5-hour tier.
var mins = bevHalf("Crown Deluxe Package - 5 Hours 30 minutes", "79.50");
ok(mins.matchedName === "Crown Deluxe Package - 5.5 Hours",
  "\"5 Hours 30 minutes\" read as 5.5 hours (got " + mins.matchedName + ")");
ok(mins.expectedPrice === 82.5 && mins.priceStatus === "undercharged",
  "Deluxe 5.5h = 80 + 2.50 = $82.50; $79.50 undercharged (got " + mins.expectedPrice + "/" + mins.priceStatus + ")");
var mins2 = bevHalf("Crown Reserve Package - 3 Hours 30 minutes", "60.00");
ok(mins2.matchedName === "Crown Reserve Package - 3.5 Hours" && mins2.expectedPrice === 60 && mins2.priceStatus === "correct",
  "Reserve \"3 Hours 30 minutes\" = 3.5h = 58 + 2 = $60 correct (got " + mins2.matchedName + "/" + mins2.expectedPrice + ")");

section("A dietary-requirement surcharge is checked at 25% of the meal price");
var dietItems = engine.checkDocument(engine.parseBeo(
  "Menu\n19:00 - 23:30 Dinner\nDinner Set Menu Two\n630 guests @ $105.00 per person\n" +
  "Dietary Requirement Surcharge\nAdditional dietary requirements above\nAbove the 10% allowance\n12 guests @ $26.25 per person\n",
  catalogue), catalogue).items;
var dietR = dietItems.find(function (r) { return r.name === "Dietary requirement surcharge"; });
ok(dietR, "dietary surcharge is identified, not left unmatched");
ok(dietR && dietR.expectedPrice === 26.25 && dietR.priceStatus === "correct",
  "25% of $105 = $26.25, charged $26.25 → correct (got " + (dietR && dietR.expectedPrice) + "/" + (dietR && dietR.priceStatus) + ")");
ok(dietR && /25% of Plated Dinner Menu Two/.test(dietR.matchedName || ""),
  "checked against 25% of the meal menu price");
// An incorrect surcharge is flagged.
var dietBad = engine.checkDocument(engine.parseBeo(
  "Menu\n19:00 - 23:30 Dinner\nDinner Set Menu Two\n630 guests @ $105.00 per person\n" +
  "Dietary Requirement Surcharge\nAbove the 10% allowance\n12 guests @ $30.00 per person\n",
  catalogue), catalogue).items.find(function (r) { return r.name === "Dietary requirement surcharge"; });
ok(dietBad && dietBad.priceStatus === "overcharged",
  "a $30 surcharge (should be $26.25) flagged overcharged (got " + (dietBad && dietBad.priceStatus) + ")");

section("A per-person charge reads the platter name above it");
// Crew platters are priced per platter ("each") yet the BEO bills them "per
// person"; the charge must still match the platter named two lines above it,
// not fall through to "(unidentified per-person item)".
var platBeo = "Menu\n13:00 - 21:00 Crew Catering - Band\nCrew Catering - Platters\nChef's selection of sandwiches\n6 guests @ $19.50 per person\n";
var platR = engine.checkDocument(engine.parseBeo(platBeo, catalogue), catalogue).items[0];
ok(platR && platR.matchedName === "Crew Sandwiches Platter" && platR.priceStatus === "correct",
  "crew sandwich platter billed per person → Crew Sandwiches Platter $19.50 correct (got " +
  (platR && platR.matchedName) + "/" + (platR && platR.priceStatus) + ")");
ok(platR && !/unidentified/.test(platR.name), "platter charge is not left unidentified");
// But an individual drink (wine by the bottle, spirit by the glass) must NOT be
// picked up as the heading of a per-person charge.
var drinkBeo = "Beverage\n19:00 - 23:00 Reception\nVasse Felix Filius Shiraz\n40 guests @ $60.00 per person\n";
var drinkR = engine.checkDocument(engine.parseBeo(drinkBeo, catalogue), catalogue).items[0];
ok(drinkR && drinkR.matchedName !== "Vasse Felix Filius Shiraz",
  "per-person charge does not match an individual wine (got " + (drinkR && drinkR.matchedName) + ")");
// A buffet package heading still beats a nearer composition dish that collides
// with a priced platter name.
var buffBeo = "Menu\n19:00 - 21:00 Dinner\nDinner Buffet Menu Three\nAssorted cheese platter\nSeasonal fresh fruit platter\n60 guests @ $120.00 per person\n";
var buffR = engine.checkDocument(engine.parseBeo(buffBeo, catalogue), catalogue).items[0];
ok(buffR && buffR.matchedName === "Dinner Buffet Menu Three" && buffR.priceStatus === "correct",
  "buffet package wins over a nearer platter-named dish (got " + (buffR && buffR.matchedName) + ")");

section("A platter selection shares one charge across multiple platters");
// Two platters chosen under one "N guests @ $X per person" line are checked
// against the SUM of the selected platters, not just the nearest one.
var selBeo = "Menu\n18:00 - 19:00 Crew Catering - Volunteers\nCrew Catering - Platters\nChef's selection of sandwiches\nSliced seasonal fresh fruit\n25 guests @ $28.00 per person\n";
var selR = engine.checkDocument(engine.parseBeo(selBeo, catalogue), catalogue).items[0];
ok(selR && selR.kind === "platter-selection", "detects a multi-platter selection (got " + (selR && selR.kind) + ")");
ok(selR && selR.expectedPrice === 32, "expected rate is the sum $19.50 + $12.50 = $32 (got " + (selR && selR.expectedPrice) + ")");
ok(selR && selR.priceStatus === "undercharged" && selR.priceDiff === -4,
  "charged $28 flagged undercharged by $4pp (got " + (selR && selR.priceStatus) + "/" + (selR && selR.priceDiff) + ")");
ok(selR && /Crew Sandwiches Platter/.test(selR.matchedName) && /Crew Fresh Fruit Platter/.test(selR.matchedName),
  "names both matched platters");
ok(selR && selR.priceImpact === -100, "total impact -$100 across 25 guests (got " + (selR && selR.priceImpact) + ")");

// Per-person crew "Hot Food" with two separately-priced items under one charge
// (BEO CECP 10-20-2026): Wedges $12pp + Assortment of mini quiches $16pp = $28pp.
// The individual prices are NOT on the BEO; the checker sums the menu prices.
var hotBeo = "Menu\n17:30 - 18:30 Crew Catering - Sophie\nCrew Catering - Hot Food\n" +
  "Wedges served with ketchup, sweet chilli and sour cream\nAssortment of mini quiches\n1 guests @ $28.00 per person\n";
var hotR = engine.checkDocument(engine.parseBeo(hotBeo, catalogue), catalogue).items[0];
ok(hotR && hotR.kind === "platter-selection", "hot-food block detected as a multi-item crew selection (got " + (hotR && hotR.kind) + ")");
ok(hotR && hotR.expectedPrice === 28, "expected rate is the sum $12 + $16 = $28 (got " + (hotR && hotR.expectedPrice) + ")");
ok(hotR && hotR.priceStatus === "correct", "charged $28 is correct (got " + (hotR && hotR.priceStatus) + ")");
ok(hotR && /Crew Wedges/.test(hotR.matchedName) && /Crew Mini Gourmet Quiches/.test(hotR.matchedName),
  "names both matched hot-food items");
// A single crew item under one charge stays a plain per-person match (not summed).
var oneBeo = "Menu\n17:30 - 18:30 Crew Catering - Sophie\nCrew Catering - Platters\nSliced seasonal fresh fruit\n1 guests @ $12.50 per person\n";
var oneR = engine.checkDocument(engine.parseBeo(oneBeo, catalogue), catalogue).items[0];
ok(oneR && oneR.kind !== "platter-selection", "a lone crew item is not treated as a multi-item selection (got " + (oneR && oneR.kind) + ")");

section("A charge never borrows the heading of the charge above it");
// Two charges, back to back: the second's own heading ("Sandwich Buffet Menu
// One") doesn't collide with the first's ("Coffee Break Menu One"). The second
// charge must take its OWN heading, not reach past its charge line to steal the
// first charge's title and keep its own rate.
var twoBeo = "Menu\n" +
  "10:35 - 11:00 Morning Tea\nCoffee Break Menu One\nAssorted cookies\nMini continental Danish pastries\n16 guests @ $29.00 per person\n" +
  "13:15 - 14:00 Working Lunch\nSandwich Buffet Menu One\nChicken Caesar salad\nEgg, sweet corn, chive\n16 guests @ $44.00 per person\n";
var twoR = engine.checkDocument(engine.parseBeo(twoBeo, catalogue), catalogue).items;
var cb = twoR.find(function (r) { return r.unitPrice === 29; });
var wl = twoR.find(function (r) { return r.unitPrice === 44; });
ok(cb && cb.matchedName === "Coffee Break One", "first charge → Coffee Break One (got " + (cb && cb.matchedName) + ")");
ok(wl && wl.matchedName === "Working Lunch Menu One",
  "second charge takes its OWN heading → Working Lunch Menu One, not the coffee break (got " + (wl && wl.matchedName) + ")");
ok(wl && wl.priceStatus === "correct", "working lunch $44 correct (got " + (wl && wl.priceStatus) + ")");
ok(twoR.filter(function (r) { return /Coffee Break/.test(r.matchedName || ""); }).length === 1,
  "the coffee-break heading is used by exactly one charge, not two");

section("A strong item name is not discarded as a section divider");
// "Sandwich Buffet Menu One" starts with the section word "Sandwich" but is the
// item itself — it must still be matched, not skipped as a course divider.
var sbR = engine.checkDocument(engine.parseBeo(
  "Menu\n13:15 - 14:00 Working Lunch\nSandwich Buffet Menu One\nChicken Caesar salad\n20 guests @ $44.00 per person\n",
  catalogue), catalogue).items[0];
ok(sbR && sbR.matchedName === "Working Lunch Menu One" && sbR.priceStatus === "correct",
  "Sandwich Buffet Menu One → Working Lunch Menu One $44 (got " + (sbR && sbR.matchedName) + ")");

section("A package's own selection isn't taken as the charge's heading");
// A coffee break lists selectable items; one of them ("Mini gourmet quiches")
// is also a crew menu item priced per person. The charge belongs to the coffee
// break ABOVE it, not to the nearer quiche line — the topmost package wins.
var cbqR = engine.checkDocument(engine.parseBeo(
  "Menu\n15:50 - 16:20 Afternoon Tea\nCoffee Break Menu One\nAssorted cookies\n~~~~~\nSAVOURY ITEMS\nMini gourmet quiches\n- Lorraine\n- Florentine\n~~~~~\nFreshly brewed coffee and selection of teas\n900 guests @ $29.00 per person\n",
  catalogue), catalogue).items[0];
ok(cbqR && cbqR.matchedName === "Coffee Break One",
  "quiche-in-a-coffee-break charge → Coffee Break One, not Crew Mini Gourmet Quiches (got " + (cbqR && cbqR.matchedName) + ")");
ok(cbqR && cbqR.priceStatus === "undercharged",
  "coffee break $29 vs $30 flagged undercharged (got " + (cbqR && cbqR.priceStatus) + ")");

section("Event display name is Booking Name - BEO Name");
var hdr1 = engine.parseBeoHeader("BEO#: 55169\nBooking Name: Boobalicious Ball 2026\nBEO Name: GREEN ROOMS\n");
ok(hdr1.displayName === "Boobalicious Ball 2026 - GREEN ROOMS",
  "combines booking + BEO name (got " + hdr1.displayName + ")");
var hdr2 = engine.parseBeoHeader("BEO#: 999\nBooking Name: Just Booking\n");
ok(hdr2.displayName === "Just Booking", "booking name only when no BEO name (got " + hdr2.displayName + ")");
var hdr3 = engine.parseBeoHeader("BEO#: 999\nBEO Name: Just BEO\n");
ok(hdr3.displayName === "Just BEO", "BEO name only when no booking name (got " + hdr3.displayName + ")");
var hdr4 = engine.parseBeoHeader("BEO#: 999\nBooking Name: Town Hall\nBEO Name: Town Hall\n");
ok(hdr4.displayName === "Town Hall", "collapses to one when booking and BEO name are identical (got " + hdr4.displayName + ")");

section("A charge's heading is never taken from the event summary table");
// The DATE/TIME/VENUE/EVENT grid at the top lists event types ("Arrival Tea &
// Coffee") that collide with menu items. The charge must take its heading from
// the Menu section below the "Package … Per Person … Price" header, not the grid.
var sumR = engine.checkDocument(engine.parseBeo(
  "DATE TIME VENUE EVENT SET-UP GTD ROOM HIRE\nArrival Tea & Coffee -\n13-10-26 08:30 - 09:00 Astral 1\nSession 1\n" +
  "Package Quantity Per Person Price\nMenu\n08:30 - 09:00 Arrival Tea & Coffee - Session 1\nAstral 1\n" +
  "Coffee Break Menu One\nAssorted cookies\nGourmet finger sandwiches\n150 guests @ $30.00 per person\n",
  catalogue), catalogue).items[0];
ok(sumR && sumR.matchedName === "Coffee Break One",
  "arrival-tea session charge → Coffee Break One, not Day Delegate Arrival from the summary grid (got " + (sumR && sumR.matchedName) + ")");

section("Breakfast set menus are recognised");
// Header alias: "Breakfast Set Menu One" → Plated Breakfast Menu One.
var bsmR = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n07:15 - 08:45 Breakfast\nBreakfast Set Menu One\n" +
  "FROM THE BAKERY (PRE-SET)\nMini butter croissants, continental Danish pastries\n" +
  "FROM THE PAN\nScrambled eggs on focaccia\n72 guests @ $47.00 per person\n",
  catalogue), catalogue).items[0];
ok(bsmR && bsmR.matchedName === "Plated Breakfast Menu One" && bsmR.priceStatus === "undercharged",
  "Breakfast Set Menu One → Plated Breakfast Menu One, $47 vs $56 undercharged (got " + (bsmR && bsmR.matchedName) + "/" + (bsmR && bsmR.priceStatus) + ")");

// Structure detector: an oddly-worded header ("Custom Breakfast Set Menu") with
// the bakery/pan structure is still classified as a plated breakfast, a cold
// dish inside it isn't taken as the charge, and an off-menu bakery item flags.
var cbfR = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n07:00 - 09:00 Breakfast\nCustom Breakfast Set Menu\n" +
  "FROM THE BAKERY (PRE-SET)\nPAIN AU CHOCOLAT\nCOLD DISHES (PRE-SET)\nSeasonal fresh fruit platter\n" +
  "FROM THE PAN\nScrambled eggs, grilled sourdough, bacon rasher\n400 guests @ $43.30 per person\n",
  catalogue), catalogue).items[0];
ok(cbfR && cbfR.matchedName === "Plated Breakfast Menu One",
  "Custom Breakfast Set Menu → Plated Breakfast Menu One by structure (got " + (cbfR && cbfR.matchedName) + ")");
ok(cbfR && cbfR.priceStatus === "undercharged", "custom breakfast $43.30 vs $56 undercharged");
ok(cbfR && !/fruit platter/i.test(cbfR.matchedName || ""), "the cold-dish fruit platter is not taken as the charge");
ok(cbfR && cbfR.notes.join(" ").toLowerCase().indexOf("bakery item is listed that isn't") !== -1,
  "off-menu bakery item (pain au chocolat) is flagged");

section("Plated breakfast One vs Two is decided by what's chosen, not the label");
// A mis-worded "Breakfast Set Menu Three" (there are only two plated breakfasts)
// with BOTH bakery items (croissants + petite muffins) is Menu Two, not One.
var bf3R = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n06:45 - 09:00 Breakfast\nBreakfast Set Menu Three\n" +
  "FROM THE BAKERY (PRE-SET)\nMini butter croissants, continental Danish pastries\nAssorted petite muffins\n" +
  "COLD DISHES (PRE-SET)\nSeasonal fresh fruit platter\n" +
  "FROM THE PAN\nScrambled eggs, grilled sourdough, bacon rasher\n312 guests @ $59.00 per person\n",
  catalogue), catalogue).items[0];
ok(bf3R && bf3R.matchedName === "Plated Breakfast Menu Two",
  "two bakery items → Plated Breakfast Menu Two despite 'Three' label (got " + (bf3R && bf3R.matchedName) + ")");
ok(bf3R && bf3R.priceStatus === "undercharged" && bf3R.expectedPrice === 60,
  "checked against $60 (Menu Two), $59 undercharged (got " + (bf3R && bf3R.expectedPrice) + "/" + (bf3R && bf3R.priceStatus) + ")");
// One bakery item stays Menu One.
var bf1R = engine.checkDocument(engine.parseBeo(
  "Package Quantity Per Person Price\nMenu\n07:15 - 08:45 Breakfast\nCustom Breakfast Set Menu\n" +
  "FROM THE BAKERY\nMini butter croissants, continental Danish pastries\n" +
  "FROM THE PAN\nScrambled eggs on focaccia\n72 guests @ $50.00 per person\n",
  catalogue), catalogue).items[0];
ok(bf1R && bf1R.matchedName === "Plated Breakfast Menu One",
  "one bakery item → Plated Breakfast Menu One (got " + (bf1R && bf1R.matchedName) + ")");

section("Real BEO — NAB Branch Leadership Forum (multi-section, page-split)");
var nab = fs.readFileSync(path.join(__dirname, "fixtures", "nab_beo.txt"), "utf8");
var nabRep = engine.checkDocument(engine.parseBeo(nab, catalogue), catalogue,
  engine.parseBeoHeader(nab).eventDate);
var nabItems = nabRep.items;
function nabBy(re) { return nabItems.filter(function (r) { return re.test(r.matchedName || r.name); }); }

// Two separate Coffee Break One charges (morning tea + afternoon tea) — both kept.
var nabBreaks = nabItems.filter(function (r) { return r.matchedName === "Coffee Break One"; });
ok(nabBreaks.length === 2, "both coffee breaks (morning + afternoon) are counted (got " + nabBreaks.length + ")");
ok(nabBreaks.every(function (r) { return r.priceStatus === "undercharged"; }),
  "Coffee Break One @ $29 flagged undercharged vs $30 book");

// Lunch Buffet "Daily Menu One" — heading is page-split from its charge but still matched.
var nabLunch = nabItems.filter(function (r) { return r.matchedName === "Lunch Buffet Menu One"; });
ok(nabLunch.length === 1 && nabLunch[0].priceStatus === "correct",
  "Lunch Buffet Daily Menu One @ $62 matched and correct");

// Cocktail reception priced by canapé count.
var nabCock = nabItems.filter(function (r) { return r.matchedName === "Cocktail Reception One Hour"; });
ok(nabCock.length === 1 && nabCock[0].priceStatus === "correct",
  "Cocktail Reception (4 canapés) @ $39 correct");

// Soft-drink minimum spend routed to non-menu, not a wrong package match.
var nabMin = nabItems.filter(function (r) { return /minimum spend/i.test(r.name); });
ok(nabMin.length === 1 && nabMin[0].status === "non-menu",
  "soft-drink minimum spend flagged non-menu, not priced against a package");

// On-consumption wines/beers all matched.
ok(nabBy(/Leeuwin Estate Sparkling Brut|Corona|Eddystone Point Pinot Noir/).length >= 3,
  "on-consumption wines & beers matched");

// Nothing left unmatched.
ok(nabItems.filter(function (r) { return r.status === "unmatched"; }).length === 0,
  "no unmatched lines in the NAB BEO");

// Each checked line carries the BEO text behind it (for click-to-reveal).
ok(nabItems.every(function (r) { return r.sourceExcerpt && r.sourceExcerpt.trim().length; }),
  "every NAB line has a source excerpt");
ok(nabLunch[0].sourceExcerpt.indexOf("Lunch Buffet Daily Menu One") !== -1,
  "the lunch-buffet excerpt shows its BEO heading");
ok(nabMin[0].sourceExcerpt.toLowerCase().indexOf("on consumption") !== -1,
  "the soft-drink minimum excerpt shows the 'on consumption' line");

section("Security officer hourly rate by day of week");
function secBEO(hours, rate) {
  return "Miscellaneous\n" + hours + " Security officer hours required @ $" + rate + " per hour\n";
}
// Thursday (weekday) → $63/hour.
var secWk = engine.checkDocument(engine.parseBeo(secBEO(5, "63.00"), catalogue), catalogue, "2026-10-15").items[0];
ok(secWk.matchedName === "Security Officer" && secWk.qty === 5, "parsed 5 security officer hours");
ok(secWk.priceStatus === "correct", "weekday security @ $63 correct (got " + secWk.priceStatus + ")");
var secWkOver = engine.checkDocument(engine.parseBeo(secBEO(5, "75.00"), catalogue), catalogue, "2026-10-15").items[0];
ok(secWkOver.priceStatus === "overcharged" && secWkOver.expectedPrice === 63,
  "weekday security @ $75 overcharged (expected $63)");
ok(secWkOver.priceImpact === 60, "weekday overcharge impact $12/hr × 5 = $60 (got " + secWkOver.priceImpact + ")");

// Saturday → $75/hour.
var secSat = engine.checkDocument(engine.parseBeo(secBEO(8, "75.00"), catalogue), catalogue, "2026-10-17").items[0];
ok(secSat.priceStatus === "correct", "Saturday security @ $75 correct");
var secSatUnder = engine.checkDocument(engine.parseBeo(secBEO(8, "63.00"), catalogue), catalogue, "2026-10-17").items[0];
ok(secSatUnder.priceStatus === "undercharged" && secSatUnder.expectedPrice === 75,
  "Saturday security @ $63 undercharged (expected $75)");

section("Operational staff hours — $55 per staff-hour");
// Real BEO wording, where "$55.00" and "per hour" are split by a "person," wrap.
var opR = engine.checkDocument(engine.parseBeo(
  "Miscellaneous\n5 Operational staff hours (1 x Staff 21:00 - 02:00) @ $55.00\nperson, per hour\n",
  catalogue), catalogue).items.find(function (r) { return r.matchedName === "Operational Staff"; });
ok(opR && opR.qty === 5 && opR.unitPrice === 55, "parsed 5 operational staff hours @ $55 (got " + (opR && opR.qty) + "/" + (opR && opR.unitPrice) + ")");
ok(opR && opR.priceStatus === "correct" && opR.expectedPrice === 55, "operational $55/hour correct (got " + (opR && opR.priceStatus) + ")");
var opOver = engine.checkDocument(engine.parseBeo(
  "Miscellaneous\n8 Operational staff hours (2 x Staff 05:00 - 09:00) @ $60.00 person, per hour\n",
  catalogue), catalogue).items.find(function (r) { return r.matchedName === "Operational Staff"; });
ok(opOver && opOver.priceStatus === "overcharged" && opOver.expectedPrice === 55,
  "operational @ $60 overcharged vs $55 (got " + (opOver && opOver.priceStatus) + ")");
ok(opOver && opOver.priceImpact === 40, "operational overcharge impact $5/hr × 8 = $40 (got " + (opOver && opOver.priceImpact) + ")");
// Sunday operational rate is $70/staff-hour (day taken from the line wording).
var opSun = engine.checkDocument(engine.parseBeo(
  "Miscellaneous\n4 Operational staff hours - Sunday rate (1 x Staff 00:00 - 04:00) @ $70.00 person, per hour\n",
  catalogue), catalogue).items.find(function (r) { return r.matchedName === "Operational Staff"; });
ok(opSun && opSun.priceStatus === "correct" && opSun.expectedPrice === 70,
  "operational Sunday $70/hour correct (got " + (opSun && opSun.priceStatus) + "/" + (opSun && opSun.expectedPrice) + ")");
var opSunUnder = engine.checkDocument(engine.parseBeo(
  "Miscellaneous\n4 Operational staff hours - Sunday rate (1 x Staff 00:00 - 04:00) @ $55.00 person, per hour\n",
  catalogue), catalogue).items.find(function (r) { return r.matchedName === "Operational Staff"; });
ok(opSunUnder && opSunUnder.priceStatus === "undercharged" && opSunUnder.expectedPrice === 70,
  "operational Sunday charged weekday $55 flagged undercharged vs $70 (got " + (opSunUnder && opSunUnder.priceStatus) + ")");

// Sunday → $86/hour.
var secSun = engine.checkDocument(engine.parseBeo(secBEO(6, "86.00"), catalogue), catalogue, "2026-10-18").items[0];
ok(secSun.priceStatus === "correct", "Sunday security @ $86 correct");
var secSunWrong = engine.checkDocument(engine.parseBeo(secBEO(6, "75.00"), catalogue), catalogue, "2026-10-18").items[0];
ok(secSunWrong.priceStatus === "undercharged" && secSunWrong.expectedPrice === 86,
  "Sunday security @ $75 undercharged (expected $86)");

// No event date and no day on the line → review (can't pick the day rate).
var secNoDate = engine.checkDocument(engine.parseBeo(secBEO(5, "63.00"), catalogue), catalogue, null).items[0];
ok(secNoDate.priceStatus === "review", "security with unknown day flagged to confirm");

// A day named on the line overrides the event date (event crossing midnight).
var secDual = engine.checkDocument(engine.parseBeo(
  "Miscellaneous\n16 Security officer hours - Saturday rate (4 guards) @ $75.00 per hour\n" +
  "4 Security officer hours - Sunday rate (4 guards 0000-0030) @ $86.00 per hour\n",
  catalogue), catalogue, "2026-10-17").items;
var secSatLine = secDual.find(function (r) { return r.qty === 16; });
var secSunLine = secDual.find(function (r) { return r.qty === 4; });
ok(secSatLine && secSatLine.priceStatus === "correct" && secSatLine.expectedPrice === 75,
  "line 'Saturday rate' @ $75 correct");
ok(secSunLine && secSunLine.priceStatus === "correct" && secSunLine.expectedPrice === 86,
  "line 'Sunday rate' @ $86 correct even though the event date is Saturday");

// Real cross-midnight BEO: Sunday-rate block billed at $37.50/hour is flagged vs $86.
var secFix = fs.readFileSync(path.join(__dirname, "fixtures", "security_crossmidnight_beo.txt"), "utf8");
var secFixItems = engine.checkDocument(engine.parseBeo(secFix, catalogue), catalogue,
  engine.parseBeoHeader(secFix).eventDate).items.filter(function (r) { return r.matchedName === "Security Officer"; });
ok(secFixItems.length === 2, "both security blocks parsed from the real BEO (got " + secFixItems.length + ")");
ok(secFixItems.some(function (r) { return r.expectedPrice === 75 && r.priceStatus === "correct"; }),
  "Saturday block @ $75 correct");
ok(secFixItems.some(function (r) { return r.expectedPrice === 86 && r.priceStatus === "undercharged"; }),
  "Sunday block @ $37.50 flagged undercharged vs $86");

section("Soft Drink Package (not Crown Reserve) + 6-hour tier");
// A soft-drink package line must map to the soft-drink family, never fall
// through to Crown Reserve.
var sd6 = engine.checkDocument(engine.parseBeo(
  "Beverage\n17:30 - 23:30 Reception\nSoft Drink Package - 6 Hours\nAssorted soft drinks, orange juice and water\n6 guests @ $26.00 per person\n",
  catalogue), catalogue).items[0];
ok(sd6.matchedName === "Soft Drink Only Package - 6 Hour",
  "Soft Drink Package - 6 Hours maps to the soft-drink package (got " + (sd6 && sd6.matchedName) + ")");
ok(sd6.priceStatus === "correct" && sd6.expectedPrice === 26, "soft-drink 6-hour @ $26 correct");

var sd3 = engine.checkDocument(engine.parseSocRows([["80", "Soft Drink Package - 3 Hours", "$20.00", "", "$1,600.00"]]), catalogue).items[0];
ok(sd3.matchedName === "Soft Drink Only Package - 3 Hour" && sd3.priceStatus === "correct",
  "soft-drink 3-hour @ $20 correct (SOC wording)");

section("BEO distribution — split one PDF into many BEOs");
var distText = [
  "EVENT ORDER", "BEO#: 1001", "Page: 1 of 2", "Saturday 24 Oct 2026", "Booking Name: Alpha Lunch",
  "Menu", "12:00 - 13:00 Lunch", "Coffee Break Menu One", "Assorted cookies", "80 guests @ $29.00 per person",
  "EVENT ORDER", "BEO#: 1001", "Page: 2 of 2", "Signing of this event order indicates that you agree",
  "EVENT ORDER", "BEO#: 1002", "Page: 1 of 1", "Sunday 25 Oct 2026", "Booking Name: Bravo Gala",
  "Miscellaneous", "4 Security officer hours - Sunday rate (2 guards) @ $86.00 per hour",
  "EVENT ORDER", "BEO#: 1003", "Page: 1 of 1", "Monday 26 Oct 2026", "Booking Name: Charlie Dinner",
  "Menu", "18:30 - 20:30 Dinner", "Dinner Buffet Menu One", "Bread rolls", "50 guests @ $90.00 per person"
].join("\n");
var dsegs = engine.splitBeoDistribution(distText);
ok(dsegs.length === 3, "splits into 3 BEOs (got " + dsegs.length + ")");
ok(dsegs.map(function (s) { return s.beoNumber; }).join(",") === "1001,1002,1003", "BEO numbers in order");
// Each segment checks on its own, using its own date/day.
var d1 = engine.checkDocument(engine.parseBeo(dsegs[0].text, catalogue), catalogue, engine.parseBeoHeader(dsegs[0].text).eventDate).items[0];
ok(d1.matchedName === "Coffee Break One" && d1.priceStatus === "undercharged", "BEO 1001: Coffee Break One $29 flagged");
var d2 = engine.checkDocument(engine.parseBeo(dsegs[1].text, catalogue), catalogue, engine.parseBeoHeader(dsegs[1].text).eventDate).items[0];
ok(d2.matchedName === "Security Officer" && d2.priceStatus === "correct" && d2.expectedPrice === 86,
  "BEO 1002: Sunday security @ $86 correct (per the line's own day)");
var d3 = engine.checkDocument(engine.parseBeo(dsegs[2].text, catalogue), catalogue, engine.parseBeoHeader(dsegs[2].text).eventDate).items[0];
ok(d3.matchedName === "Dinner Buffet Menu One" && d3.priceStatus === "correct", "BEO 1003: Dinner Buffet correct");
// A multi-page single BEO is one segment, not many.
var single = engine.splitBeoDistribution(fs.readFileSync(path.join(__dirname, "fixtures", "nab_beo.txt"), "utf8"));
ok(single.length === 1, "a single (multi-page) BEO is one segment (got " + single.length + ")");

console.log("\n----------------------------------------");
console.log(passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
