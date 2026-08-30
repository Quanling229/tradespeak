/* TradeSpeak Service Worker - 离线缓存 + 自动更新检测 */
const CACHE_NAME = "tradespeak-v1";
const ASSETS = [
  "./index.html",
  "./manifest.json",
  "./courses.json"
];

/* 安装：缓存核心资源 */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

/* 激活：清理旧缓存 */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* fetch：缓存优先，网络更新 */
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  /* 只缓存同源请求 */
  if(url.origin !== self.location.origin) return;
  /* courses.json 总是网络优先（确保最新课程） */
  if(url.pathname.endsWith("courses.json")){
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  /* 其他资源：缓存优先，后台更新 */
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if(res && res.status === 200){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

/* 监听更新消息 */
self.addEventListener("message", e => {
  if(e.data === "skipWaiting") self.skipWaiting();
});
