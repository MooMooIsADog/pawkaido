// Original local music; track selection is presentation-only, volume is independent of the save.
const DEFAULT_TRACK={src:'assets/sakura-pawprints.wav',title:'《樱风里的小爪印》',description:'筝弦 · 竹笛 · 原创和风循环',durationSeconds:60};
export function initMusic() {
  const audio = document.querySelector('#background-music');
  const toggle = document.querySelector('#music-toggle');
  const volume = document.querySelector('#music-volume');
  const value = document.querySelector('#music-volume-value');
  const status = document.querySelector('#music-status');
  const player = document.querySelector('.music-player');
  const title = document.querySelector('.music-copy strong');
  let track=DEFAULT_TRACK, request=0;
  let loading = false;
  let failed = false;
  let enabled = true, waitingForGesture = false;
  let initialVolume = 20;
  try {
    enabled = localStorage.getItem('pawkaido-music-enabled') !== 'false';
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
    toggle.disabled = false;
    toggle.textContent = enabled ? 'Ⅱ 关闭音乐' : '▷ 播放音乐';
    toggle.setAttribute('aria-pressed', String(enabled));
    title.textContent=track.title;
    value.textContent = `${Math.round(audio.volume * 100)}%`;
    volume.setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)}%`);
    if (failed) return;
    const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:track.durationSeconds;
    status.textContent = loading ? '小音符正在集合…' : playing
      ? `${audio.volume === 0 ? '静音播放' : '正在播放'} · ${time(audio.currentTime)} / ${time(duration)} · 循环`
      : waitingForGesture ? '音乐已开启 · 点击游戏后开始播放'
      : !enabled ? '音乐已关闭 · 随时可以再打开' : track.description;
  }
  async function play() {
    const ownRequest=++request;
    loading = true;failed = false;waitingForGesture = false;render();
    try { await audio.play(); }
    catch (error) {
      if(ownRequest!==request)return;
      if(error.name==='NotAllowedError')waitingForGesture=true;
      else {failed = true;status.textContent = '暂时没能播放，请关闭后重新打开音乐';}
    } finally {
      if(ownRequest===request){loading = false;render();}
    }
  }
  toggle.addEventListener('click', () => {
    enabled=!enabled;
    try{localStorage.setItem('pawkaido-music-enabled',String(enabled));}catch{}
    if(enabled)void play();
    else {++request;loading=false;failed=false;waitingForGesture=false;audio.pause();render();}
  });
  // A real game interaction unlocks playback when the browser rejects autoplay.
  // Exclude the toggle itself so the first click can turn music OFF without a burst of sound.
  function unlock(event){
    if(!enabled||!waitingForGesture||loading||!event.isTrusted||event.target?.closest?.('#music-toggle'))return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    void play();
  }
  document.addEventListener('click',unlock,true);
  document.addEventListener('keydown',unlock,true);
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    try { localStorage.setItem('pawkaido-music-volume', volume.value); } catch {}
    render();
  });
  for (const event of ['play', 'pause', 'timeupdate', 'volumechange', 'loadedmetadata']) audio.addEventListener(event, render);
  audio.addEventListener('error', () => {
    if(!audio.error)return;
    failed = true;loading = false;waitingForGesture=false;render();
    status.textContent = '音乐暂时没加载好，请刷新后再试';
  });
  function setTrack(next=DEFAULT_TRACK){
    if(next.src===track.src)return;
    ++request;loading=false;failed=false;waitingForGesture=false;
    audio.pause();track=next;audio.src=track.src;audio.load();render();
    if(enabled)void play();
  }
  render();
  // Let the initial game render select the saved map before trying its soundtrack.
  queueMicrotask(()=>{if(enabled&&!loading&&!waitingForGesture&&!failed&&audio.paused)void play();});
  return {setTrack};
}
