// Package the author's ignored local sources; only authenticated ciphertext is public.
import { webcrypto, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFile, writeFile, mkdir, cp, readdir, rm, access } from 'node:fs/promises';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, '.private-slides/source');
const destination = join(root, '.private-slides/build');
await access(join(source, '_pages/slides.html'));
await mkdir(join(source, '_data'), { recursive: true });
await mkdir(join(source, 'assets/css'), { recursive: true });
await cp(join(root, '_data/research.yml'), join(source, '_data/research.yml'));
await cp(join(root, 'assets/css/pixel.css'), join(source, 'assets/css/pixel.css'));
await writeFile(join(source, '_config.yml'), 'title: Personal introduction\nurl: https://linchengxing.github.io\nbaseurl: ""\nemail: linchengxing129@gmail.com\ngithub_username: linchengxing\ninclude: ["_pages"]\nexclude: []\n');
const build = spawnSync('bundle', ['exec', 'jekyll', 'build', '--source', source, '--destination', destination, '--config', join(source, '_config.yml')], { cwd: root, stdio: 'inherit' });
if (build.status !== 0) throw new Error('Private slide build failed.');
const pages = {};
const assets = {};
const extensions = { '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
for (const [language, folder] of [['en', 'slides'], ['zh-CN', 'slides-zh']]) {
  const html = await readFile(join(destination, folder, 'index.html'), 'utf8');
  if ((html.match(/<section\b[^>]*class="[^\"]*\bslide\b/g) || []).length !== 18) throw new Error('Unexpected slide count.');
  pages[language] = html;
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const pathname = new URL(match[1], 'https://linchengxing.github.io').pathname;
    if (!pathname.startsWith('/assets/')) continue;
    if (!extensions[extname(pathname)]) throw new Error('Unsupported private asset type.');
    assets[pathname] = { type: extensions[extname(pathname)], body: (await readFile(join(destination, pathname))).toString('base64') };
  }
}
async function readPassword() {
  if (!process.stdin.isTTY) throw new Error('Run interactively so the password stays out of files and command arguments.');
  process.stdout.write('Slides password (hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let password = '';
  return new Promise((resolve, reject) => {
    const onData = data => {
      for (const c of data.toString('utf8')) {
        if (c === '\r' || c === '\n') {
          process.stdin.off('data', onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); resolve(password); return;
        }
        if (c === '\u0003') { process.stdin.setRawMode(false); reject(new Error('Cancelled.')); return; }
        if (c === '\u007f') password = password.slice(0, -1);
        else password += c;
      }
    };
    process.stdin.on('data', onData);
  });
}
const password = await readPassword();
if (password.length < 8) throw new Error('Use at least eight password characters.');
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const iterations = 600000;
const aad = new TextEncoder().encode('personal-slides:v1');
const material = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const packed = gzipSync(Buffer.from(JSON.stringify({ format: 1, pages, assets })), { level: 9 });
const ciphertext = Buffer.from(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, packed));
const recovered = Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, ciphertext));
if (gunzipSync(recovered).toString() !== JSON.stringify({ format: 1, pages, assets })) throw new Error('Roundtrip verification failed.');
const wrongMaterial = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(password + '-invalid'), 'PBKDF2', false, ['deriveKey']);
const wrongKey = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, wrongMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
let rejected = false;
try { await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, wrongKey, ciphertext); } catch { rejected = true; }
if (!rejected) throw new Error('Invalid password was not rejected.');
const output = join(root, 'assets/protected-slides');
await mkdir(output, { recursive: true });
const name = `content.${createHash('sha256').update(ciphertext).digest('hex').slice(0, 16)}.bin`;
await writeFile(join(output, name), ciphertext);
await writeFile(join(output, 'manifest.json'), JSON.stringify({ version: 1, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations, salt: Buffer.from(salt).toString('base64'), iv: Buffer.from(iv).toString('base64'), compression: 'gzip', payload: name }, null, 2) + '\n');
for (const old of await readdir(output)) if (old.startsWith('content.') && old.endsWith('.bin') && old !== name) await rm(join(output, old));
console.log(`Encrypted 2 editions and ${Object.keys(assets).length} assets (${(ciphertext.length / 1048576).toFixed(2)} MiB). Correct-password roundtrip and wrong-password rejection passed.`);
