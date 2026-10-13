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

console.log("\n----------------------------------------");
console.log(passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
