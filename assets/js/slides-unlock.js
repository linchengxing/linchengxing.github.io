(() => {
  const language = document.body.dataset.slidesLanguage;
  const zh = language === 'zh-CN';
  const manifestUrl = new URL(document.body.dataset.slidesManifest, location.href);
  const cacheName = 'personal-slides-session-key-v1';
  const form = document.querySelector('#unlock-form');
  const field = document.querySelector('#slides-password');
  const button = document.querySelector('#unlock-button');
  const status = document.querySelector('#unlock-status');
  const alternate = document.querySelector('#unlock-language-switch');
  alternate.hash = location.hash;
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const encode = value => btoa(String.fromCharCode(...new Uint8Array(value)));
  let manifestPromise;
  let ciphertextPromise;
  class PasswordError extends Error {}
  async function loadManifest() {
    manifestPromise ||= fetch(manifestUrl, { cache: 'no-cache' }).then(async response => {
      if (!response.ok) throw new Error('Unable to load encrypted presentation.');
      const m = await response.json();
      if (m.version !== 1 || m.cipher !== 'AES-256-GCM' || m.kdf !== 'PBKDF2-SHA256' || m.compression !== 'gzip' || m.iterations !== 600000 || !/^content\.[a-f0-9]{16}\.bin$/.test(m.payload)) throw new Error('Unsupported presentation format.');
      return m;
    }).catch(error => { manifestPromise = undefined; throw error; });
    return manifestPromise;
  }
  async function decrypt(rawKey, manifest) {
    ciphertextPromise ||= fetch(new URL(manifest.payload, manifestUrl)).then(response => {
      if (!response.ok) throw new Error('Unable to load encrypted presentation.');
      return response.arrayBuffer();
    }).catch(error => { ciphertextPromise = undefined; throw error; });
    const ciphertext = await ciphertextPromise;
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
    let packed;
    try { packed = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(manifest.iv), additionalData: new TextEncoder().encode('personal-slides:v1') }, key, ciphertext); }
    catch { throw new PasswordError(); }
    const stream = new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'));
    const bundle = JSON.parse(await new Response(stream).text());
    if (bundle.format !== 1 || !bundle.pages[language]) throw new Error('Invalid presentation content.');
    return bundle;
  }
  function show(bundle) {
    const parsed = new DOMParser().parseFromString(bundle.pages[language], 'text/html');
    const blobs = new Map();
    const assetFor = url => {
      const path = new URL(url, location.href).pathname;
      const asset = bundle.assets[path];
      if (!asset) throw new Error('Missing private presentation asset.');
      return { path, asset };
    };
    const blobFor = url => {
      const { path, asset } = assetFor(url);
      if (!blobs.has(path)) blobs.set(path, URL.createObjectURL(new Blob([decode(asset.body)], { type: asset.type })));
      return blobs.get(path);
    };
    for (const link of parsed.querySelectorAll('link[rel="stylesheet"]')) {
      const style = parsed.createElement('style');
      style.textContent = new TextDecoder().decode(decode(assetFor(link.href).asset.body));
      link.replaceWith(style);
    }
    for (const image of parsed.querySelectorAll('img[src]')) image.src = blobFor(image.getAttribute('src'));
    for (const link of parsed.querySelectorAll('a[href]')) {
      const path = new URL(link.getAttribute('href'), location.href).pathname;
      if (bundle.assets[path]) link.href = blobFor(link.getAttribute('href'));
    }
    const scripts = [];
    for (const script of parsed.querySelectorAll('script[src]')) {
      scripts.push(new TextDecoder().decode(decode(assetFor(script.getAttribute('src')).asset.body)));
      script.remove();
    }
    const robots = parsed.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex,nofollow,noarchive'; parsed.head.append(robots);
    const lock = parsed.createElement('button'); lock.id = 'lock-slides'; lock.type = 'button'; lock.textContent = zh ? '锁定' : 'Lock';
    parsed.querySelector('.deck-header-actions').append(lock);
    const boot = parsed.createElement('script');
    boot.textContent = (scripts.join('\n') + `\ndocument.querySelector('#lock-slides').addEventListener('click', () => { try { sessionStorage.removeItem('${cacheName}'); } catch {} location.reload(); });`).replace(/<\/script/gi, '<\\/script');
    parsed.body.append(boot);
    document.open(); document.write('<!doctype html>\n' + parsed.documentElement.outerHTML); document.close();
  }
  async function openWithKey(rawKey, manifest, remember) {
    const bundle = await decrypt(rawKey, manifest);
    if (remember) { try { sessionStorage.setItem(cacheName, JSON.stringify({ salt: manifest.salt, key: encode(rawKey) })); } catch {} }
    field.value = '';
    show(bundle);
  }
  function supported() { return Boolean(crypto.subtle && globalThis.DecompressionStream); }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = zh ? '正在解锁…' : 'Unlocking…';
    try {
      if (!supported()) throw new Error('Unsupported browser.');
      const manifest = await loadManifest();
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(field.value), 'PBKDF2', false, ['deriveBits']);
      const rawKey = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: decode(manifest.salt), iterations: manifest.iterations, hash: 'SHA-256' }, material, 256);
      await openWithKey(rawKey, manifest, true);
    } catch (error) {
      status.textContent = error instanceof PasswordError ? (zh ? '密码不正确，请重试。' : 'Incorrect password. Please try again.') : (zh ? '暂时无法解锁，请检查网络并使用最新版浏览器重试。' : 'Unable to unlock. Check your connection and try a current browser.');
      button.disabled = false;
      if (error instanceof PasswordError) { field.value = ''; field.focus(); }
    }
  });
  async function resume() {
    if (!supported()) { status.textContent = zh ? '请使用支持安全解锁的新版浏览器。' : 'Please use a current browser to unlock this presentation.'; return; }
    let cached;
    try { cached = JSON.parse(sessionStorage.getItem(cacheName)); } catch { return; }
    if (!cached) return;
    button.disabled = true; status.textContent = zh ? '正在打开…' : 'Opening…';
    try {
      const manifest = await loadManifest();
      if (cached.salt !== manifest.salt) throw new PasswordError();
      await openWithKey(decode(cached.key), manifest, false);
    } catch {
      try { sessionStorage.removeItem(cacheName); } catch {}
      button.disabled = false; status.textContent = '';
    }
  }
  resume();
})();
