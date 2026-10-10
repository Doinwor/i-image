/* i. Image — ядро редактора: выбор, рендер, геометрия, история */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var HISTORY_LIMIT = 10;
  var pendingSelection = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function newCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  }

  function cloneCanvas(src) {
    var c = newCanvas(src.width, src.height);
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  /* ─── рендер предпросмотра ─── */
  function render() {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;

    var w = image.baseCanvas.width;
    var h = image.baseCanvas.height;

    IT.el.previewCanvas.width = w;
    IT.el.previewCanvas.height = h;
    var pctx = IT.el.previewCanvas.getContext('2d');
    pctx.filter = IT.filters.toCss(IT.state.filters[image.id] || {});
    pctx.drawImage(image.baseCanvas, 0, 0);

    IT.el.beforeCanvas.width = w;
    IT.el.beforeCanvas.height = h;
    var bctx = IT.el.beforeCanvas.getContext('2d');
    bctx.filter = 'none';
    bctx.drawImage(image.baseCanvas, 0, 0);

    updateMeta(image);
  }

  function updateMeta(image) {
    if (!IT.ui || !IT.ui.updateMeta) return;
    IT.ui.updateMeta(image);
  }

  /* ─── история ─── */
  function initHistory(image) {
    image.history = [image.baseCanvas.toDataURL('image/png')];
    image.historyIndex = 0;
    updateHistoryButtons(image);
  }

  function pushHistory(image) {
    if (!image.history) { initHistory(image); return; }
    image.history = image.history.slice(0, image.historyIndex + 1);
    image.history.push(image.baseCanvas.toDataURL('image/png'));
    if (image.history.length > HISTORY_LIMIT) image.history.shift();
    image.historyIndex = image.history.length - 1;
    updateHistoryButtons(image);
  }

  function restore(image, dataURL) {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        image.baseCanvas = cloneFromImage(im);
        render();
        resolve();
      };
      im.onerror = function () { resolve(); };
      im.src = dataURL;
    });
  }

  function cloneFromImage(im) {
    var c = newCanvas(im.naturalWidth, im.naturalHeight);
    c.getContext('2d').drawImage(im, 0, 0);
    return c;
  }

  function afterEdit(image) {
    pushHistory(image);
    syncSizeInputs(image);
    render();
    if (IT.export) IT.export.refreshSize();
    if (IT.ui && IT.ui.markDirty) IT.ui.markDirty();
    if (IT.ui && IT.ui.updateThumb) IT.ui.updateThumb(image);
  }

  function updateHistoryButtons(image) {
    if (!IT.el) return;
    if (IT.el.undoBtn) IT.el.undoBtn.disabled = !image || !image.history || image.historyIndex <= 0;
    if (IT.el.redoBtn) IT.el.redoBtn.disabled = !image || !image.history || image.historyIndex >= image.history.length - 1;
  }

  function syncSizeInputs(image) {
    if (!IT.el) return;
    if (IT.el.rw) IT.el.rw.value = image.baseCanvas.width;
    if (IT.el.rh) IT.el.rh.value = image.baseCanvas.height;
  }

  /* ─── выбор файла ─── */
  function select(id) {
    var image = IT.state.byId(id);
    if (!image) return;
    IT.state.selectedId = id;

    IT.crop.setActive(false);
    pendingSelection = null;
    if (IT.el.cropToggle) IT.el.cropToggle.classList.remove('is-active');
    if (IT.el.cropApplyBtn) IT.el.cropApplyBtn.disabled = true;

    if (IT.el.compareToggle) IT.el.compareToggle.checked = false;
    if (IT.el.canvasWrap) IT.el.canvasWrap.classList.remove('is-compare');
    if (IT.el.compareLine) IT.el.compareLine.hidden = true;

    if (IT.el.stageEmpty) IT.el.stageEmpty.hidden = true;
    if (IT.el.canvasWrap) IT.el.canvasWrap.hidden = false;

    var f = IT.state.filters[id] || (IT.state.filters[id] = IT.filters.defaults());
    if (IT.ui.syncFilterControls) IT.ui.syncFilterControls(f);

    if (image.baseCanvas) {
      syncSizeInputs(image);
      render();
    }
    updateHistoryButtons(image);
    if (IT.ui.renderFileList) IT.ui.renderFileList();
    if (IT.export) IT.export.refreshSize();
  }

  /* ─── геометрические операции ─── */
  function rotate(dir) {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;
    var src = image.baseCanvas;
    var c = newCanvas(src.height, src.width);
    var ctx = c.getContext('2d');
    if (dir > 0) { ctx.translate(c.width, 0); ctx.rotate(Math.PI / 2); }
    else { ctx.translate(0, c.height); ctx.rotate(-Math.PI / 2); }
    ctx.drawImage(src, 0, 0);
    image.baseCanvas = c;
    afterEdit(image);
  }

  function flip(axis) {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;
    var src = image.baseCanvas;
    var c = newCanvas(src.width, src.height);
    var ctx = c.getContext('2d');
    if (axis === 'h') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    else { ctx.translate(0, c.height); ctx.scale(1, -1); }
    ctx.drawImage(src, 0, 0);
    image.baseCanvas = c;
    afterEdit(image);
  }

  function resize(w, h) {
    var image = IT.state.selected();
    if (!image || !image.baseCanvas) return;
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    var c = newCanvas(w, h);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image.baseCanvas, 0, 0, w, h);
    image.baseCanvas = c;
    afterEdit(image);
  }

  function onCropChange(sel) {
    pendingSelection = sel;
    if (IT.el && IT.el.cropApplyBtn) IT.el.cropApplyBtn.disabled = !sel;
  }

  function applyCrop() {
    var image = IT.state.selected();
    if (!image || !pendingSelection) return;
    var src = image.baseCanvas;
    var x = clamp(Math.round(pendingSelection.x), 0, src.width - 1);
    var y = clamp(Math.round(pendingSelection.y), 0, src.height - 1);
    var w = clamp(Math.round(pendingSelection.w), 1, src.width - x);
    var h = clamp(Math.round(pendingSelection.h), 1, src.height - y);
    if (w < 2 || h < 2) { if (IT.ui.toast) IT.ui.toast('Слишком маленькая область', 'error'); return; }

    var c = newCanvas(w, h);
    c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
    image.baseCanvas = c;

    IT.crop.reset();
    IT.crop.setActive(false);
    pendingSelection = null;
    if (IT.el.cropToggle) IT.el.cropToggle.classList.remove('is-active');
    if (IT.el.cropApplyBtn) IT.el.cropApplyBtn.disabled = true;

    afterEdit(image);
    if (IT.ui.toast) IT.ui.toast('Обрезано: ' + w + '×' + h, 'ok');
  }

  function cancelCrop() {
    IT.crop.reset();
    IT.crop.setActive(false);
    pendingSelection = null;
    if (IT.el.cropToggle) IT.el.cropToggle.classList.remove('is-active');
    if (IT.el.cropApplyBtn) IT.el.cropApplyBtn.disabled = true;
  }

  /* ─── история: отмена/возврат/сброс ─── */
  function undo() {
    var image = IT.state.selected();
    if (!image || !image.history || image.historyIndex <= 0) return;
    image.historyIndex--;
    restore(image, image.history[image.historyIndex]).then(function () {
      syncSizeInputs(image);
      updateHistoryButtons(image);
      if (IT.export) IT.export.refreshSize();
      if (IT.ui && IT.ui.markDirty) IT.ui.markDirty();
      if (IT.ui && IT.ui.updateThumb) IT.ui.updateThumb(image);
    });
  }

  function redo() {
    var image = IT.state.selected();
    if (!image || !image.history || image.historyIndex >= image.history.length - 1) return;
    image.historyIndex++;
    restore(image, image.history[image.historyIndex]).then(function () {
      syncSizeInputs(image);
      updateHistoryButtons(image);
      if (IT.export) IT.export.refreshSize();
      if (IT.ui && IT.ui.markDirty) IT.ui.markDirty();
      if (IT.ui && IT.ui.updateThumb) IT.ui.updateThumb(image);
    });
  }

  function reset() {
    var image = IT.state.selected();
    if (!image || !image.originalCanvas) return;
    image.baseCanvas = cloneCanvas(image.originalCanvas);
    IT.state.filters[image.id] = IT.filters.defaults();
    if (IT.ui.syncFilterControls) IT.ui.syncFilterControls(IT.state.filters[image.id]);
    initHistory(image);
    syncSizeInputs(image);
    render();
    if (IT.export) IT.export.refreshSize();
    if (IT.ui && IT.ui.markDirty) IT.ui.markDirty();
    if (IT.ui && IT.ui.updateThumb) IT.ui.updateThumb(image);
    if (IT.ui && IT.ui.toast) IT.ui.toast('Сброшено к оригиналу', 'ok');
  }

  function addTextMark(image, o) {
    if (!image || !image.baseCanvas) return;
    var w = image.baseCanvas.width;
    var h = image.baseCanvas.height;
    var size = Math.max(8, Math.round(w * ((o.sizePct || 4) / 100)));
    var ctx = image.baseCanvas.getContext('2d');
    ctx.font = '600 ' + size + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = clamp(o.opacity == null ? 1 : o.opacity, 0, 1);
    ctx.fillStyle = o.color || '#ffffff';

    var tw = ctx.measureText(o.text).width;
    var pad = Math.max(8, Math.round(w * 0.04));
    var x, y;
    switch (o.pos) {
      case 'tl': x = pad; y = pad; break;
      case 'tc': x = Math.round((w - tw) / 2); y = pad; break;
      case 'tr': x = w - pad - tw; y = pad; break;
      case 'bl': x = pad; y = h - pad - size; break;
      case 'bc': x = Math.round((w - tw) / 2); y = h - pad - size; break;
      case 'cc': x = Math.round((w - tw) / 2); y = Math.round((h - size) / 2); break;
      default: x = w - pad - tw; y = h - pad - size; break; /* br */
    }
    ctx.fillText(o.text, Math.max(0, x), Math.max(0, y));
    ctx.globalAlpha = 1;
    afterEdit(image);
  }

  IT.editor = {
    initHistory: initHistory,
    select: select,
    render: render,
    rotate: rotate,
    flip: flip,
    resize: resize,
    applyCrop: applyCrop,
    cancelCrop: cancelCrop,
    onCropChange: onCropChange,
    addTextMark: addTextMark,
    undo: undo,
    redo: redo,
    reset: reset
  };
})(window.IT);
