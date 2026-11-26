// Tạo www/version.json: danh sách file + mã băm. Chạy: node tools/make-version.js
// Giữ nguyên số phiên bản nếu không file nào đổi.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const W = path.join(__dirname, "..", "www");
const SKIP = new Set(["version.json", "sw.js", "ota-config.js", ".DS_Store"]);
const SHELL = require("../package.json").aftershotShell || 1;
function walk(d, rel = "") {
  let out = [];
  for (const n of fs.readdirSync(d).sort()) {
    const p = path.join(d, n), r = rel ? rel + "/" + n : n;
    if (fs.statSync(p).isDirectory()) out = out.concat(walk(p, r));
    else if (!SKIP.has(n)) out.push([r, p]);
  }
  return out;
}
const files = {};
for (const [r, p] of walk(W)) files[r] = crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);
let old = {};
try { old = JSON.parse(fs.readFileSync(path.join(W, "version.json"), "utf8")); } catch (_) {}
const same = JSON.stringify(old.files) === JSON.stringify(files) && old.minShell === SHELL;
const d = new Date(), z = (n) => String(n).padStart(2, "0");
const v = same ? old.v : `${d.getUTCFullYear()}.${z(d.getUTCMonth() + 1)}.${z(d.getUTCDate())}-${z(d.getUTCHours())}${z(d.getUTCMinutes())}`;
fs.writeFileSync(path.join(W, "version.json"), JSON.stringify({ v, minShell: SHELL, files }, null, 1) + "\n");
console.log(same ? "không đổi" : "phiên bản mới", v, Object.keys(files).length + " file");
