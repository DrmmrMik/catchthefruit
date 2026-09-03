// tests/setup.ts - Headless environment setup for Vitest
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function () {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as unknown as RenderingContext;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
