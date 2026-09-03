import { spawn } from 'child_process';
import http from 'http';

const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));

const chrome = spawn('google-chrome', [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  'http://localhost:4173'
], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2000));

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

  console.log('--- WAITING 3 SECONDS FOR PRELOAD TO COMPLETE ---');
  await new Promise(r => setTimeout(r, 3000));

  // Check Phaser state
  let res = await send('Runtime.evaluate', {
    expression: `(() => {
      // Find Phaser in modules or window
      const canvas = document.querySelector('canvas');
      return {
        canvasExists: !!canvas,
        canvasRect: canvas ? canvas.getBoundingClientRect() : null,
        title: document.title,
        bodyHtml: document.body.innerHTML.substring(0, 300)
      };
    })()`,
    returnByValue: true
  });
  console.log('DOM & Canvas state:', JSON.stringify(res.result.value, null, 2));

  // Check scene state via global Phaser or game
  let sceneRes = await send('Runtime.evaluate', {
    expression: `(() => {
      for (const k in window) {
        if (window[k] && window[k].scene && window[k].scene.scenes) {
          return window[k].scene.scenes.map(s => ({ key: s.scene.key, active: s.scene.isActive() }));
        }
      }
      return 'No game found on window keys';
    })()`,
    returnByValue: true
  });
  console.log('Scene check 1:', sceneRes.result.value);

  // Let's dispatch a pointerdown event on canvas
  console.log('Dispatching PointerDown/Touch on Canvas...');
  let clickRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'No canvas';
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Dispatch PointerEvents
      const peDown = new PointerEvent('pointerdown', { clientX: cx, clientY: cy, bubbles: true, cancelable: true });
      canvas.dispatchEvent(peDown);
      const peUp = new PointerEvent('pointerup', { clientX: cx, clientY: cy, bubbles: true, cancelable: true });
      canvas.dispatchEvent(peUp);

      // Dispatch TouchEvents
      try {
        const touch = new Touch({ identifier: 1, target: canvas, clientX: cx, clientY: cy });
        const teStart = new TouchEvent('touchstart', { touches: [touch], targetTouches: [touch], changedTouches: [touch], bubbles: true });
        canvas.dispatchEvent(teStart);
        const teEnd = new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [touch], bubbles: true });
        canvas.dispatchEvent(teEnd);
      } catch (e) {
        // Touch constructor might not be supported
      }

      // Dispatch MouseEvents
      const meDown = new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true });
      canvas.dispatchEvent(meDown);
      const meUp = new MouseEvent('mouseup', { clientX: cx, clientY: cy, bubbles: true });
      canvas.dispatchEvent(meUp);

      return 'Dispatched pointer, touch, and mouse events';
    })()`,
    returnByValue: true
  });
  console.log('Click dispatch result:', clickRes.result.value);

  await new Promise(r => setTimeout(r, 2000));

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
    console.log(`[CONSOLE ${data.params.type}]:`, args);
  }
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('[UNCAUGHT EXCEPTION]:', data.params.exceptionDetails);
  }
};
