type CanvasInstance = { play: (fx: string, done: () => void) => void; stop: () => void }

let _canvas: CanvasInstance | null = null

export function registerEffectCanvas(c: CanvasInstance | null) {
  _canvas = c
}

export function playEffect(fx: string): Promise<void> {
  return new Promise(resolve => {
    if (!_canvas) { resolve(); return }
    _canvas.play(fx, resolve)
  })
}
