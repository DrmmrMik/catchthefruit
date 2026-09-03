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

const targets = await new Promise((resolve) => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  });
});

const pageTarget = targets.find(t => t.url.includes('4173'));
const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

ws.onopen = async () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Console.enable' }));
  await new Promise(r => setTimeout(r, 2000));

  ws.send(JSON.stringify({
    id: 3,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const g = window.__GAME__;
        const preload = g.scene.getScene("PreloadScene");
        const listenerCount = preload.input.listenerCount("pointerdown");
        try {
          preload.input.emit("pointerdown", { x: 240, y: 500 });
          return { listenerCount, emitted: true, activeAfterEmit: g.scene.getScenes(true).map(s => s.scene.key) };
        } catch (err) {
          return { listenerCount, error: err.message, stack: err.stack };
        }
      })()`,
      returnByValue: true
    }
  }));
};

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.consoleAPICalled') {
    console.log('[BROWSER LOG]:', data.params.args.map(a => a.value || a.description).join(' '));
  }
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('[BROWSER EXCEPTION]:', data.params.exceptionDetails);
  }
  if (data.id === 3) {
    console.log('Emit result:', JSON.stringify(data.result.result.value, null, 2));

    await new Promise(r => setTimeout(r, 1000));

    ws.send(JSON.stringify({
      id: 4,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const g = window.__GAME__;
          return {
            activeScenes: g.scene.getScenes(true).map(s => s.scene.key),
            menuSceneStatus: g.scene.getScene("MenuScene").scene.status
          };
        })()`,
        returnByValue: true
      }
    }));
  }
  if (data.id === 4) {
    console.log('Scene check after 1 sec:', JSON.stringify(data.result.result.value, null, 2));
    chrome.kill();
    preview.kill();
    process.exit(0);
  }
};
