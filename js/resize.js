/* i. Image — расчёт размеров */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  IT.resize = {
    /* вписать w×h в рамку maxW×maxH с сохранением пропорций */
    fit: function (w, h, maxW, maxH, allowUpscale) {
      var ratio = Math.min(maxW / w, maxH / h);
      if (!allowUpscale) ratio = Math.min(ratio, 1);
      return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) };
    },

    /* подогнать вторую сторону под первую с сохранением пропорций */
    byWidth: function (w, h, targetW) {
      return { w: targetW, h: Math.max(1, Math.round(targetW * h / w)) };
    },

    byHeight: function (w, h, targetH) {
      return { w: Math.max(1, Math.round(targetH * w / h)), h: targetH };
    }
  };
})(window.IT);
