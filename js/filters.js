/* i. Image — фильтры и цветокоррекция (неразрушающие) */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var DEFAULTS = {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    blur: 0,
    hue: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0
  };

  IT.filters = {
    defaults: function () { return Object.assign({}, DEFAULTS); },

    keys: Object.keys(DEFAULTS),

    presets: {
      none: {},
      bw: { grayscale: 100 },
      sepia: { sepia: 85 },
      vintage: { sepia: 45, contrast: 112, saturate: 82, brightness: 105 },
      vivid: { saturate: 150, contrast: 112, brightness: 103 }
    },

    toCss: function (f) {
      var v = Object.assign({}, DEFAULTS, f || {});
      return 'brightness(' + v.brightness + '%) ' +
             'contrast(' + v.contrast + '%) ' +
             'saturate(' + v.saturate + '%) ' +
             'blur(' + v.blur + 'px) ' +
             'hue-rotate(' + v.hue + 'deg) ' +
             'grayscale(' + v.grayscale + '%) ' +
             'sepia(' + v.sepia + '%) ' +
             'invert(' + v.invert + '%)';
    },

    isDefault: function (f) {
      var v = Object.assign({}, DEFAULTS, f || {});
      return IT.filters.keys.every(function (k) { return v[k] === DEFAULTS[k]; });
    }
  };
})(window.IT);
