/* i. Image — экспорт: скачивание одного файла, ZIP, размеры */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var refreshToken = 0;
  var refreshTimer = null;

  function fmtBytes(b) {
    if (b == null) return '—';
    var units = ['Б', 'КБ', 'МБ', 'ГБ'];
    var i = 0;
    var v = b;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i === 0 ? v : v.toFixed(v < 10 ? 2 : 1)) + ' ' + units[i];
  }

  function baseName(name) {
    return (name || 'image').replace(/\.[^.]+$/, '');
  }

  function setSizes(before, after) {
    var el = IT.el;
    if (!el) return;
    el.sizeBefore.textContent = fmtBytes(before);
    if (after == null) {
      el.sizeAfter.textContent = '—';
      el.sizeSave.textContent = '—';
      el.sizeSave.classList.remove('is-negative');
      return;
    }
    el.sizeAfter.textContent = fmtBytes(after);
    var diff = before - after;
    var pct = before ? Math.round(diff / before * 100) : 0;
    if (pct >= 0) {
      el.sizeSave.textContent = '−' + pct + '%';
      el.sizeSave.classList.remove('is-negative');
    } else {
      el.sizeSave.textContent = '+' + Math.abs(pct) + '%';
      el.sizeSave.classList.add('is-negative');
    }
  }

  function refreshSize() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(doRefreshSize, 120);
  }

  function doRefreshSize() {
    var image = IT.state.selected();
    if (!image || image.loading || !image.baseCanvas) {
      setSizes(null, null);
      return;
    }
    var token = ++refreshToken;
    var s = IT.state.settings;
    IT.compress.toBlob(image, { mime: s.format, quality: s.quality }).then(function (res) {
      if (token !== refreshToken) return;
      setSizes(image.size, res.blob ? res.blob.size : null);
    }).catch(function () {
      if (token === refreshToken) setSizes(image.size, null);
    });
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
  }

  function projectName() {
    var p = IT.state.currentProject;
    if (p && p.name && p.name.trim()) return p.name.trim();
    var image = IT.state.selected();
    return image ? baseName(image.name) : 'i-image';
  }

  function ensureExt(name, ext) {
    if (/\.\w+$/.test(name)) return name;
    return name + '.' + ext;
  }

  function downloadOne() {
    var image = IT.state.selected();
    if (!image || image.loading) { IT.ui.toast('Нет выбранного файла', 'error'); return; }
    var s = IT.state.settings;
    var ext = IT.presets.extFor(s.format);
    var suggested = projectName() + '.' + ext;
    var typed = window.prompt('Имя файла:', suggested);
    if (typed == null) return;
    var name = ensureExt(typed.trim() || suggested, ext);

    IT.compress.toBlob(image, { mime: s.format, quality: s.quality }).then(function (res) {
      if (!res || !res.blob) { IT.ui.toast('Не удалось закодировать файл в «' + s.format.replace('image/', '') + '»', 'error'); return; }
      saveBlob(res.blob, name);
      IT.ui.toast('Сохранено: ' + name, 'ok');
    });
  }

  function uniqueName(used, name) {
    var n = name;
    var i = 1;
    while (used.indexOf(n) !== -1) {
      n = name.replace(/(\.[^.]+)$/, '-' + (i++) + '$1');
    }
    used.push(n);
    return n;
  }

  function downloadAll() {
    var images = IT.state.images.filter(function (x) { return !x.loading && x.baseCanvas; });
    if (!images.length) { IT.ui.toast('Нет файлов для экспорта', 'error'); return; }

    var s = IT.state.settings;
    var ext = IT.presets.extFor(s.format);
    var typed = window.prompt('Имя файлов и ZIP-архива:', projectName());
    if (typed == null) return;
    var base = typed.trim() || projectName();

    var used = [];
    var entries = [];
    var failed = 0;
    var chain = Promise.resolve();

    IT.ui.toast('Готовим ZIP…', 'ok');

    images.forEach(function (image) {
      chain = chain.then(function () {
        return IT.compress.toBlob(image, { mime: s.format, quality: s.quality }).then(function (res) {
          if (!res || !res.blob) { failed++; return null; }
          return res.blob.arrayBuffer().then(function (buf) {
            entries.push({
              name: uniqueName(used, base + '-' + (entries.length + 1) + '.' + ext),
              data: new Uint8Array(buf)
            });
          });
        });
      });
    });

    chain.then(function () {
      if (!entries.length) {
        IT.ui.toast('Ничего не удалось закодировать' + (failed ? ' (' + failed + ')' : ''), 'error');
        return;
      }
      var zip = IT.zip.create(entries);
      saveBlob(zip, ensureExt(base, 'zip'));
      IT.ui.toast('ZIP готов: ' + entries.length + ' файл(ов)' + (failed ? ' · пропущено ' + failed : ''), 'ok');
    }).catch(function () {
      IT.ui.toast('Ошибка при сборке ZIP', 'error');
    });
  }

  IT.export = {
    refreshSize: refreshSize,
    downloadOne: downloadOne,
    downloadAll: downloadAll,
    saveBlob: saveBlob,
    fmtBytes: fmtBytes
  };
})(window.IT);
