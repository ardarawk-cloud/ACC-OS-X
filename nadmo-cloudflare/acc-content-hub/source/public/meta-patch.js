(function () {
  var STORE = 'accMetaSettings';
  function read() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function save() {
    var ids = [
        'metaAppId',
        'metaAppSecret',
        'metaRedirectUri',
        'metaAccessToken',
        'metaPageIds',
      ],
      o = {};
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) o[id] = el.value.trim();
    });
    localStorage.setItem(STORE, JSON.stringify(o));
    alert('Meta settings tersimpan di perangkat.');
  }
  function field(card, label, id, type, placeholder, value) {
    var l = document.createElement('label');
    l.textContent = label;
    card.appendChild(l);
    var i = document.createElement('input');
    i.id = id;
    i.className = 'input';
    i.type = type || 'text';
    i.placeholder = placeholder || '';
    i.value = value || '';
    card.appendChild(i);
  }
  function enhance() {
    if (document.getElementById('metaSettingsCard')) return;
    var h1 = document.querySelector('h1');
    if (!h1 || h1.textContent.trim() !== 'Settings') return;
    var shell = h1.parentNode;
    if (!shell) return;
    var cfg = read(),
      card = document.createElement('div');
    card.className = 'card';
    card.id = 'metaSettingsCard';
    var title = document.createElement('h2');
    title.textContent = 'Facebook / Meta Multi-Page';
    card.appendChild(title);
    var status = document.createElement('div');
    status.className = 'row';
    status.innerHTML =
      '<span class="muted">OAuth, page discovery, scheduling & publishing experiment</span><span class="pill">SETUP</span>';
    card.appendChild(status);
    field(
      card,
      'META_APP_ID',
      'metaAppId',
      'text',
      'Meta App ID',
      cfg.metaAppId || ''
    );
    field(
      card,
      'META_APP_SECRET',
      'metaAppSecret',
      'password',
      'Meta App Secret',
      cfg.metaAppSecret || ''
    );
    field(
      card,
      'META_REDIRECT_URI',
      'metaRedirectUri',
      'url',
      'https://your-domain.example/meta/callback',
      cfg.metaRedirectUri || ''
    );
    field(
      card,
      'Page Access Token',
      'metaAccessToken',
      'password',
      'Optional during experiment',
      cfg.metaAccessToken || ''
    );
    field(
      card,
      'Page IDs',
      'metaPageIds',
      'text',
      'comma-separated page IDs',
      cfg.metaPageIds || ''
    );
    var note = document.createElement('div');
    note.className = 'ai-note';
    note.innerHTML =
      'Experimental comparison mode. Meta credentials are stored locally on this device. For production, <b>App Secret must move to backend</b> and OAuth/Page permissions still depend on Meta App Review.';
    card.appendChild(note);
    var b = document.createElement('button');
    b.className = 'btn full';
    b.textContent = 'Save Meta settings';
    b.onclick = save;
    card.appendChild(b);
    shell.appendChild(card);
  }
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      enhance();
    });
  }
  document.addEventListener('click', schedule, false);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  if (document.readyState !== 'loading') schedule();
})();
