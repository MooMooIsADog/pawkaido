// Original local music; independent of the game save.
export function initMusic() {
  const audio = document.querySelector('#background-music');
  const toggle = document.querySelector('#music-toggle');
  const volume = document.querySelector('#music-volume');
  const value = document.querySelector('#music-volume-value');
  const status = document.querySelector('#music-status');
  const player = document.querySelector('.music-player');
  let loading = false;
  let failed = false;
  let initialVolume = 20;
  try {
    const saved = localStorage.getItem('pawkaido-music-volume');
    if (saved !== null && Number.isFinite(Number(saved))) {
      initialVolume = Math.max(0, Math.min(100, Math.round(Number(saved))));
    }
  } catch { /* Music remains usable when storage is unavailable. */ }
  volume.value = String(initialVolume);
  audio.volume = initialVolume / 100;
  const time = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  function render() {
    const playing = !audio.paused && !audio.ended;
    player.classList.toggle('is-playing', playing);
    toggle.disabled = loading;
    toggle.textContent = loading ? '正在准备…' : playing ? 'Ⅱ 暂停音乐' : '▷ 播放音乐';
    toggle.setAttribute('aria-pressed', String(playing));
    value.textContent = `${Math.round(audio.volume * 100)}%`;
    volume.setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)}%`);
    if (failed) return;
    status.textContent = loading ? '小音符正在集合…' : playing
      ? `${audio.volume === 0 ? '静音播放' : '正在播放'} · ${time(audio.currentTime)} / 1:00 · 循环`
      : audio.currentTime > 0 ? '已暂停 · 再点一下，接着散步' : '筝弦 · 竹笛 · 原创和风循环';
  }
  toggle.addEventListener('click', async () => {
    if (loading) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    loading = true;
    failed = false;
    render();
    try {
      await audio.play();
    } catch {
      failed = true;
      status.textContent = '暂时没能播放，点一下再试试';
    } finally {
      loading = false;
      render();
    }
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    try { localStorage.setItem('pawkaido-music-volume', volume.value); } catch {}
    render();
  });
  for (const event of ['play', 'pause', 'timeupdate', 'volumechange', 'loadedmetadata']) {
    audio.addEventListener(event, render);
  }
  audio.addEventListener('error', () => {
    failed = true;
    loading = false;
    render();
    status.textContent = '音乐暂时没加载好，请刷新后再试';
  });
  // No autoplay: a deliberate click starts playback, as browsers require.
  render();
}
