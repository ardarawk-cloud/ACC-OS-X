(function () {
  function relabel() {
    var labels = document.querySelectorAll('label');
    for (var i = 0; i < labels.length; i++) {
      var t = labels[i].textContent.trim();
      if (t === 'OpenAI API key') labels[i].textContent = 'AI API Key';
      if (t === 'API Base URL') labels[i].textContent = 'AI API Base URL';
    }
    var key = document.getElementById('apiKey');
    if (key && key.placeholder !== 'Masukkan API key provider AI')
      key.placeholder = 'Masukkan API key provider AI';
    var base = document.getElementById('apiBase');
    if (base && base.placeholder !== 'https://provider-api.example/v1')
      base.placeholder = 'https://provider-api.example/v1';
    var format = document.getElementById('format');
    if (format) {
      var found = false;
      for (var k = 0; k < format.options.length; k++)
        if (
          format.options[k].value === 'Short Video Package' ||
          format.options[k].text === 'Short Video Package'
        ) {
          found = true;
          break;
        }
      if (!found) {
        var opt = document.createElement('option');
        opt.value = 'Short Video Package';
        opt.text = 'Short Video Package';
        format.appendChild(opt);
      }
    }
    var notes = document.querySelectorAll('.ai-note');
    for (var j = 0; j < notes.length; j++) {
      if (notes[j].textContent.indexOf('Private-device mode') >= 0) {
        notes[j].innerHTML =
          'Provider-agnostic mode. Isi <b>AI API Base URL</b>, <b>AI API Key</b>, serta nama model dari provider yang dipakai. Provider harus kompatibel dengan endpoint OpenAI-style yang digunakan Content Hub. API key disimpan lokal di perangkat dan tidak ditanam di source APK.';
      }
    }
  }
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      relabel();
    });
  }
  document.addEventListener('click', schedule, false);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  if (document.readyState !== 'loading') schedule();
})();
