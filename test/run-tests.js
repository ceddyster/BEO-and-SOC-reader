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
ok(rSec2 && rSec2.qty === 6 && rSec2.priceStatus === "not-checked", "Security 6 hrs non-menu");

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

// Same extra beer but billed at base $62 (add-on not charged) → review.
var resMiss = engine.checkDocument(engine.parseBeo(bevBEO(
  "Crown Reserve Package - 4 Hours",
  ["Woodbrook Vineyards NV Brut Cuvee", "Brigade Block Semillon Sauvignon Blanc", "Abilene Shiraz",
   "Corona", "Hahn Super Dry 3.5", "Heineken Zero", "Peroni"], "62.00"), catalogue), catalogue).items[0];
ok(resMiss.priceStatus === "review", "extra beer not billed -> review");
ok(resMiss.notes.join(" ").indexOf("66.50") !== -1, "review note shows expected $66.50");

console.log("\n----------------------------------------");
console.log(passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
