/* i. Image — выделение области для обрезки */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var overlay = null, box = null;
  var active = false;
  var startPoint = null;
  var rect = null;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function localPoint(e) {
    var r = overlay.getBoundingClientRect();
    return {
      x: clamp(e.clientX - r.left, 0, r.width),
      y: clamp(e.clientY - r.top, 0, r.height),
      w: r.width,
      h: r.height
    };
  }

  function draw() {
    box.style.left = rect.x + 'px';
    box.style.top = rect.y + 'px';
    box.style.width = rect.w + 'px';
    box.style.height = rect.h + 'px';
    box.classList.add('is-on');
  }

  function onDown(e) {
    if (!active) return;
    var p = localPoint(e);
    startPoint = p;
    rect = { x: p.x, y: p.y, w: 0, h: 0 };
    draw();
    if (overlay.setPointerCapture) { try { overlay.setPointerCapture(e.pointerId); } catch (err) {} }
    e.preventDefault();
  }

  function onMove(e) {
    if (!active || !startPoint) return;
    var p = localPoint(e);
    rect = {
      x: Math.min(startPoint.x, p.x),
      y: Math.min(startPoint.y, p.y),
      w: Math.abs(p.x - startPoint.x),
      h: Math.abs(p.y - startPoint.y)
    };
    draw();
  }

  function onUp() {
    if (!startPoint) return;
    startPoint = null;
    if (!rect || rect.w < 6 || rect.h < 6) {
      rect = null;
      box.classList.remove('is-on');
      IT.editor.onCropChange(null);
      return;
    }
    IT.editor.onCropChange(mapToSource());
  }

  function mapToSource() {
    var image = IT.state.selected();
    if (!image || !rect) return null;
    var r = overlay.getBoundingClientRect();
    var sx = image.baseCanvas.width / r.width;
    var sy = image.baseCanvas.height / r.height;
    return {
      x: rect.x * sx,
      y: rect.y * sy,
      w: rect.w * sx,
      h: rect.h * sy
    };
  }

  IT.crop = {
    init: function (overlayEl, boxEl) {
      overlay = overlayEl;
      box = boxEl;
      overlay.addEventListener('pointerdown', onDown);
      overlay.addEventListener('pointermove', onMove);
      overlay.addEventListener('pointerup', onUp);
      overlay.addEventListener('pointercancel', onUp);
    },
    setActive: function (on) {
      active = !!on;
      if (overlay) overlay.classList.toggle('is-on', active);
      if (!active) {
        rect = null;
        startPoint = null;
        if (box) box.classList.remove('is-on');
      }
    },
    reset: function () {
      rect = null;
      startPoint = null;
      if (box) box.classList.remove('is-on');
    },
    isActive: function () { return active; }
  };
})(window.IT);
