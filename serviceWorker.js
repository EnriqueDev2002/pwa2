importScripts('./cache-polyfill.js');

var cacheName = 'cache-v4';

var files = [
  './',
  './index.html?utm=homescreen',
  'https://fonts.googleapis.com/css?family=Roboto:200,300,400,500,700',
  './css/styles.css',
  './images/icons/android-chrome-192x192.png',
  './images/push-on.png',
  './images/push-off.png',
  './images/icons/favicon-16x16.png',
  './images/icons/favicon-32x32.png',
  './js/main.js',
  './js/app.js',
  './js/offline.js',
  './js/push.js',
  './js/sync.js',
  './js/toast.js',
  './js/share.js',
  './js/menu.js',
  './manifest.json'
];


self.addEventListener('install', (event) => {
  console.info('Event: Install');

  event.waitUntil(
    caches.open(cacheName)
    .then((cache) => {

      return cache.addAll(files)
      .then(() => {
        console.info('All files are cached');
        return self.skipWaiting(); 
      })
      .catch((error) =>  {
        console.error('Failed to cache', error);
      })
    })
  );
});

self.addEventListener('fetch', (event) => {
  console.info('Event: Fetch');

  var request = event.request;
  var url = new URL(request.url);
  if (url.origin === location.origin) {
    // Static files cache
    event.respondWith(cacheFirst(request));
  } else {
    // Dynamic API cache
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  return cachedResponse || fetch(request);
}

async function networkFirst(request) {
  const dynamicCache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request);
    // Cache the dynamic API response
    dynamicCache.put(request, networkResponse.clone()).catch((err) => {
      console.warn(request.url + ': ' + err.message);
    });
    return networkResponse;
  } catch (err) {
    const cachedResponse = await dynamicCache.match(request);
    return cachedResponse;
  }
}

self.addEventListener('activate', (event) => {
  console.info('Event: Activate');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cacheName) {
            return caches.delete(cache); 
          }
        })
      );
    })
    .then(function () {
      console.info("Old caches are cleared!");
      return self.clients.claim(); 
    }) 
  );
});

self.addEventListener('push', (event) => {
  console.info('Event: Push');

  var title = 'Push notification demo';
  var body = {
    'body': 'click to return to application',
    'tag': 'demo',
    'icon': './images/icons/apple-touch-icon.png',
    'badge': './images/icons/apple-touch-icon.png',

    'actions': [
      { 'action': 'yes', 'title': 'I ♥ this app!'},
      { 'action': 'no', 'title': 'I don\'t like this app'}
    ]
  };

  event.waitUntil(self.registration.showNotification(title, body));
});

self.addEventListener('sync', (event) => {
  console.info('Event: Sync');

  if (event.tag === 'github' || event.tag === 'test-tag-from-devtools') {
    event.waitUntil(
      self.clients.matchAll().then((all) => {
        return all.map((client) => {
          return client.postMessage('online'); 
        })
      })
      .catch((error) => {
        console.error(error);
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  var url = 'https://demopwa.in/';

  if (event.action === 'yes') {
    console.log('I ♥ this app!');
  }
  else if (event.action === 'no') {
    console.warn('I don\'t like this app');
  }

  event.notification.close(); 
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then((clients) => {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
    .catch((error) => {
      console.error(error);
    })
  );
});
