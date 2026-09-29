var CACHE = "najm-hide-v1";
self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(["./"]).catch(function(){}); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
function isCdn(u){ return /(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname); }
// ملفات الموقع (الصفحة، library.json، library/*): الشبكة أولًا ولو بطيئة/مفيش نت نرجع للنسخة المحفوظة
function networkFirst(req){
  return new Promise(function(resolve){
    var done = false;
    var timer = setTimeout(function(){
      caches.match(req).then(function(hit){ if(hit && !done){ done = true; resolve(hit); } });
    }, 4000);
    fetch(req).then(function(res){
      clearTimeout(timer);
      if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
      if(!done){ done = true; resolve(res); }
    }).catch(function(){
      clearTimeout(timer);
      caches.match(req).then(function(hit){ if(!done){ done = true; resolve(hit || Response.error()); } });
    });
  });
}
// مكتبات CDN والخطوط: من النسخة المحفوظة فورًا وتتحدّث في الخلفية
function staleWhileRevalidate(req){
  return caches.open(CACHE).then(function(c){
    return c.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    });
  });
}
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin === location.origin){ e.respondWith(networkFirst(req)); }
  else if(isCdn(url)){ e.respondWith(staleWhileRevalidate(req)); }
});
