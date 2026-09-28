(function () {
  var realFetch = window.fetch.bind(window),
    STORE = 'accImageProvider';
  function readImageProvider() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function saveImageProvider() {
    var base = document.getElementById('imageApiBase'),
      key = document.getElementById('imageApiKey');
    if (!base || !key) return;
    localStorage.setItem(
      STORE,
      JSON.stringify({ base: base.value.trim(), key: key.value.trim() })
    );
  }
  function jsonError(message, status) {
    return Promise.resolve(
      new Response(JSON.stringify({ error: { message: message } }), {
        status: status || 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/\/images\/generations(?:\?|$)/.test(url)) {
      var cfg = readImageProvider();
      if (!cfg.base || !cfg.key)
        return jsonError(
          'Image AI Provider belum diisi. Buka Settings lalu isi Image AI Base URL dan Image AI Key.',
          400
        );
      var target = String(cfg.base).replace(/\/$/, '') + '/images/generations',
        next = Object.assign({}, init || {}),
        headers = new Headers((init && init.headers) || {});
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', 'Bearer ' + cfg.key);
      next.headers = headers;
      return realFetch(target, next);
    }
    return realFetch(input, init);
  };
  function addFieldBefore(reference, labelText, id, type, placeholder, value) {
    if (document.getElementById(id) || !reference || !reference.parentNode)
      return;
    var label = document.createElement('label');
    label.textContent = labelText;
    var input = document.createElement('input');
    input.id = id;
    input.className = 'input';
    input.type = type || 'text';
    input.placeholder = placeholder || '';
    input.value = value || '';
    reference.parentNode.insertBefore(label, reference);
    reference.parentNode.insertBefore(input, reference);
  }
  function enhanceSettings() {
    var imageModel = document.getElementById('imageModel');
    if (!imageModel) return;
    var cfg = readImageProvider(),
      labels = document.querySelectorAll('label'),
      imageLabel = null;
    for (var i = 0; i < labels.length; i++) {
      var t = labels[i].textContent.trim();
      if (t === 'Image model' || t === 'Image AI Model') {
        imageLabel = labels[i];
        if (t !== 'Image AI Model') labels[i].textContent = 'Image AI Model';
        break;
      }
    }
    if (!imageLabel) return;
    addFieldBefore(
      imageLabel,
      'Image AI Base URL',
      'imageApiBase',
      'url',
      'https://image-provider.example/v1',
      cfg.base || ''
    );
    addFieldBefore(
      imageLabel,
      'Image AI Key',
      'imageApiKey',
      'password',
      'Masukkan API key provider gambar',
      cfg.key || ''
    );
    var notes = document.querySelectorAll('.ai-note');
    for (var j = 0; j < notes.length; j++) {
      var txt = notes[j].textContent;
      if (
        txt.indexOf('Provider-agnostic mode') >= 0 ||
        txt.indexOf('Private-device mode') >= 0
      )
        notes[j].innerHTML =
          '<b>Text AI</b> dan <b>Image AI</b> sekarang terpisah. Contoh: Groq untuk riset/konten/caption, provider gambar lain untuk poster. Semua key disimpan lokal di perangkat dan tidak ditanam di APK.';
    }
  }
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      enhanceSettings();
    });
  }
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if (b && b.textContent.trim() === 'Save settings') saveImageProvider();
    },
    true
  );
  document.addEventListener('click', schedule, false);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  if (document.readyState !== 'loading') schedule();
})();
