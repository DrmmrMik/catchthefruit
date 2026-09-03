import http from 'http';

const targets = await new Promise((resolve, reject) => {
  http.get('http://127.0.0.1:9222/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

const pageTarget = targets.find(t => t.url.includes('4173'));
if (!pageTarget) {
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
  await send('Console.enable');
  await send('Runtime.enable');

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.Phaser ? window.Phaser.GAMES[0] : null;
      if (!g) return 'No Phaser game found';
      const scenes = g.scene.scenes.map(s => ({
        key: s.scene.key,
        status: s.scene.status,
        isActive: g.scene.isActive(s.scene.key),
        isPaused: g.scene.isPaused(s.scene.key),
        isVisible: g.scene.isVisible(s.scene.key)
      }));
      return JSON.stringify({ scenes });
    })()`
  });

  console.log('Phaser State:', evalRes.result.value);

  // Now check canvas position and dimensions
  const canvasRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'No canvas element';
      const rect = canvas.getBoundingClientRect();
      return JSON.stringify({
        width: canvas.width,
        height: canvas.height,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
      });
    })()`
  });
  console.log('Canvas Rect:', canvasRes.result.value);

  process.exit(0);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id && callbacks.has(data.id)) {
    callbacks.get(data.id)(data);
    callbacks.delete(data.id);
  }
};
