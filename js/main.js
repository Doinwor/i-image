/* i. Image — инициализация, состояние, экраны (главная проекта / редактор) */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  /* ─── состояние ─── */
  IT.state = {
    images: [],
    selectedId: null,
    filters: {},
    settings: { format: 'image/jpeg', quality: 82 },
    currentProject: null,
    projectDirty: false,

    selected: function () {
      for (var i = 0; i < this.images.length; i++) {
        if (this.images[i].id === this.selectedId) return this.images[i];
      }
      return null;
    },

    byId: function (id) {
      for (var i = 0; i < this.images.length; i++) {
        if (this.images[i].id === id) return this.images[i];
      }
      return null;
    },

    remove: function (id) {
      this.images = this.images.filter(function (x) { return x.id !== id; });
      delete this.filters[id];
      if (this.selectedId === id) {
        this.selectedId = this.images.length ? this.images[0].id : null;
      }
    }
  };

  var el = {};
  IT.el = el;
  IT.ui = {};

  /* ─── виды (home / editor) ─── */
  var views = {
    current: 'home',
    show: function (name) {
      if (el.viewHome) el.viewHome.hidden = name !== 'home';
      if (el.viewEditor) el.viewEditor.hidden = name !== 'editor';
      views.current = name;
      if (name === 'home') renderProjectsGrid();
      window.scrollTo(0, 0);
    }
  };
  IT.views = views;

  function $(id) { return document.getElementById(id); }

  /* ─── утилиты интерфейса ─── */
  function toast(msg, type) {
    if (!el.toasts) return;
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast--' + type : '');
    t.textContent = msg;
    el.toasts.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, 2600);
  }

  function formatFilterValue(key, value) {
    if (key === 'blur') return value + '\u00A0px';
    if (key === 'hue') return value + '°';
    return value + '%';
  }

  function setSaveState(msg, cls) {
    if (!el.saveState) return;
    el.saveState.textContent = msg;
    el.saveState.className = 'save-state' + (cls ? ' ' + cls : '');
  }

  function markDirty() {
    IT.state.projectDirty = true;
    setSaveState('Не сохранено', 'is-unsaved');
  }

  function updateProjectMeta() {
    if (!el.projectMeta) return;
    var n = IT.state.images.length;
    var label = n === 0 ? '—' : (n === 1 ? '1 файл' : n + ' файл(ов)');
    var f = (IT.state.settings.format || 'image/jpeg').replace('image/', '').toUpperCase();
    el.projectMeta.textContent = label + ' · ' + f + ' · ' + IT.state.settings.quality + '%';
  }

  function syncProjectName() {
    if (!el.projectName) return;
    el.projectName.value = IT.state.currentProject ? IT.state.currentProject.name : '';
    updateProjectMeta();
    setSaveState('', '');
  }

  function renderFileList() {
    if (!el.filelist) return;
    el.filelist.innerHTML = '';
    el.filesCount.textContent = IT.state.images.length;
    updateProjectMeta();

    if (!IT.state.images.length) {
      var empty = document.createElement('li');
      empty.className = 'files-empty';
      empty.textContent = 'Нет файлов';
      el.filelist.appendChild(empty);
      return;
    }

    IT.state.images.forEach(function (image) {
      var li = document.createElement('li');
      li.className = 'file-item' + (image.id === IT.state.selectedId ? ' is-active' : '');
      li.setAttribute('data-id', image.id);

      var thumb = document.createElement('img');
      thumb.className = 'file-item__thumb';
      thumb.alt = '';
      if (image.thumb) thumb.src = image.thumb;

      var info = document.createElement('div');
      info.className = 'file-item__info';
      var nm = document.createElement('div');
      nm.className = 'file-item__name';
      nm.textContent = image.name;
      nm.title = image.name;
      var mt = document.createElement('div');
      mt.className = 'file-item__meta';
      mt.textContent = image.loading
        ? 'загрузка…'
        : (image.width + '×' + image.height + ' · ' + IT.export.fmtBytes(image.size));
      info.appendChild(nm);
      info.appendChild(mt);

      var del = document.createElement('button');
      del.className = 'file-item__del';
      del.type = 'button';
      del.textContent = '×';
      del.setAttribute('aria-label', 'Удалить');
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        removeImage(image.id);
      });

      li.appendChild(thumb);
      li.appendChild(info);
      li.appendChild(del);
      li.addEventListener('click', function () { IT.editor.select(image.id); });

      el.filelist.appendChild(li);
    });
  }

  function updateMeta(image) {
    if (!el.imgMeta) return;
    if (!image || !image.baseCanvas) { el.imgMeta.textContent = '—'; return; }
    el.imgMeta.textContent =
      image.baseCanvas.width + '×' + image.baseCanvas.height +
      ' · ' + IT.export.fmtBytes(image.size) +
      ' · ' + (image.type || '').replace('image/', '').toUpperCase();
  }

  function makeThumbFromCanvas(base, filters, size) {
    size = size || 96;
    var w = base.width, h = base.height;
    var ratio = Math.min(size / w, size / h);
    var tw = Math.max(1, Math.round(w * ratio));
    var th = Math.max(1, Math.round(h * ratio));
    var c = document.createElement('canvas');
    c.width = tw; c.height = th;
    var ctx = c.getContext('2d');
    ctx.filter = IT.filters.toCss(filters || {});
    ctx.drawImage(base, 0, 0, tw, th);
    return c.toDataURL('image/jpeg', 0.72);
  }

  /* превью в списке файлов — всегда соответствует текущему состоянию */
  function updateThumb(image) {
    if (!image || !image.baseCanvas) return null;
    var url = makeThumbFromCanvas(image.baseCanvas, IT.state.filters[image.id] || {});
    image.thumb = url;
    if (el.filelist) {
      var li = el.filelist.querySelector('.file-item[data-id="' + image.id + '"]');
      var im = li && li.querySelector('.file-item__thumb');
      if (im && im.src !== url) im.src = url;
    }
    return url;
  }

  function showWorkspace() {
    if (el.workspace) el.workspace.hidden = false;
    if (el.exports) el.exports.hidden = false;
    views.show('editor');
    syncProjectName();
  }

  /* ─── проекты ─── */
  function saveCurrentProject(silent) {
    var p = IT.state.currentProject;
    if (!p) return Promise.resolve(null);
    if (!IT.state.images.length) return Promise.resolve(null);
    if (p.name && p.name.trim()) p.name = p.name.trim();

    setSaveState('Сохраняю…', 'is-saving');
    return IT.session.collect().then(function (record) {
      return IT.projects.put(record);
    }).then(function (rec) {
      IT.state.projectDirty = false;
      updateProjectMeta();
      setSaveState('Сохранено', 'is-saved');
      renderProjectsGrid();
      if (!silent) toast('Проект сохранён: ' + rec.name, 'ok');
      return rec;
    }).catch(function () {
      setSaveState('Ошибка сохранения', 'is-error');
      toast('Не удалось сохранить проект', 'error');
      return null;
    });
  }

  function openProject(rec) {
    IT.views.show('editor');
    el.workspace.hidden = false;
    el.exports.hidden = false;
    IT.session.apply(rec).then(function () {
      el.format.value = IT.state.settings.format;
      el.quality.value = IT.state.settings.quality;
      el.qualityVal.textContent = IT.state.settings.quality + '%';
      syncProjectName();
      renderFileList();
      if (IT.state.selectedId) IT.editor.select(IT.state.selectedId);
      IT.export.refreshSize();
      toast('Открыт проект: ' + rec.name, 'ok');
    }).catch(function () {
      toast('Не удалось открыть проект', 'error');
      IT.views.show('home');
    });
  }

  function deleteProject(rec) {
    if (!window.confirm('Удалить проект «' + rec.name + '»?')) return;
    IT.projects.del(rec.id).then(function () {
      toast('Проект удалён', 'ok');
      renderProjectsGrid();
    }).catch(function () {
      toast('Не удалось удалить проект', 'error');
    });
  }

  function renderProjectsGrid() {
    if (!el.projectsGrid) return;
    if (!IT.projects.available) {
      el.projectsGrid.innerHTML = '';
      var na = document.createElement('p');
      na.className = 'projects-empty';
      na.textContent = 'Хранилище проектов недоступно в этом браузере.';
      el.projectsGrid.appendChild(na);
      return;
    }
    IT.projects.getAll().then(function (list) {
      list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      el.projectsGrid.innerHTML = '';
      if (!list.length) {
        var empty = document.createElement('p');
        empty.className = 'projects-empty';
        empty.textContent = 'Пока пусто. Перетащите картинки в зону выше — проект сохранится локально.';
        el.projectsGrid.appendChild(empty);
        return;
      }
      list.forEach(function (rec) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'project-tile';
        card.setAttribute('data-id', rec.id);

        var cover = document.createElement('div');
        cover.className = 'project-tile__cover';
        if (rec.cover) {
          var im = document.createElement('img');
          im.src = rec.cover;
          im.alt = '';
          cover.appendChild(im);
        }

        var nm = document.createElement('div');
        nm.className = 'project-tile__name';
        nm.textContent = rec.name;
        nm.title = rec.name;

        var mt = document.createElement('div');
        mt.className = 'project-tile__meta';
        mt.textContent = (rec.count || 0) + ' файл(ов) · ' + IT.session.shortDate(rec.updatedAt || rec.createdAt);

        var del = document.createElement('button');
        del.className = 'project-tile__del';
        del.type = 'button';
        del.textContent = '×';
        del.setAttribute('aria-label', 'Удалить проект');
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteProject(rec);
        });

        card.appendChild(cover);
        card.appendChild(nm);
        card.appendChild(mt);
        card.appendChild(del);
        card.addEventListener('click', function () { openProject(rec); });

        el.projectsGrid.appendChild(card);
      });
    });
  }

  function resetWorkspace() {
    IT.state.images = [];
    IT.state.filters = {};
    IT.state.selectedId = null;
    IT.state.currentProject = null;
    IT.state.projectDirty = false;
    if (el.workspace) el.workspace.hidden = true;
    if (el.exports) el.exports.hidden = true;
    if (el.canvasWrap) el.canvasWrap.hidden = true;
    if (el.stageEmpty) el.stageEmpty.hidden = false;
    if (el.compareToggle) el.compareToggle.checked = false;
    if (el.canvasWrap) el.canvasWrap.classList.remove('is-compare');
    if (el.compareLine) el.compareLine.hidden = true;
    if (el.projectName) el.projectName.value = '';
    if (el.undoBtn) el.undoBtn.disabled = true;
    if (el.redoBtn) el.redoBtn.disabled = true;
    updateProjectMeta();
    setSaveState('', '');
    renderFileList();
  }

  function backHome() {
    saveCurrentProject(true).then(function () {
      resetWorkspace();
      views.show('home');
    });
  }

  /* ─── кэш DOM ─── */
  function cacheDom() {
    el.viewHome = $('viewHome');
    el.viewEditor = $('viewEditor');
    el.dropzone = $('dropzone');
    el.fileInput = $('fileInput');
    el.pickBtn = $('pickBtn');
    el.newProjectBtn = $('newProjectBtn');
    el.projectsBlock = $('projectsBlock');
    el.projectsGrid = $('projectsGrid');
    el.backHomeBtn = $('backHomeBtn');
    el.saveProjectBtn = $('saveProjectBtn');
    el.projectName = $('projectName');
    el.projectMeta = $('projectMeta');
    el.saveState = $('saveState');
    el.workspace = $('workspace');
    el.exports = $('exports');
    el.filelist = $('filelist');
    el.filesCount = $('filesCount');
    el.clearAllBtn = $('clearAllBtn');
    el.addMoreBtn = $('addMoreBtn');
    el.stageEmpty = $('stageEmpty');
    el.canvasWrap = $('canvasWrap');
    el.previewCanvas = $('previewCanvas');
    el.beforeCanvas = $('beforeCanvas');
    el.cropOverlay = $('cropOverlay');
    el.cropBox = $('cropBox');
    el.compareLine = $('compareLine');
    el.compareToggle = $('compareToggle');
    el.imgMeta = $('imgMeta');
    el.tabs = $('tabs');
    el.toolsPanel = document.querySelector('.tools-panel');
    el.cropToggle = $('cropToggle');
    el.cropApplyBtn = $('cropApplyBtn');
    el.cropHint = $('cropHint');
    el.undoBtn = $('undoBtn');
    el.redoBtn = $('redoBtn');
    el.filterPresets = $('filterPresets');
    el.filterSliders = $('filterSliders');
    el.sizePresets = $('sizePresets');
    el.rw = $('rw');
    el.rh = $('rh');
    el.keepAspect = $('keepAspect');
    el.format = $('format');
    el.quality = $('quality');
    el.qualityVal = $('qualityVal');
    el.sizeBefore = $('sizeBefore');
    el.sizeAfter = $('sizeAfter');
    el.sizeSave = $('sizeSave');
    el.presetStrip = $('presetStrip');
    el.exportsActions = document.querySelector('.exports__actions');
    el.markText = $('markText');
    el.markColor = $('markColor');
    el.markOpacity = $('markOpacity');
    el.markOpacityVal = $('markOpacityVal');
    el.markSize = $('markSize');
    el.markSizeVal = $('markSizeVal');
    el.markPos = $('markPos');
    el.toasts = $('toasts');
    el.themeToggle = $('themeToggle');
    el.compareSwitchEl = el.canvasWrap;
  }

  /* ─── тема ─── */
  function bindTheme() {
    var stored = localStorage.getItem('i-image-theme');
    if (stored) document.documentElement.setAttribute('data-theme', stored);
    syncThemeColor();
    el.themeToggle.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? '' : 'dark';
      document.documentElement.setAttribute('data-theme', next || '');
      localStorage.setItem('i-image-theme', next || '');
      syncThemeColor();
    });
  }

  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content',
      document.documentElement.getAttribute('data-theme') === 'dark' ? '#0a0a10' : '#f6f6f4');
  }

  /* ─── загрузка ─── */
  function bindDropzone() {
    ['dragenter', 'dragover'].forEach(function (ev) {
      el.dropzone.addEventListener(ev, function (e) {
        e.preventDefault(); e.stopPropagation();
        el.dropzone.classList.add('is-drag');
      });
    });
    el.dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      el.dropzone.classList.remove('is-drag');
    });
    el.dropzone.addEventListener('drop', function (e) {
      e.preventDefault(); e.stopPropagation();
      el.dropzone.classList.remove('is-drag');
      if (e.dataTransfer && e.dataTransfer.files) IT.uploader.handleFiles(e.dataTransfer.files);
    });
    el.dropzone.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.fileInput.click(); }
    });
    el.pickBtn.addEventListener('click', function (e) { e.stopPropagation(); el.fileInput.click(); });
    el.addMoreBtn.addEventListener('click', function () { el.fileInput.click(); });
    el.fileInput.addEventListener('change', function () {
      IT.uploader.handleFiles(el.fileInput.files);
      el.fileInput.value = '';
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        IT.uploader.handleFiles(e.dataTransfer.files);
      }
    });
  }

  function bindPaste() {
    window.addEventListener('paste', function (e) {
      if (!e.clipboardData || !e.clipboardData.items) return;
      var files = [];
      for (var i = 0; i < e.clipboardData.items.length; i++) {
        var it = e.clipboardData.items[i];
        if (it.type.indexOf('image') === 0) {
          var f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) { e.preventDefault(); IT.uploader.handleFiles(files); }
    });
  }

  /* ─── экраны и проект ─── */
  function bindViews() {
    if (el.backHomeBtn) {
      el.backHomeBtn.addEventListener('click', backHome);
    }
    if (el.saveProjectBtn) {
      el.saveProjectBtn.addEventListener('click', function () { saveCurrentProject(false); });
    }
    if (el.newProjectBtn) {
      el.newProjectBtn.addEventListener('click', function () {
        resetWorkspace();
        el.fileInput.click();
      });
    }
    if (el.projectName) {
      el.projectName.addEventListener('input', function () {
        if (!IT.state.currentProject) return;
        IT.state.currentProject.name = el.projectName.value;
        markDirty();
      });
    }
  }

  /* ─── вкладки ─── */
  function bindTabs() {
    el.tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      var name = btn.getAttribute('data-tab');
      [].forEach.call(el.tabs.querySelectorAll('.tab'), function (t) {
        t.classList.toggle('is-active', t === btn);
      });
      [].forEach.call(document.querySelectorAll('.tab-panel'), function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-panel') === name);
      });
    });
  }

  /* ─── инструменты ─── */
  function bindToolButtons() {
    el.toolsPanel.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var needImage = ['rotate-left', 'rotate-right', 'flip-h', 'flip-v', 'crop-toggle',
                       'crop-apply', 'undo', 'redo', 'reset', 'resize-apply', 'mark-apply'];
      if (needImage.indexOf(act) !== -1 && !IT.state.selected()) {
        toast('Сначала выберите файл', 'error');
        return;
      }
      switch (act) {
        case 'rotate-left': IT.editor.rotate(-1); break;
        case 'rotate-right': IT.editor.rotate(1); break;
        case 'flip-h': IT.editor.flip('h'); break;
        case 'flip-v': IT.editor.flip('v'); break;
        case 'crop-toggle': toggleCrop(); break;
        case 'crop-apply': IT.editor.applyCrop(); break;
        case 'crop-cancel': IT.editor.cancelCrop(); break;
        case 'undo': IT.editor.undo(); break;
        case 'redo': IT.editor.redo(); break;
        case 'reset': IT.editor.reset(); break;
        case 'resize-apply': applyResize(); break;
        case 'resize-apply-all': applyResizeAll(); break;
        case 'mark-apply': applyMark(); break;
        case 'mark-apply-all': applyMarkAll(); break;
      }
    });
  }

  function toggleCrop() {
    var on = !IT.crop.isActive();
    IT.crop.setActive(on);
    el.cropToggle.classList.toggle('is-active', on);
    el.cropApplyBtn.disabled = true;
    el.cropHint.textContent = on
      ? 'Потяните мышкой по холсту — появится рамка выделения.'
      : 'Потяните мышкой по холсту, затем «Применить».';
  }

  function applyResize() {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;
    var w = parseInt(el.rw.value, 10);
    var h = parseInt(el.rh.value, 10);
    if (!w || !h || w < 1 || h < 1) { toast('Неверные размеры', 'error'); return; }
    IT.editor.resize(w, h);
    toast('Размер: ' + w + '×' + h, 'ok');
  }

  /* ─── фильтры ─── */
  function bindFilters() {
    el.filterSliders.addEventListener('input', function (e) {
      var input = e.target.closest('input[data-filter]');
      if (!input) return;
      var image = IT.state.selected();
      if (!image) return;
      var key = input.getAttribute('data-filter');
      var f = IT.state.filters[image.id] || (IT.state.filters[image.id] = IT.filters.defaults());
      f[key] = parseFloat(input.value);
      var label = el.filterSliders.querySelector('[data-val-for="' + key + '"]');
      if (label) label.textContent = formatFilterValue(key, input.value);
      setActiveChip(activePresetName(f));
      IT.editor.render();
      IT.export.refreshSize();
      markDirty();
      if (IT.ui.updateThumb) IT.ui.updateThumb(image);
    });

    el.filterPresets.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter-preset]');
      if (!chip) return;
      var image = IT.state.selected();
      if (!image) { toast('Сначала выберите файл', 'error'); return; }
      var name = chip.getAttribute('data-filter-preset');
      var f = Object.assign(IT.filters.defaults(), IT.filters.presets[name] || {});
      IT.state.filters[image.id] = f;
      syncFilterControls(f);
      IT.editor.render();
      IT.export.refreshSize();
      markDirty();
      if (IT.ui.updateThumb) IT.ui.updateThumb(image);
    });
  }

  function activePresetName(f) {
    var active = null;
    Object.keys(IT.filters.presets).forEach(function (name) {
      if (matchesPreset(f, IT.filters.presets[name])) active = name;
    });
    return active;
  }

  function setActiveChip(activeName) {
    [].forEach.call(el.filterPresets.querySelectorAll('.chip'), function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-filter-preset') === activeName);
    });
  }

  function syncFilterControls(f) {
    f = Object.assign(IT.filters.defaults(), f || {});
    IT.filters.keys.forEach(function (k) {
      var input = el.filterSliders.querySelector('input[data-filter="' + k + '"]');
      if (input) input.value = f[k];
      var label = el.filterSliders.querySelector('[data-val-for="' + k + '"]');
      if (label) label.textContent = formatFilterValue(k, f[k]);
    });
    var active = null;
    Object.keys(IT.filters.presets).forEach(function (name) {
      if (matchesPreset(f, IT.filters.presets[name])) active = name;
    });
    setActiveChip(active);
  }

  function matchesPreset(f, patch) {
    var expected = Object.assign(IT.filters.defaults(), patch);
    return IT.filters.keys.every(function (k) { return f[k] === expected[k]; });
  }

  /* ─── размеры ─── */
  function bindResize() {
    el.rw.addEventListener('input', function () { if (el.keepAspect.checked) syncAspect('w'); });
    el.rh.addEventListener('input', function () { if (el.keepAspect.checked) syncAspect('h'); });
    el.sizePresets.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-w]');
      if (!chip) return;
      el.rw.value = chip.getAttribute('data-w');
      el.rh.value = chip.getAttribute('data-h');
      applyResize();
    });
  }

  function syncAspect(from) {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;
    var ratio = image.baseCanvas.width / image.baseCanvas.height;
    if (from === 'w') {
      var w = parseInt(el.rw.value, 10);
      if (w > 0) el.rh.value = Math.max(1, Math.round(w / ratio));
    } else {
      var h = parseInt(el.rh.value, 10);
      if (h > 0) el.rw.value = Math.max(1, Math.round(h * ratio));
    }
  }

  function renderSizePresets() {
    el.sizePresets.innerHTML = '';
    IT.presets.social.forEach(function (p) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.setAttribute('data-w', p.w);
      b.setAttribute('data-h', p.h);
      b.textContent = p.label + ' · ' + p.w + '×' + p.h;
      el.sizePresets.appendChild(b);
    });
  }

  /* ─── экспорт ─── */
  function bindExportBar() {
    el.format.addEventListener('change', function () {
      var mime = el.format.value;
      if (!IT.convert.supports(mime)) {
        toast('Формат не поддерживается этим браузером', 'error');
        el.format.value = IT.state.settings.format;
        return;
      }
      IT.state.settings.format = mime;
      IT.export.refreshSize();
      updateProjectMeta();
      markDirty();
    });

    el.quality.addEventListener('input', function () {
      IT.state.settings.quality = parseInt(el.quality.value, 10);
      el.qualityVal.textContent = el.quality.value + '%';
      updateProjectMeta();
    });
    el.quality.addEventListener('change', function () {
      IT.export.refreshSize();
      markDirty();
    });

    el.exportsActions.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'download-one') IT.export.downloadOne();
      if (act === 'download-all') IT.export.downloadAll();
      if (act === 'save-preset') savePreset();
    });
  }

  function applyFormatSupport() {
    IT.presets.formats.forEach(function (fm) {
      var opt = el.format.querySelector('option[value="' + fm.mime + '"]');
      if (!opt) return;
      var ok = IT.convert.supports(fm.mime);
      opt.disabled = !ok;
      opt.textContent = fm.label + (ok ? '' : ' — недоступно');
    });
    if (!IT.convert.supports(IT.state.settings.format)) {
      IT.state.settings.format = 'image/jpeg';
      el.format.value = 'image/jpeg';
    }
  }

  /* ─── пресеты пользователя ─── */
  function savePreset() {
    var name = prompt('Название пресета:', 'Пресет ' + (IT.presets.saved.length + 1));
    if (!name) return;
    var image = IT.state.selected();
    IT.presets.add(name.trim(), {
      format: IT.state.settings.format,
      quality: IT.state.settings.quality,
      filters: image ? Object.assign({}, IT.state.filters[image.id]) : null
    });
    renderSavedPresets();
    toast('Пресет сохранён', 'ok');
  }

  function renderSavedPresets() {
    el.presetStrip.innerHTML = '';
    if (!IT.presets.saved.length) {
      var hint = document.createElement('span');
      hint.className = 'hint';
      hint.style.margin = '0';
      hint.textContent = 'Пресетов пока нет — настройте и нажмите «В пресеты».';
      el.presetStrip.appendChild(hint);
      return;
    }
    IT.presets.saved.forEach(function (p) {
      var chip = document.createElement('span');
      chip.className = 'preset-chip';
      var label = document.createElement('span');
      label.textContent = p.name;
      var x = document.createElement('button');
      x.className = 'preset-chip__x';
      x.type = 'button';
      x.textContent = '×';
      x.setAttribute('aria-label', 'Удалить пресет');
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        IT.presets.remove(p.id);
        renderSavedPresets();
      });
      chip.addEventListener('click', function () { applyPreset(p); });
      chip.appendChild(label);
      chip.appendChild(x);
      el.presetStrip.appendChild(chip);
    });
  }

  function applyPreset(p) {
    var s = p.settings || {};
    if (s.format && IT.convert.supports(s.format)) {
      IT.state.settings.format = s.format;
      el.format.value = s.format;
    }
    if (s.quality != null) {
      IT.state.settings.quality = s.quality;
      el.quality.value = s.quality;
      el.qualityVal.textContent = s.quality + '%';
    }
    var image = IT.state.selected();
    if (image && s.filters) {
      IT.state.filters[image.id] = Object.assign(IT.filters.defaults(), s.filters);
      syncFilterControls(IT.state.filters[image.id]);
      IT.editor.render();
    }
    IT.export.refreshSize();
    updateProjectMeta();
    markDirty();
    if (IT.ui.updateThumb && image) IT.ui.updateThumb(image);
    toast('Пресет применён: ' + p.name, 'ok');
  }

  /* ─── удаление ─── */
  function removeImage(id) {
    var wasSelected = IT.state.selectedId === id;
    IT.state.remove(id);
    markDirty();
    if (!IT.state.images.length) {
      resetWorkspace();
      views.show('home');
      return;
    }
    if (wasSelected) IT.editor.select(IT.state.selectedId);
    renderFileList();
  }

  function clearAll() {
    if (!IT.state.images.length) return;
    if (!window.confirm('Удалить все файлы из списка?')) return;
    resetWorkspace();
    views.show('home');
  }

  /* ─── знак (водяной знак / текст) ─── */
  var markPosSel = 'br';

  function bindMark() {
    el.markOpacity.addEventListener('input', function () {
      el.markOpacityVal.textContent = el.markOpacity.value + '%';
    });
    el.markSize.addEventListener('input', function () {
      el.markSizeVal.textContent = el.markSize.value + '%';
    });
    el.markPos.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pos]');
      if (!b) return;
      markPosSel = b.getAttribute('data-pos');
      [].forEach.call(el.markPos.querySelectorAll('.chip'), function (c) {
        c.classList.toggle('is-active', c === b);
      });
    });
  }

  function makeMarkOpts() {
    var text = el.markText.value.trim();
    if (!text) return null;
    return {
      text: text,
      color: el.markColor.value,
      opacity: parseInt(el.markOpacity.value, 10) / 100,
      sizePct: parseInt(el.markSize.value, 10),
      pos: markPosSel
    };
  }

  function applyMark() {
    var opts = makeMarkOpts();
    var image = IT.state.selected();
    if (!opts) { toast('Введите текст знака', 'error'); return; }
    if (!image || !image.baseCanvas) { toast('Сначала выберите файл', 'error'); return; }
    IT.editor.addTextMark(image, opts);
  }

  function applyMarkAll() {
    var opts = makeMarkOpts();
    if (!opts) { toast('Введите текст знака', 'error'); return; }
    withAllConfirm(function (image) { IT.editor.addTextMark(image, opts); });
  }

  function applyResizeAll() {
    var w = parseInt(el.rw.value, 10);
    var h = parseInt(el.rh.value, 10);
    if (!w || !h || w < 1 || h < 1) { toast('Неверные размеры', 'error'); return; }
    withAllConfirm(function (image) {
      var tw = w, th = h;
      if (el.keepAspect.checked) {
        var ratio = image.baseCanvas.width / image.baseCanvas.height;
        th = Math.max(1, Math.round(tw / ratio));
      }
      IT.editor.resize(tw, th);
    });
  }

  /* применить операцию ко всем файлам; подтверждение — только если их больше одного */
  function withAllConfirm(fn) {
    var imgs = IT.state.images.filter(function (x) { return !x.loading && x.baseCanvas; });
    if (!imgs.length) { toast('Сначала добавьте файлы в проект', 'error'); return; }
    if (imgs.length > 1) {
      if (!window.confirm('Точно применить ко всем картинкам в проекте?')) return;
    }
    imgs.forEach(fn);
    toast('Применено ко всем: ' + imgs.length, 'ok');
  }

  /* ─── сравнение до/после ─── */
  function bindCompare() {
    el.compareToggle.addEventListener('change', function () {
      var on = el.compareToggle.checked;
      el.canvasWrap.classList.toggle('is-compare', on);
      el.compareLine.hidden = !on;
    });
  }

  /* ─── горячие клавиши ─── */
  function isEditableTarget(e) {
    var t = e.target;
    if (!t) return false;
    if (t.isContentEditable) return true;
    var tag = (t.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function bindShortcuts() {
    window.addEventListener('keydown', function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (isEditableTarget(e)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); IT.editor.undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); IT.editor.redo(); }
      else if (e.key === 's') { e.preventDefault(); IT.export.downloadOne(); }
    });
  }

  /* ─── reveal ─── */
  function reveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length || !('IntersectionObserver' in window)) {
      [].forEach.call(els, function (e) { e.classList.add('visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    [].forEach.call(els, function (e) { obs.observe(e); });
  }

  /* ─── service worker (PWA) ─── */
  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  /* ─── init ─── */
  function init() {
    cacheDom();
    IT.presets.load();
    bindTheme();
    bindDropzone();
    bindPaste();
    bindViews();
    bindTabs();
    bindToolButtons();
    bindFilters();
    bindResize();
    bindExportBar();
    bindMark();
    bindCompare();
    bindShortcuts();

    IT.crop.init(el.cropOverlay, el.cropBox);

    renderSizePresets();
    renderSavedPresets();
    applyFormatSupport();

    el.format.value = IT.state.settings.format;
    el.quality.value = IT.state.settings.quality;
    el.qualityVal.textContent = IT.state.settings.quality + '%';
    el.clearAllBtn.addEventListener('click', clearAll);

    views.show('home');
    renderFileList();
    renderProjectsGrid();
    reveal();
    registerSW();
  }

  IT.main = { init: init };

  IT.ui.toast = toast;
  IT.ui.renderFileList = renderFileList;
  IT.ui.updateMeta = updateMeta;
  IT.ui.updateThumb = updateThumb;
  IT.ui.showWorkspace = showWorkspace;
  IT.ui.syncFilterControls = syncFilterControls;
  IT.ui.markDirty = markDirty;
  IT.ui.saveCurrentProject = saveCurrentProject;
  IT.ui.renderProjectsGrid = renderProjectsGrid;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.IT);