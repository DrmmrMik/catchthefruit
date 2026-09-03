import { spawn } from 'child_process';
import http from 'http';

const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1000));

const chrome = spawn('google-chrome', [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  'http://localhost:4173'
], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));

const targets = await new Promise((resolve, reject) => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

const pageTarget = targets.find(t => t.url.includes('4173'));
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
  await send('Console.enable');
  await send('Runtime.enable');
  await send('Page.enable');

  await new Promise(r => setTimeout(r, 2000));

  // Inspect what Phaser scenes exist
  const res1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.Phaser ? window.Phaser.GAMES[0] : null;
      if (!g) return 'No window.Phaser.GAMES[0]';
      return {
        scenes: g.scene.scenes.map(s => s.scene.key),
        activeScene: g.scene.scenes.find(s => s.scene.isActive())?.scene.key,
        gameIsBooted: g.isBooted,
        isRunning: g.isRunning
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene status before click:', res1.result ? res1.result.value : res1);

  // Dispatch click at center of screen using Input.dispatchMouseEvent
  console.log('Dispatching Input.dispatchMouseEvent at (240, 500)...');
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

  await new Promise(r => setTimeout(r, 1000));

  const res2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.Phaser ? window.Phaser.GAMES[0] : null;
      if (!g) return 'No window.Phaser.GAMES[0]';
      return {
        activeScenes: g.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key),
        allScenes: g.scene.scenes.map(s => ({ key: s.scene.key, status: s.scene.status, active: s.scene.isActive() }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Scene status after click:', res2.result ? res2.result.value : res2);

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
    const args = data.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
    console.log(`[CONSOLE ${data.params.type}]:`, args);
  }
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('[UNCAUGHT EXCEPTION]:', data.params.exceptionDetails);
  }
};
