import { spawn } from 'child_process';
import http from 'http';

const preview = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

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

  // Get canvas center and element info
  ws.send(JSON.stringify({
    id: 3,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return {
          x: Math.round(r.left + r.width / 2),
          y: Math.round(r.top + r.height / 2),
          w: r.width,
          h: r.height,
          left: r.left,
          top: r.top
        };
      })()`,
      returnByValue: true
    }
  }));
};

let canvasCoords = null;

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.consoleAPICalled') {
    const args = data.params.args.map(a => a.value || a.description).join(' ');
    console.log(`[CONSOLE]:`, args);
  }
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('[UNCAUGHT EXCEPTION]:', data.params.exceptionDetails);
  }

  if (data.id === 3) {
    canvasCoords = data.result.result.value;
    console.log('Canvas Coords:', canvasCoords);

    // Also dispatch on pointerdown directly in page context via mouse and touch
    console.log('Dispatching Input.dispatchMouseEvent at canvas center:', canvasCoords.x, canvasCoords.y);
    ws.send(JSON.stringify({
      id: 4,
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mousePressed', x: canvasCoords.x, y: canvasCoords.y, button: 'left', clickCount: 1 }
    }));
    ws.send(JSON.stringify({
      id: 5,
      method: 'Input.dispatchMouseEvent',
      params: { type: 'mouseReleased', x: canvasCoords.x, y: canvasCoords.y, button: 'left', clickCount: 1 }
    }));

    await new Promise(r => setTimeout(r, 1000));

    // Also dispatch touch
    console.log('Dispatching Input.dispatchTouchEvent at canvas center...');
    ws.send(JSON.stringify({
      id: 6,
      method: 'Input.dispatchTouchEvent',
      params: {
        type: 'touchStart',
        touchPoints: [{ x: canvasCoords.x, y: canvasCoords.y }]
      }
    }));
    ws.send(JSON.stringify({
      id: 7,
      method: 'Input.dispatchTouchEvent',
      params: {
        type: 'touchEnd',
        touchPoints: []
      }
    }));

    await new Promise(r => setTimeout(r, 1500));

    // Let's inspect active scenes
    ws.send(JSON.stringify({
      id: 8,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          // Find game from window or canvas
          const c = document.querySelector('canvas');
          // In Phaser, the game is usually referenced or we can inspect document
          return {
            canvasActive: !!c,
            // Check if pointer events were received by window
            lastPointer: window.__LAST_POINTER__
          };
        })()`,
        returnByValue: true
      }
    }));
  }

  if (data.id === 8) {
    console.log('Evaluation after clicks:', data.result.result.value);
    chrome.kill();
    preview.kill();
    process.exit(0);
  }
};
