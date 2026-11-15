(() => {
  'use strict';
  const icons = {
    play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
    previous: '<path d="M6 5v14M19 5l-10 7 10 7z"/>',
    next: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
    repeat: '<path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
    muted: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9l5 6m0-6-5 6"/>',
    heart: '<path d="M20.5 5.5a5 5 0 0 0-7 0L12 7l-1.5-1.5a5 5 0 0 0-7 7L12 21l8.5-8.5a5 5 0 0 0 0-7Z"/>',
    queue: '<path d="M4 5h16M4 11h12M4 17h8m5-2 5 3-5 3z"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 4v16M4 12h16"/>',
    music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="3"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  const fallbackTracks = [
    {id:'orbitas',source:'audio',title:'Órbitas',artist:'Terminal Sessions',album:null,src:'assets/music/orbitas.mp3',theme:'orbit',duration:50.78},
    {id:'neon-noturno',source:'audio',title:'Neon Noturno',artist:'Terminal Sessions',album:null,src:'assets/music/neon-noturno.mp3',theme:'neon',duration:45.17},
    {id:'ondas-digitais',source:'audio',title:'Ondas Digitais',artist:'Terminal Sessions',album:null,src:'assets/music/ondas-digitais.mp3',theme:'waves',duration:54.88}
  ];
  let tracks = fallbackTracks, current = 0, playing = false, pendingPlay = false;
  let shuffle = false, repeat = false, selectionToken = 0;
  const history = [];
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const stored = Number(read('terminal-music-volume', .65));
  let volume = Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : .65, lastVolume = volume || .65;
  const storedLikes = read('terminal-music-favorites', []);
  const favorites = new Set(Array.isArray(storedLikes) ? storedLikes.filter(id => typeof id === 'string') : []);
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = volume;
  const root = document.createElement('section');
  root.className = 'music-player';
  root.setAttribute('aria-label', 'Player de músicas');
  root.innerHTML = `
    <div class="music-now">
      <div class="music-cover cover-orbit" id="music-cover" aria-hidden="true"><span></span><i></i></div>
      <div class="music-track"><span class="music-kicker"><i></i> Rádio de músicas favoritas</span><strong id="music-title">Órbitas</strong><span id="music-artist">Terminal Sessions</span></div>
      <button class="music-icon music-like" id="music-like" type="button" aria-label="Curtir música" aria-pressed="false" title="Curtir música">${icon('heart')}</button>
    </div>
    <div class="music-center">
      <div class="music-transport">
        <button class="music-icon music-option" id="music-shuffle" type="button" aria-label="Ativar ordem aleatória" aria-pressed="false" title="Ordem aleatória">${icon('shuffle')}</button>
        <button class="music-icon" id="music-previous" type="button" aria-label="Música anterior" title="Música anterior">${icon('previous')}</button>
        <button class="music-play" id="music-play" type="button" aria-label="Reproduzir" title="Reproduzir">${icon('play')}</button>
        <button class="music-icon" id="music-next" type="button" aria-label="Próxima música" title="Próxima música">${icon('next')}</button>
        <button class="music-icon music-option" id="music-repeat" type="button" aria-label="Repetir música" aria-pressed="false" title="Repetir música">${icon('repeat')}</button>
      </div>
      <div class="music-timeline"><span id="music-elapsed">0:00</span><input id="music-progress" class="music-range" type="range" min="0" max="100" value="0" step="0.1" aria-label="Posição da música" aria-valuetext="0:00" disabled><span id="music-duration">0:00</span></div>
    </div>
    <div class="music-tools">
      <button class="music-icon music-queue-toggle" id="music-queue-toggle" type="button" aria-label="Abrir playlist" title="Abrir playlist" aria-expanded="false" aria-controls="music-queue">${icon('queue')}<span>PLAYLIST</span></button>
      <div class="music-volume"><button class="music-icon" id="music-mute" type="button" aria-label="Silenciar música" title="Silenciar música" aria-pressed="false">${icon('volume')}</button><input id="music-volume" class="music-range" type="range" min="0" max="100" step="1" value="65" aria-label="Volume da música"></div>
    </div>
    <section class="music-queue" id="music-queue" aria-labelledby="music-queue-title" hidden>
      <div class="music-queue-head"><div><span class="music-kicker">SUA TRILHA CRIATIVA</span><h2 id="music-queue-title">Na frequência.</h2></div><button class="music-icon" id="music-queue-close" type="button" aria-label="Fechar playlist" title="Fechar playlist">${icon('close')}</button></div>
      <p class="music-queue-description">Uma seleção para acompanhar suas ideias.</p>
      <p class="music-library-status" id="music-library-status" role="status">Carregando seleção…</p>
      <ol class="music-tracklist" id="music-tracklist"></ol>
      <div class="music-queue-options"><button id="music-shuffle-queue" type="button" aria-pressed="false">${icon('shuffle')} Aleatório</button><button id="music-repeat-queue" type="button" aria-pressed="false">${icon('repeat')} Repetir faixa</button></div>
      <button class="music-import" id="music-import" type="button">+ Importar músicas</button><p class="music-credit">MP3, M4A, OGG e WAV compatíveis com seu navegador.<br>As importações ficam neste dispositivo. Use arquivos seus ou autorizados.<br>Após o primeiro acesso completo, o player funciona offline.</p>
    </section>
    <p class="music-message" id="music-message" role="status" aria-live="polite" hidden></p>`;
  document.querySelector('.terminal').append(root);
  const queue = root.querySelector('#music-queue');
  const messagePanel = root.querySelector('#music-message');
  document.body.append(queue, messagePanel);
  const $ = selector => root.querySelector(selector) || document.querySelector(selector);
  const all = selector => document.querySelectorAll(selector);
  const activeTrack = () => tracks[current];
  const format = seconds => Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
  const clamp = (value, min, max) => Math.min(Math.max(min, max), Math.max(min, value));
  function placePanel(panel, width, height, side = 'right') {
    const bounds = root.getBoundingClientRect();
    const w = window.innerWidth, h = window.innerHeight;
    const x = side === 'left' ? bounds.left : bounds.right - width;
    const y = bounds.top >= height + 20 ? bounds.top - height - 12 : bounds.bottom + 12;
    panel.style.left = `${clamp(x, 8, w - width - 8)}px`;
    panel.style.top = `${clamp(y, 8, h - height - 8)}px`;
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
  }
  function positionPanels() {
    if (!queue.hidden) {
      const width=Math.min(390,window.innerWidth-16);
      queue.style.width=`${width}px`;
      queue.style.maxHeight=`${Math.max(240,window.innerHeight-16)}px`;
      placePanel(queue,width,Math.min(queue.offsetHeight||420,window.innerHeight-16));
    }

    if (!messagePanel.hidden) placePanel(messagePanel,Math.min(320,window.innerWidth-16),messagePanel.offsetHeight||72,'left');
  }
  document.addEventListener('terminal-player-moved', positionPanels);
  window.addEventListener('resize', positionPanels);
  let messageTimer;
  function message(text) {
    messagePanel.textContent = text; messagePanel.hidden = false; positionPanels();
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => { messagePanel.hidden = true; }, 6500);
  }
  function paintRange(input) { input.style.setProperty('--fill', `${clamp(Number(input.value) / (Number(input.max) || 100) * 100, 0, 100)}%`); }
  function duration() { return Number.isFinite(audio.duration) ? audio.duration : 0; }
  function time() { return audio.currentTime || 0; }
  function updateTimeline() {
    const length = duration(), elapsed = time(), input = $('#music-progress');
    input.max = length || 100; input.value = elapsed; input.disabled = length <= 0;
    input.setAttribute('aria-valuetext', `${format(elapsed)} de ${format(length)}`);
    $('#music-elapsed').textContent = format(elapsed); $('#music-duration').textContent = format(length); paintRange(input);
    const lengthLabel = document.querySelector(`[data-track="${current}"] .music-track-length`);
    if (lengthLabel && length > 0) lengthLabel.textContent = format(length);
  }
  function updatePlayback() {
    root.classList.toggle('is-playing', playing);
    root.classList.toggle('is-loading', pendingPlay && !playing);
    const paused = !(playing || pendingPlay), label = paused ? 'Reproduzir' : 'Pausar';
    $('#music-play').innerHTML = icon(paused ? 'play' : 'pause');
    $('#music-play').setAttribute('aria-label', label); $('#music-play').title = label;
    all('[data-track]').forEach(button => {
      const active = Number(button.dataset.track) === current;
      button.classList.toggle('is-current', active);
      if (active) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current');
      button.querySelector('.music-track-state').innerHTML = active && playing ? '<span class="music-equalizer" aria-hidden="true"><i></i><i></i><i></i></span>' : String(Number(button.dataset.track) + 1).padStart(2, '0');
    });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }
  function updateLike() {
    const liked = favorites.has(activeTrack().id);
    $('#music-like').setAttribute('aria-pressed', String(liked));
    $('#music-like').setAttribute('aria-label', liked ? 'Remover dos favoritos' : 'Curtir música');
  }
  function artwork(track, theme = 'orbit') {
    const art = document.createElement('span'); art.className = `music-cover cover-${theme}`; art.setAttribute('aria-hidden', 'true');
    if (track.thumbnail) {
      const img = document.createElement('img'); img.src = track.thumbnail; img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => { img.remove(); art.innerHTML = '<span></span><i></i>'; }); art.append(img);
    } else art.innerHTML = '<span></span><i></i>';
    return art;
  }
  function renderQueue() {
    const list = $('#music-tracklist'); list.replaceChildren();
    tracks.forEach((track, index) => {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.className = 'music-track-button'; button.dataset.track = index;
      button.setAttribute('aria-label', `Reproduzir ${track.title}`);
      button.innerHTML = '<span class="music-track-state"></span><span class="music-track-copy"><strong></strong><small></small></span><span class="music-track-length"></span>';
      button.insertBefore(artwork(track, track.theme || 'orbit'), button.querySelector('.music-track-copy'));
      button.querySelector('strong').textContent = track.title;
      button.querySelector('small').textContent = track.artist;
      button.querySelector('.music-track-length').textContent = track.duration ? format(track.duration) : '—';
      button.addEventListener('click', () => { selectTrack(index, true); });
      li.append(button);
      if (track.local) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'music-remove'; remove.textContent = 'Remover'; remove.setAttribute('aria-label', 'Remover ' + track.title); remove.addEventListener('click', () => removeLocal(track.id)); li.append(remove);
      }
      list.append(li);
    }); updatePlayback();
  }
  function renderMetadata() {
    const track = activeTrack();
    $('#music-title').textContent = track.title; $('#music-title').title = track.title;
    $('#music-artist').textContent = track.artist;
    const previousCover = $('#music-cover'), nextCover = artwork(track, track.theme || 'orbit');
    nextCover.id = 'music-cover'; previousCover.replaceWith(nextCover);
    if ('mediaSession' in navigator && 'MediaMetadata' in window) {
      try { navigator.mediaSession.metadata = new window.MediaMetadata({ title: track.title, artist: track.artist, album: track.album || '', artwork: track.thumbnail ? [{src:track.thumbnail}] : [] }); } catch {}
    }
    updateLike(); updateTimeline(); positionPanels();
  }
  function updateVolume(persist = true) {
    const muted = volume === 0, input = $('#music-volume');
    input.value = Math.round(volume * 100); input.setAttribute('aria-valuetext', `${input.value}%`); paintRange(input);
    $('#music-mute').innerHTML = icon(muted ? 'muted' : 'volume');
    $('#music-mute').setAttribute('aria-pressed', String(muted));
    $('#music-mute').setAttribute('aria-label', muted ? 'Ativar som da música' : 'Silenciar música');
    if (persist) save('terminal-music-volume', volume);
  }
  function applyVolume() {
    audio.volume = volume;
    updateVolume();
  }
  function pause() { selectionToken++; pendingPlay = false; playing = false; audio.pause(); updatePlayback(); }
  async function play() {
    const token = ++selectionToken; pendingPlay = true; updatePlayback(); messagePanel.hidden = true;
    try { await audio.play(); if (token !== selectionToken) return; pendingPlay = false; playing = true; updatePlayback(); }
    catch { if (token === selectionToken) { pause(); message('Não foi possível reproduzir esta faixa. Verifique o formato do arquivo.'); } }
  }
  function selectTrack(index, autoplay = false, remember = true) {
    if (index < 0 || index >= tracks.length) return;
    if (remember && index !== current) { history.push(activeTrack().id); if (history.length > 100) history.shift(); }
    pause(); current = index; messagePanel.hidden = true;
    audio.src = activeTrack().src; audio.load();
    renderMetadata(); updatePlayback();
    if (autoplay) play();

  }
  function next(autoplay = playing || pendingPlay) {
    const index = shuffle && tracks.length > 1 ? (current + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length : (current + 1) % tracks.length;
    selectTrack(index, autoplay);
  }
  function seek(seconds) { const length = duration(); if (!(length > 0)) return; const target = clamp(seconds, 0, length); audio.currentTime = target; updateTimeline(); }
  function previous() { if (time() > 3) { seek(0); return; } const id = history.pop(), index = tracks.findIndex(track => track.id === id); selectTrack(index >= 0 ? index : (current - 1 + tracks.length) % tracks.length, playing || pendingPlay, false); }
  function ended() { if (repeat) { seek(0); play(); } else next(true); }
  function setQueue(open, focus = false) {
    queue.hidden = !open;
    $('#music-queue-toggle').setAttribute('aria-expanded', String(open));
    $('#music-queue-toggle').setAttribute('aria-label', open ? 'Fechar playlist' : 'Abrir playlist');
    positionPanels();
    if (open && focus) $('#music-queue-close').focus(); else if (!open && focus) $('#music-queue-toggle').focus();
  }
  $('#music-play').addEventListener('click', () => { if (playing || pendingPlay) pause(); else play(); });
  $('#music-next').addEventListener('click', () => next()); $('#music-previous').addEventListener('click', previous);
  $('#music-like').addEventListener('click', () => { const id = activeTrack().id; if (favorites.has(id)) favorites.delete(id); else favorites.add(id); save('terminal-music-favorites',[...favorites]); updateLike(); });
  function toggleShuffle() { shuffle = !shuffle; for (const id of ['music-shuffle','music-shuffle-queue']) $('#'+id).setAttribute('aria-pressed',String(shuffle)); }
  function toggleRepeat() { repeat = !repeat; for (const id of ['music-repeat','music-repeat-queue']) $('#'+id).setAttribute('aria-pressed',String(repeat)); }
  for (const id of ['music-shuffle','music-shuffle-queue']) $('#'+id).addEventListener('click',toggleShuffle);
  for (const id of ['music-repeat','music-repeat-queue']) $('#'+id).addEventListener('click',toggleRepeat);
  $('#music-progress').addEventListener('input',event => seek(Number(event.target.value)));
  $('#music-volume').addEventListener('input',event => { volume = Number(event.target.value)/100; applyVolume(); });
  $('#music-mute').addEventListener('click',() => { if (volume) { lastVolume = volume; volume = 0; } else volume = lastVolume || .65; applyVolume(); });
  $('#music-queue-toggle').addEventListener('click',() => setQueue(queue.hidden,true));
  $('#music-queue-close').addEventListener('click',() => setQueue(false,true));
  document.addEventListener('pointerdown',event => { if (!queue.hidden && !root.contains(event.target) && !queue.contains(event.target)) setQueue(false); });
  for (const panel of [root,queue]) panel.addEventListener('keydown',event => {
    event.stopPropagation();
    if (event.key === 'Escape' && !queue.hidden) { event.preventDefault(); setQueue(false,true); }
  });
  for (const event of ['timeupdate','loadedmetadata','durationchange']) audio.addEventListener(event, updateTimeline);
  audio.addEventListener('play', () => { playing = true; pendingPlay = false; updatePlayback(); });
  audio.addEventListener('pause', () => { playing = false; updatePlayback(); });
  audio.addEventListener('ended', ended);
  audio.addEventListener('error', () => { pause(); message('Esta faixa está indisponível. Tente outra música.'); });
  if ('mediaSession' in navigator) for (const [name,handler] of Object.entries({play,pause,previoustrack:previous,nexttrack:()=>next(true),seekto:event=>seek(event.seekTime)})) { try { navigator.mediaSession.setActionHandler(name,handler); } catch {} }
  function loading(value) { for (const id of ['music-play','music-next','music-previous']) $('#'+id).disabled = value; }
  const imported = new Map();
  const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'audio/*,.mp3,.m4a,.ogg,.wav'; input.hidden = true; root.append(input);
  $('#music-import').addEventListener('click', () => input.click());
  let dbPromise;
  function database() {
    return dbPromise ||= new Promise((resolve,reject) => {
      const request = indexedDB.open('terminal-audio-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('tracks', {keyPath:'id'});
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  }
  async function storage(mode, operation) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const tx = db.transaction('tracks', mode); const request = operation(tx.objectStore('tracks'));
      tx.oncomplete = () => resolve(request?.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }
  function addLocal(record) {
    const track = {...record, blob:undefined, source:'audio', src:URL.createObjectURL(record.blob), theme:'waves', local:true};
    tracks.push(track); imported.set(track.id, track.src);
  }
  input.addEventListener('change', async () => {
    const files = [...input.files]; let added = 0, failed = 0;
    $('#music-import').disabled = true;
    for (const file of files) {
      if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(file.name)) { failed++; continue; }
      const id = 'local-' + file.name + '-' + file.size + '-' + file.lastModified;
      if (tracks.some(track => track.id === id)) continue;
      const record = {id, title:file.name.replace(/\.[^.]+$/, ''), artist:'Arquivo deste dispositivo', blob:file};
      try { await storage('readwrite', store => store.put(record)); addLocal(record); added++; } catch { failed++; }
    }
    input.value = ''; $('#music-import').disabled = false; renderQueue();
    message(`${added} faixa(s) salva(s) para ouvir offline neste navegador.${failed ? ' Alguns arquivos não puderam ser salvos. Verifique o espaço disponível.' : ''}`);
  });
  async function removeLocal(id) {
    try {
      await storage('readwrite', store => store.delete(id));
      const active = activeTrack().id, index = tracks.findIndex(track => track.id === id);
      if (active === id) pause();
      tracks.splice(index, 1); URL.revokeObjectURL(imported.get(id)); imported.delete(id);
      if (active === id) selectTrack(Math.min(index, tracks.length - 1), false, false);
      else current = tracks.findIndex(track => track.id === active);
      renderQueue();
    } catch { message('Não foi possível remover o arquivo deste navegador.'); }
  }
  async function loadCatalog() {
    loading(true);
    try {
      const response = await fetch('music-catalog.json'); if (!response.ok) throw new Error();
      const data = await response.json();
      const valid = data.tracks?.filter(track => typeof track.src === 'string' && track.src.startsWith('assets/music/') && !track.src.includes('..') && typeof track.title === 'string');
      if (valid?.length) tracks = valid;
    } catch { /* Included demonstration tracks remain available. */ }
    try { for (const record of await storage('readonly', store => store.getAll())) addLocal(record); }
    catch { message('O armazenamento local está indisponível. As faixas incluídas continuam disponíveis.'); }
    renderQueue(); selectTrack(0, false, false); loading(false);
    $('#music-library-status').textContent = 'Arquivos do site + músicas salvas neste navegador';
  }
  renderQueue(); updateVolume(false); renderMetadata();
  document.dispatchEvent(new CustomEvent('terminal-player-ready')); loadCatalog();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => message('O modo offline não pôde ser ativado.'));
})();
