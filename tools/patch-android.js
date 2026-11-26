// Vá dự án android/ do "npx cap add android" sinh ra: icon, quyền camera, nền khởi động tối, ký APK, số phiên bản.
// Biến môi trường: VERSION_NAME, VERSION_CODE, BUILD_VERSION (ghi vào sw.js), KEYSTORE_FILE, KEYSTORE_PASSWORD, KEY_ALIAS
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), A = path.join(ROOT, "android"), RES = path.join(A, "app/src/main/res");
const rd = (f) => fs.readFileSync(f, "utf8"), wr = (f, s) => fs.writeFileSync(f, s);
function must(s, re, what) { if (!re.test(s)) throw new Error("Không tìm thấy " + what); }

// 1. build.gradle: phiên bản + ký
const gf = path.join(A, "app/build.gradle");
let g = rd(gf);
must(g, /versionCode \d+/, "versionCode"); must(g, /versionName "[^"]*"/, "versionName"); must(g, /buildTypes \{\s*release \{/, "buildTypes.release");
g = g.replace(/versionCode \d+/, "versionCode " + (process.env.VERSION_CODE || 1));
g = g.replace(/versionName "[^"]*"/, 'versionName "' + (process.env.VERSION_NAME || "1.0") + '"');
if (!g.includes("signingConfigs {")) {
  g = g.replace(/buildTypes \{\s*release \{/, (m) =>
    'signingConfigs {\n        release {\n            if (System.getenv("KEYSTORE_FILE")) {\n                storeFile file(System.getenv("KEYSTORE_FILE"))\n                storePassword System.getenv("KEYSTORE_PASSWORD")\n                keyAlias System.getenv("KEY_ALIAS") ?: "aftershot"\n                keyPassword System.getenv("KEYSTORE_PASSWORD")\n            }\n        }\n    }\n    ' +
    m + '\n            signingConfig signingConfigs.release');
}
wr(gf, g);

// 2. icon
const IC = path.join(ROOT, "resources/android");
for (const d of fs.readdirSync(IC)) {
  const s = path.join(IC, d);
  if (!fs.statSync(s).isDirectory()) continue;
  fs.mkdirSync(path.join(RES, d), { recursive: true });
  for (const f of fs.readdirSync(s)) fs.copyFileSync(path.join(s, f), path.join(RES, d, f));
}
fs.copyFileSync(path.join(IC, "ic_launcher_background.xml"), path.join(RES, "values/ic_launcher_background.xml"));

// 3. nền màn hình khởi động tối
const sf = path.join(RES, "values/styles.xml");
let st = rd(sf); must(st, /@drawable\/splash/, "splash");
wr(sf, st.replace("@drawable/splash", "#08090B"));

// 4. quyền camera (chụp bằng camera trong app)
const mf = path.join(A, "app/src/main/AndroidManifest.xml");
let m = rd(mf);
if (!m.includes("android.permission.CAMERA")) {
  m = m.replace("</manifest>", '    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />\n</manifest>');
  wr(mf, m);
}

// 5. sw.js: đổi VERSION theo bản build để APK mới bỏ cache cũ
if (process.env.BUILD_VERSION) {
  const sw = path.join(ROOT, "www/sw.js");
  let s = rd(sw); must(s, /const VERSION = "[^"]*";/, "VERSION trong sw.js");
  wr(sw, s.replace(/const VERSION = "[^"]*";/, 'const VERSION = "' + process.env.BUILD_VERSION + '";'));
}
console.log("Đã vá dự án Android");
