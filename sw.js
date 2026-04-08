// sw.js
const CACHE_NAME = 'smska-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/fontsource-inter@5.0.16/400.css',
  'https://cdn.jsdelivr.net/npm/fontsource-inter@5.0.16/500.css',
  'https://cdn.jsdelivr.net/npm/fontsource-inter@5.0.16/600.css',
  'https://cdn.jsdelivr.net/npm/fontsource-inter@5.0.16/700.css'
];

// Установка: кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Кэширование статики...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Запросы: стратегия "Cache First, затем Network"
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase и API — только сеть
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request));
    return;
  }

  // Статика — кэш + сеть
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      }).catch(() => {
        // Оффлайн: возвращаем offline.html для навигации
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Оффлайн', { status: 503 });
      });
    })
  );
});

// Push-уведомления (заглушка)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || 'Smska', {
    body: data.body || 'Новое сообщение',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'smska-msg',
    requireInteraction: false
  });
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsList) => {
      if (clientsList.length > 0) {
        return clientsList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});