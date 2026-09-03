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

  // Let's inspect the pointerdown listener in PreloadScene
  ws.send(JSON.stringify({
    id: 3,
    method: 'Runtime.evaluate',
    params: {
      expression: `(async () => {
        const g = window.__GAME__;
        const preload = g.scene.getScene("PreloadScene");
        const events = preload.input._events;
        console.log("preload.input._events keys:", Object.keys(events));
        const fn = events.pointerdown ? events.pointerdown.fn || events.pointerdown : null;
        console.log("fn string:", fn ? fn.toString() : "null");
        
        console.log("Executing the pointerdown handler function now...");
        try {
          const promise = fn.call(preload);
          console.log("Handler returned:", promise);
          if (promise && promise.then) {
            console.log("Awaiting returned promise...");
            await promise;
            console.log("Promise resolved!");
          }
        } catch (err) {
          console.error("Handler error:", err);
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
    await new Promise(r => setTimeout(r, 2000));
    chrome.kill();
    preview.kill();
    process.exit(0);
  }
};
