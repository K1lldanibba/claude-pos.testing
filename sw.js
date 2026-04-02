var CACHE = 'pos-salteñas-v4';
var ARCHIVOS_SHELL = [
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/main.js',
  'js/core/constants.js',
  'js/core/state.js',
  'js/core/store.js',
  'js/core/storage.js',
  'js/api/api.js',
  'js/utils/utils.js',
  'js/components/Notify.js',
  'js/components/Navigation.js',
  'js/components/ProductGrid.js',
  'js/components/Cart.js',
  'js/components/Modals.js',
  'js/components/Sales.js',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ARCHIVOS_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (ev) {
  if (ev.request.url.includes('script.google.com')) return;
  if (ev.request.url.includes('supabase')) return;

  ev.respondWith(
    fetch(ev.request)
      .then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var responseClone = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(ev.request, responseClone);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(ev.request).then(function (r) {
          return r || caches.match('index.html');
        });
      })
  );
});
