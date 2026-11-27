/* Cấu hình cập nhật trong app. Workflow tự điền repo khi build APK.
   repo: "tên-github/tên-kho" (kho phải công khai). shell: số thứ tự của "vỏ" APK; chỉ tăng khi phần native đổi.
   File này KHÔNG được cập nhật qua OTA (nằm trong APK), nên phần canh lỗi bên dưới luôn là bản gốc. */
window.AS_OTA = { repo: "OWNER/REPO", branch: "main", shell: 2 };

/* Canh lỗi: bản OTA vừa tải mà báo lỗi trong 8 giây đầu thì xóa OTA, quay về bản đóng gói trong APK. */
(function () {
  try {
    var ap = localStorage.getItem("as.ota.applied");
    if (!ap || localStorage.getItem("as.ota.good") === ap || !window.caches) return;
    var done = false;
    window.addEventListener("error", function () {
      if (done) return; done = true;
      caches.delete("aftershot-ota").then(function () {
        try { localStorage.removeItem("as.ota.applied"); localStorage.removeItem("as.ota.good"); } catch (e) {}
        location.replace(new URL("./", document.baseURI).href + "?safe=1");
      });
    });
    setTimeout(function () { if (!done) { try { localStorage.setItem("as.ota.good", ap); } catch (e) {} } }, 8000);
  } catch (e) {}
})();
