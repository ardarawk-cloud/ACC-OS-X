import './styles.css';

const liveButton = document.createElement('button');
liveButton.id = 'oracly-live-toggle';
liveButton.type = 'button';
liveButton.textContent = 'LIVE MODE';
liveButton.setAttribute('aria-pressed', 'false');
liveButton.addEventListener('click', async () => {
  const enabled = document.body.classList.toggle('oracly-live-mode');
  liveButton.textContent = enabled ? 'EXIT LIVE' : 'LIVE MODE';
  liveButton.setAttribute('aria-pressed', String(enabled));
  if (enabled && document.fullscreenEnabled && !document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  } else if (!enabled && document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {}
  }
});
document.body.appendChild(liveButton);

document.addEventListener('fullscreenchange', () => {
  if (
    !document.fullscreenElement &&
    document.body.classList.contains('oracly-live-mode')
  ) {
    document.body.classList.remove('oracly-live-mode');
    liveButton.textContent = 'LIVE MODE';
    liveButton.setAttribute('aria-pressed', 'false');
  }
});
