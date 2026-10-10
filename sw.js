/* i. Image — service worker: офлайн-режим и кэш оболочки */
'use strict';

var CACHE = 'i-image-v6';

var ASSETS = [
  './',
  './index.html',
  './app.html',
  './css/style.css',
  './css/dark-theme.css',
  './js/presets.js',
  './js/zip.js',
  './js/filters.js',
  './js/resize.js',
  './js/crop.js',
  './js/convert.js',
  './js/compress.js',
  './js/editor.js',
  './js/uploader.js',
  './js/projects.js',
  './js/session.js',
  './js/export.js',
  './js/main.js',
  './assets/logo.svg',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || !req.url.indexOf || req.url.indexOf('http') !== 0) return;

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
