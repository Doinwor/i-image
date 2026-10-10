/* i. Image — загрузка файлов (drag&drop, выбор, буфер обмена) */
window.IT = window.IT || {};
(function (IT) {
  'use strict';

  var uid = 0;

  function isImage(file) {
    return file && /^image\//.test(file.type);
  }

  function makeThumb(img, size) {
    size = size || 96;
    var ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight);
    var w = Math.max(1, Math.round(img.naturalWidth * ratio));
    var h = Math.max(1, Math.round(img.naturalHeight * ratio));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  }

  function addFile(file) {
    var id = 'img_' + (++uid) + '_' + Date.now().toString(36);
    var url = URL.createObjectURL(file);
    var img = new Image();

    var item = {
      id: id,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      loading: true
    };
    IT.state.images.push(item);

    img.onload = function () {
      var base = document.createElement('canvas');
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      base.getContext('2d').drawImage(img, 0, 0);

      var original = document.createElement('canvas');
      original.width = img.naturalWidth;
      original.height = img.naturalHeight;
      original.getContext('2d').drawImage(img, 0, 0);

      item.baseCanvas = base;
      item.originalCanvas = original;
      item.width = img.naturalWidth;
      item.height = img.naturalHeight;
      item.thumb = (IT.ui && IT.ui.updateThumb) ? IT.ui.updateThumb(item) : makeThumb(img);
      item.loading = false;

      IT.state.filters[id] = IT.filters.defaults();
      IT.editor.initHistory(item);

      URL.revokeObjectURL(url);

      IT.ui.renderFileList();
      if (IT.state.selectedId === id) IT.editor.select(id);
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      IT.state.remove(id);
      IT.ui.renderFileList();
      IT.ui.toast('Не удалось открыть: ' + file.name, 'error');
    };

    img.src = url;
  }

  function handleFiles(fileList) {
    var files = [].slice.call(fileList || []).filter(isImage);
    if (!files.length) {
      IT.ui.toast('Поддерживаются только изображения', 'error');
      return;
    }

    /* новый проект, если его ещё нет */
    if (!IT.state.currentProject && IT.session && IT.session.newProject) {
      IT.state.currentProject = IT.session.newProject();
    }

    files.forEach(function (file) {
      addFile(file);
    });

    /* выбираем первый добавленный, если ничего не выбрано */
    if (!IT.state.selectedId) {
      var pending = IT.state.images.filter(function (x) { return x.loading; })[0];
      if (pending) IT.state.selectedId = pending.id;
    }
    IT.ui.renderFileList();
    IT.ui.showWorkspace();
    if (IT.ui.markDirty) IT.ui.markDirty();
    IT.ui.toast('Добавлено: ' + files.length, 'ok');
  }

  IT.uploader = { handleFiles: handleFiles, isImage: isImage };
})(window.IT);
