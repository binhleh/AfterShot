/* AfterShot service worker
   - Trang chính (HTML): ưu tiên mạng, quá 3 giây hoặc mất mạng thì dùng bản đã lưu.
     Nếu bản mới về muộn, báo cho trang hiện thanh "Đã có bản mới".
   - looks.js (bộ màu): ưu tiên mạng, quá 3 giây hoặc mất mạng thì dùng bản đã lưu.
     Sửa bộ màu chỉ cần up lại looks.js, không cần đổi VERSION.
   - Icon, manifest cùng thư mục: dùng bản lưu và cập nhật nền.
   - JSZip trên cdnjs: lưu lại để xuất .zip được khi offline.
   - Mô hình tách nền (Hugging Face) không đi qua đây, trình duyệt tự lưu.
   Khi cần ép mọi máy bỏ cache cũ: đổi VERSION bên dưới. */
const VERSION = "4";
const CACHE = "aftershot-" + VERSION;
const ROOT = new URL("./", self.registration.scope).href;
const ASSETS = ["looks.js", "jszip.min.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all([ROOT, ...ASSETS.map((a) => new URL(a, ROOT).href)].map((u) =>
      fetch(u, { cache: "reload" }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("aftershot-") && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function notify() {
  const cs = await self.clients.matchAll({ type: "window" });
  cs.forEach((c) => c.postMessage({ type: "update" }));
}

async function navigate(e) {
  const cache = await caches.open(CACHE);
  let late = false;
  const net = fetch(e.request, { cache: "no-cache" }).then(async (res) => {
    if (res.ok) {
      const old = await cache.match(ROOT);
      const copy = res.clone();
      let changed = false;
      if (late && old) { try { changed = (await old.text()) !== (await res.clone().text()); } catch (_) {} }
      await cache.put(ROOT, copy);
      if (late && changed) notify();
    }
    return res;
  });
  const cached = await cache.match(ROOT);
  if (!cached) return net;
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(() => { late = true; rej(); }, 3000))]);
  } catch (_) {
    net.catch(() => {});
    return cached;
  }
}

async function fresh(req) {
  const cache = await caches.open(CACHE);
  const net = fetch(req, { cache: "no-cache" }).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; });
  const hit = await cache.match(req);
  if (!hit) return net.catch(() => Response.error());
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(rej, 3000))]);
  } catch (_) {
    net.catch(() => {});
    return hit;
  }
}

async function stale(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const go = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await go) || Response.error();
}

async function firstCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === "opaque") cache.put(req, r.clone());
  return r;
}

/* Cập nhật trong app Android: file đã tải về (ota.js) được phục vụ trước file đóng gói trong APK. */
const OTA = "aftershot-ota";
async function otaHit(r, u) {
  try {
    if (r.mode === "navigate" && u.searchParams.get("safe") === "1") { await caches.delete(OTA); return null; }
    if (!(await caches.has(OTA))) return null;
    const c = await caches.open(OTA);
    let key = u.href.split("#")[0].split("?")[0];
    if (r.mode === "navigate" && (key === ROOT || key === ROOT + "index.html")) key = ROOT + "index.html";
    return (await c.match(key)) || null;
  } catch (_) { return null; }
}

function route(e) {
  const r = e.request, u = new URL(r.url);
  if (r.mode === "navigate" && u.origin === location.origin && u.href.startsWith(ROOT)) return navigate(e);
  if (u.origin === location.origin && (u.href === new URL("looks.js", ROOT).href || u.href === new URL("version.json", ROOT).href)) return fresh(r);
  if (u.origin === location.origin && u.href.startsWith(ROOT)) return stale(r);
  if (u.hostname === "cdnjs.cloudflare.com") return firstCache(r);
  return null;
}

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin && u.href.startsWith(ROOT)) {
    e.respondWith((async () => (await otaHit(r, u)) || route(e))());
    return;
  }
  const p = route(e);
  if (p) e.respondWith(p);
});
