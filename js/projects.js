/* i. Image — хранилище проектов (IndexedDB) */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var DB_NAME = 'i-image-db';
  var STORE = 'projects';
  var VERSION = 1;
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB не поддерживается'));
        return;
      }
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function store(mode) {
    return open().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  function request(r) {
    return new Promise(function (resolve, reject) {
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function put(record) {
    return store('readwrite').then(function (s) {
      return request(s.put(record)).then(function () { return record; });
    });
  }

  function getAll() {
    return store('readonly').then(function (s) {
      return request(s.getAll()).then(function (list) { return list || []; });
    });
  }

  function get(id) {
    return store('readonly').then(function (s) {
      return request(s.get(id));
    });
  }

  function del(id) {
    return store('readwrite').then(function (s) {
      return request(s.delete(id));
    });
  }

  function clear() {
    return store('readwrite').then(function (s) {
      return request(s.clear());
    });
  }

  IT.projects = {
    available: ('indexedDB' in window),
    put: put,
    getAll: getAll,
    get: get,
    del: del,
    clear: clear
  };
})(window.IT);