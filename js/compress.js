/* i. Image — сборка выходного изображения и сжатие */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  IT.compress = {
    /* рендер baseCanvas с фильтрами (при необходимости с уменьшением) */
    render: function (image, opts) {
      opts = opts || {};
      var src = image.baseCanvas;
      var w = src.width;
      var h = src.height;

      if (opts.maxW || opts.maxH) {
        var fitted = IT.resize.fit(w, h, opts.maxW || w, opts.maxH || h, false);
        w = fitted.w;
        h = fitted.h;
      }

      var out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      var ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.filter = IT.filters.toCss(IT.state.filters[image.id] || {});
      ctx.drawImage(src, 0, 0, w, h);
      return out;
    },

    /* canvas -> Blob с учётом формата и качества */
    toBlob: function (image, opts) {
      opts = opts || {};
      var mime = opts.mime || 'image/jpeg';
      var canvas = IT.compress.render(image, opts);
      var quality = (mime === 'image/png') ? undefined
                  : (opts.quality != null ? opts.quality / 100 : 0.82);
      return IT.convert.canvasToBlob(canvas, mime, quality).then(function (blob) {
        return { canvas: canvas, blob: blob };
      });
    }
  };
})(window.IT);
