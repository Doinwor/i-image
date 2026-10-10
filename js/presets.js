/* i. Image — пресеты и форматы */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var STORAGE_KEY = 'i-image-presets';

  IT.presets = {
    social: [
      { id: 'ig-post', label: 'Instagram пост', w: 1080, h: 1080 },
      { id: 'ig-story', label: 'Stories', w: 1080, h: 1920 },
      { id: 'yt-thumb', label: 'YouTube превью', w: 1280, h: 720 },
      { id: 'tiktok', label: 'TikTok', w: 1080, h: 1920 },
      { id: 'vk-cover', label: 'Обложка VK', w: 1590, h: 400 },
      { id: 'avatar', label: 'Аватар', w: 400, h: 400 }
    ],

    formats: [
      { mime: 'image/png', label: 'PNG', ext: 'png' },
      { mime: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
      { mime: 'image/webp', label: 'WebP', ext: 'webp' },
      { mime: 'image/avif', label: 'AVIF', ext: 'avif' }
    ],

    saved: [],

    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        IT.presets.saved = raw ? JSON.parse(raw) : [];
      } catch (e) {
        IT.presets.saved = [];
      }
      return IT.presets.saved;
    },

    persist: function () {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(IT.presets.saved)); } catch (e) {}
    },

    add: function (name, settings) {
      IT.presets.saved.push({ id: 'p' + Date.now(), name: name, settings: settings });
      IT.presets.persist();
    },

    remove: function (id) {
      IT.presets.saved = IT.presets.saved.filter(function (p) { return p.id !== id; });
      IT.presets.persist();
    },

    extFor: function (mime) {
      var found = IT.presets.formats.filter(function (f) { return f.mime === mime; })[0];
      return found ? found.ext : 'png';
    }
  };
})(window.IT);
