/* i. Image — конвертация форматов через Canvas API */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var supportCache = {};

  function dataURLtoBlob(dataURL) {
    var parts = dataURL.split(',');
    var mimeMatch = parts[0].match(/:(.*?);/);
    var mime = mimeMatch ? mimeMatch[1] : 'image/png';
    var bin = atob(parts[1]);
    var len = bin.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  IT.convert = {
    canvasToBlob: function (canvas, mime, quality) {
      return new Promise(function (resolve) {
        if (canvas.toBlob) {
          canvas.toBlob(function (blob) { resolve(blob); }, mime, quality);
        } else {
          resolve(dataURLtoBlob(canvas.toDataURL(mime, quality)));
        }
      });
    },

    /* определяем, реально ли браузер кодирует формат */
    supports: function (mime) {
      if (supportCache[mime] != null) return supportCache[mime];
      var ok = false;
      try {
        var c = document.createElement('canvas');
        c.width = c.height = 1;
        ok = c.toDataURL(mime).indexOf(mime) !== -1;
      } catch (e) {
        ok = false;
      }
      supportCache[mime] = ok;
      return ok;
    }
  };
})(window.IT);
