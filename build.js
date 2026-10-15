/*
 * Produce a single self-contained page (dist/index.html) by inlining the
 * local prices.js and engine.js into index.html. The pdf.js and mammoth
 * libraries stay as CDN <script> tags. Run: node build.js
 */
"use strict";
var fs = require("fs");
var path = require("path");

var root = __dirname;
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function inline(srcPath) {
  var code = fs.readFileSync(path.join(root, srcPath), "utf8");
  return "<script>\n" + code + "\n</script>";
}

html = html.replace('<script src="src/prices.js"></script>', inline("src/prices.js"));
html = html.replace('<script src="src/menu-images.js"></script>', inline("src/menu-images.js"));
html = html.replace('<script src="src/engine.js"></script>', inline("src/engine.js"));

if (html.indexOf('src="src/')!== -1) {
  console.error("WARNING: a local src/ script tag was not inlined.");
}

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist", "index.html"), html);
console.log("Wrote dist/index.html (" + html.length + " bytes)");
