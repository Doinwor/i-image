/* i. Image — запись ZIP-архива без внешних библиотек
   Формат ZIP, метод STORE (без сжатия), с корректным CRC32. */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var table = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(v) { return [v & 255, (v >>> 8) & 255]; }
  function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
  function enc(str) { return new TextEncoder().encode(str); }

  function create(entries) {
    var parts = [];
    var central = [];
    var offset = 0;

    entries.forEach(function (en) {
      var data = en.data instanceof Uint8Array ? en.data : new Uint8Array(en.data);
      var nameBytes = enc(en.name);
      var crc = crc32(data);

      var localHeader = new Uint8Array([].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length),
        u16(nameBytes.length), u16(0)
      ));

      parts.push(localHeader, nameBytes, data);

      central.push(new Uint8Array([].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
        u32(crc), u32(data.length), u32(data.length),
        u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)
      )), nameBytes);

      offset += localHeader.length + nameBytes.length + data.length;
    });

    var centralSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var centralOffset = offset;

    var eocd = new Uint8Array([].concat(
      u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(centralSize), u32(centralOffset), u16(0)
    ));

    return new Blob(parts.concat(central, [eocd]), { type: 'application/zip' });
  }

  IT.zip = { create: create, crc32: crc32 };
})(window.IT);
