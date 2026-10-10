/* i. Image — сессия проекта: сохранение и восстановление состояния */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      try {
        canvas.toBlob(function (b) { resolve(b); }, type || 'image/png', quality);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function blobToCanvas(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = Math.max(1, img.naturalWidth);
        c.height = Math.max(1, img.naturalHeight);
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Не удалось открыть изображение'));
      };
      img.src = url;
    });
  }

  function cloneCanvas(src) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, src.width);
    c.height = Math.max(1, src.height);
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  function newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function shortDate(ts) {
    var d = new Date(ts);
    var dd = ('0' + d.getDate()).slice(-2);
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var hh = ('0' + d.getHours()).slice(-2);
    var mi = ('0' + d.getMinutes()).slice(-2);
    return dd + '.' + mm + ' ' + hh + ':' + mi;
  }

  function newProject() {
    var now = Date.now();
    return {
      id: newId('prj'),
      name: 'Проект ' + shortDate(now),
      createdAt: now,
      updatedAt: now
    };
  }

  function collectImage(image) {
    var base = image.baseCanvas ? canvasToBlob(image.baseCanvas, 'image/png') : Promise.resolve(null);
    var orig = image.originalCanvas ? canvasToBlob(image.originalCanvas, 'image/png') : Promise.resolve(null);
    return Promise.all([base, orig]).then(function (blobs) {
      var dims = image.baseCanvas
        ? { width: image.baseCanvas.width, height: image.baseCanvas.height }
        : { width: image.width || 0, height: image.height || 0 };
      return {
        id: image.id,
        name: image.name,
        type: image.type,
        size: image.size,
        width: dims.width,
        height: dims.height,
        base: blobs[0],
        original: blobs[1],
        thumb: image.thumb || null,
        filters: Object.assign(IT.filters.defaults(), IT.state.filters[image.id] || {})
      };
    });
  }

  function collect() {
    var p = IT.state.currentProject || newProject();
    var list = IT.state.images.filter(function (x) { return !!x.baseCanvas; });
    var jobs = list.map(collectImage);
    return Promise.all(jobs).then(function (records) {
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt || Date.now(),
        updatedAt: Date.now(),
        settings: {
          format: IT.state.settings.format,
          quality: IT.state.settings.quality
        },
        cover: records.length ? (records[0].thumb || null) : null,
        count: records.length,
        images: records
      };
    });
  }

  function apply(record) {
    IT.state.images = [];
    IT.state.filters = {};
    IT.state.selectedId = null;
    IT.state.currentProject = {
      id: record.id,
      name: record.name,
      createdAt: record.createdAt || Date.now(),
      updatedAt: record.updatedAt || Date.now()
    };
    if (record.settings) {
      IT.state.settings.format = IT.convert.supports(record.settings.format)
        ? record.settings.format
        : 'image/jpeg';
      IT.state.settings.quality = record.settings.quality != null
        ? record.settings.quality
        : 82;
    }

    var chain = Promise.resolve();
    (record.images || []).forEach(function (r) {
      chain = chain.then(function () {
        if (!r.base) return;
        var prom = IT.session.blobToCanvas(r.base).then(function (base) {
          var origP = r.original
            ? IT.session.blobToCanvas(r.original)
            : Promise.resolve(cloneCanvas(base));
          return Promise.all([base, origP]);
        });
        return prom.then(function (canvases) {
          var base = canvases[0];
          var orig = canvases[1];
          var item = {
            id: r.id,
            name: r.name,
            type: r.type,
            size: r.size,
            width: base.width,
            height: base.height,
            baseCanvas: base,
            originalCanvas: orig,
            thumb: r.thumb || null,
            loading: false
          };
          IT.state.images.push(item);
          IT.state.filters[item.id] = Object.assign(IT.filters.defaults(), r.filters || {});
          IT.editor.initHistory(item);
        });
      });
    });

    return chain.then(function () {
      IT.state.selectedId = IT.state.images.length ? IT.state.images[0].id : null;
      return IT.state;
    });
  }

  IT.session = {
    newProject: newProject,
    collect: collect,
    apply: apply,
    cloneCanvas: cloneCanvas,
    canvasToBlob: canvasToBlob,
    blobToCanvas: blobToCanvas,
    shortDate: shortDate
  };
})(window.IT);