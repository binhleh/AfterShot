/* AfterShot: cập nhật nội dung ngay trong app Android (không cần cài lại APK).
   Chỉ chạy trong app Android (Capacitor). Trình duyệt thường bỏ qua file này.
   Cách chạy:
   1. Hỏi GitHub (raw) file www/version.json, so với version.json đang dùng.
   2. Tải những file có mã băm khác, kiểm tra mã băm rồi lưu vào bộ nhớ OTA.
   3. sw.js ưu tiên phục vụ file từ bộ nhớ OTA, nên lần mở/tải lại sau dùng bản mới.
   Sự cố: nếu bản mới báo lỗi trong 8 giây đầu thì tự quay về bản gốc trong APK
   (phần canh lỗi nằm trong ota-config.js vì file đó không bao giờ bị cập nhật qua OTA). */
(function () {
  "use strict";
  var C = window.AS_OTA || {};
  var native = !!(window.Capacitor && typeof Capacitor.isNativePlatform === "function" && Capacitor.isNativePlatform());
  if (!native && !C.force) return;
  if (!("serviceWorker" in navigator) || !window.caches) return;

  var CACHE = "aftershot-ota";
  var SCOPE = new URL("./", document.baseURI).href;
  var BASE = C.base || ((C.repo && !/OWNER/.test(C.repo)) ? "https://raw.githubusercontent.com/" + C.repo + "/" + (C.branch || "main") + "/www/" : "");
  var MIME = { html: "text/html", js: "text/javascript", json: "application/json", webmanifest: "application/manifest+json", png: "image/png", svg: "image/svg+xml", ico: "image/x-icon", css: "text/css", jpg: "image/jpeg", webp: "image/webp" };
  var busy = false, btn, ver, rb;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function mime(p) { return MIME[(p.split(".").pop() || "").toLowerCase()] || "application/octet-stream"; }
  function json(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function local() { return json(new URL("version.json", SCOPE).href).catch(function () { return { v: "0", files: {} }; }); }
  function sha(buf) {
    return crypto.subtle.digest("SHA-1", buf).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) { return (b < 16 ? "0" : "") + b.toString(16); }).join("").slice(0, 12);
    });
  }
  function note(t, keep) { if (!btn) return; btn.textContent = t; if (!keep) setTimeout(function () { btn.textContent = "Kiểm tra cập nhật"; }, 5000); }
  function banner(v) {
    var u = document.getElementById("upd"); if (!u) return;
    var s = u.querySelector("span"); if (s) s.textContent = "Đã tải bản mới " + v;
    u.hidden = false;
  }

  async function check(manual) {
    if (busy) return;
    busy = true;
    try {
      if (!BASE) { if (manual) note("Chưa cấu hình kho GitHub"); return; }
      if (manual) note("Đang kiểm tra…", true);
      var L = await local();
      var R = await json(BASE + "version.json?t=" + Date.now());
      if ((R.minShell || 1) > (C.shell || 1)) {
        if (manual) note("Cần cài APK mới (mục Releases)");
        return;
      }
      ls("as.ota.t", String(Date.now()));
      if (R.v === L.v || String(R.v) < String(L.v)) { if (manual) note("Đang dùng bản mới nhất"); return; }
      var todo = Object.keys(R.files).filter(function (k) { return (L.files || {})[k] !== R.files[k]; });
      var got = [];
      for (var i = 0; i < todo.length; i++) {
        if (manual) note("Đang tải " + (i + 1) + "/" + todo.length + "…", true);
        var k = todo[i];
        var r = await fetch(BASE + k + "?v=" + encodeURIComponent(R.v), { cache: "no-store" });
        if (!r.ok) throw new Error("tải " + k);
        var buf = await r.arrayBuffer();
        if ((await sha(buf)) !== R.files[k]) throw new Error("hash " + k);
        got.push([k, buf]);
      }
      var c = await caches.open(CACHE);
      for (var j = 0; j < got.length; j++) {
        await c.put(new URL(got[j][0], SCOPE).href, new Response(got[j][1], { headers: { "Content-Type": mime(got[j][0]) } }));
      }
      await c.put(new URL("version.json", SCOPE).href, new Response(JSON.stringify(R), { headers: { "Content-Type": "application/json" } }));
      ls("as.ota.applied", String(R.v)); ls("as.ota.good", null);
      if (ver) ver.textContent = "Bản " + R.v + " (chờ tải lại)";
      if (manual) note("Đã tải bản " + R.v, true);
      banner(R.v);
    } catch (e) {
      if (manual) note("Không cập nhật được, thử lại sau vài phút");
    } finally { busy = false; }
  }

  async function rollback(reload) {
    try { await caches.delete(CACHE); } catch (e) {}
    ls("as.ota.applied", null); ls("as.ota.good", null);
    if (reload) location.replace(SCOPE + "?safe=1");
  }

  function ui() {
    var f = document.querySelector("footer"); if (!f) return;
    var box = document.createElement("span"); box.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;align-items:center";
    ver = document.createElement("span"); ver.id = "otaVer";
    btn = document.createElement("button"); btn.type = "button"; btn.className = "pill"; btn.id = "otaBtn"; btn.textContent = "Kiểm tra cập nhật";
    btn.addEventListener("click", function () { check(true); });
    box.appendChild(ver); box.appendChild(btn);
    if (ls("as.ota.applied")) {
      rb = document.createElement("button"); rb.type = "button"; rb.className = "pill"; rb.textContent = "Khôi phục bản gốc";
      rb.addEventListener("click", function () { rollback(true); });
      box.appendChild(rb);
    }
    f.appendChild(box);
    local().then(function (l) { ver.textContent = "Bản " + l.v; });
  }

  if (/[?&]safe=1/.test(location.search)) { ls("as.ota.applied", null); ls("as.ota.good", null); try { history.replaceState(null, "", location.pathname); } catch (e) {} }

  ui();
  window.AS_OTA_CHECK = check;
  var last = +ls("as.ota.t") || 0;
  if (Date.now() - last > 3600e3) setTimeout(function () { check(false); }, 3000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden && Date.now() - (+ls("as.ota.t") || 0) > 3600e3) check(false); });
})();
