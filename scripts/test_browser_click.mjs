import { spawn } from 'child_process';
import http from 'http';

// Start vite preview server
const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'pipe' });

await new Promise(resolve => setTimeout(resolve, 2000));

// Launch chrome
const chrome = spawn('google-chrome', [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  'http://localhost:4173'
], { stdio: 'pipe' });

await new Promise(resolve => setTimeout(resolve, 3000));

// Connect to CDP
const targets = await new Promise((resolve, reject) => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

console.log('Targets:', targets.map(t => ({ title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));

const pageTarget = targets.find(t => t.type === 'page');
if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
  console.error('No page target found');
  process.exit(1);
}

const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

let msgId = 1;
const callbacks = new Map();

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = msgId++;
    callbacks.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.onopen = async () => {
  console.log('Connected to CDP websocket');

  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  // Wait 2 seconds for assets to load
  await new Promise(r => setTimeout(r, 2000));

  console.log('Sending click to center of canvas (x=240, y=500)...');
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: 240,
    y: 500,
    button: 'left',
    clickCount: 1
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: 240,
    y: 500,
    button: 'left',
    clickCount: 1
  });

  await new Promise(r => setTimeout(r, 3000));

  // Evaluate current scene key in Phaser
  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const game = window.__PHASER_GAME__ || (window.Phaser && window.Phaser.GAMES && Object.values(window.Phaser.GAMES)[0]);
      if (!game) return 'No game found on window';
      const scenes = game.scene.getScenes(true);
      return scenes.map(s => s.scene.key).join(', ');
    })()`
  });

  console.log('Active scenes after click:', result.result.value);

  chrome.kill();
  preview.kill();
  process.exit(0);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && callbacks.has(data.id)) {
    callbacks.get(data.id)(data);
    callbacks.delete(data.id);
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    const args = data.params.args.map(a => a.value || a.description).join(' ');
    console.log(`[BROWSER CONSOLE ${data.params.type}]:`, args);
  }
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('[BROWSER UNCAUGHT EXCEPTION]:', data.params.exceptionDetails);
  }
};

