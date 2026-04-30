<template>
  <canvas ref="canvasEl" class="effect-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canvasEl = ref<HTMLCanvasElement | null>(null)
let animId: number | null = null

function resize() {
  const c = canvasEl.value
  if (!c) return
  c.width = window.innerWidth
  c.height = window.innerHeight
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})
onUnmounted(() => {
  window.removeEventListener('resize', resize)
  if (animId) cancelAnimationFrame(animId)
})

function stop() {
  if (animId) { cancelAnimationFrame(animId); animId = null }
  const c = canvasEl.value
  if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height)
}

// ── Fireworks ──────────────────────────────────────────────────────────────
function playFireworks(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; radius: number; color: string; decay: number }
  const particles: Particle[] = []
  const palette = ['#ff2d78','#ff6a00','#ffe600','#00d4ff','#bf5fff','#ff4f4f','#44ffcc','#ffffff']

  function burst(x: number, y: number) {
    const color = palette[Math.floor(Math.random() * palette.length)]!
    const count = 70 + Math.floor(Math.random() * 40)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
      const speed = 2.5 + Math.random() * 5
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, radius: 2 + Math.random() * 2.5, color, decay: 0.012 + Math.random() * 0.012 })
    }
  }

  const burstTimes = Array.from({ length: 7 }, (_, i) => ({ t: i * 140 + Math.random() * 80, x: W * (0.15 + Math.random() * 0.7), y: H * (0.1 + Math.random() * 0.55) }))
  const startTime = performance.now()

  function frame(now: number) {
    const elapsed = now - startTime
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, W, H)
    for (const b of burstTimes) {
      if (elapsed >= b.t && !('fired' in b)) { burst(b.x, b.y); (b as any).fired = true }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.98; p.alpha -= p.decay
      if (p.alpha <= 0) { particles.splice(i, 1); continue }
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    if (elapsed < 2600 || particles.length > 0) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Flames ─────────────────────────────────────────────────────────────────
function playFlames(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  type Ember = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }
  const embers: Ember[] = []

  function spawn() {
    const count = Math.floor(W / 8)
    for (let i = 0; i < count; i++) {
      const maxLife = 60 + Math.random() * 80
      embers.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 2.5, vy: -(3 + Math.random() * 5), life: maxLife, maxLife, size: 4 + Math.random() * 14, hue: Math.random() * 40 })
    }
  }

  const startTime = performance.now()
  function frame(now: number) {
    const elapsed = now - startTime
    ctx.clearRect(0, 0, W, H)
    if (elapsed < 1400) spawn()
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]!
      e.x += e.vx + Math.sin(e.life * 0.15) * 0.8; e.y += e.vy; e.vy *= 0.985; e.size *= 0.985; e.life--
      if (e.life <= 0 || e.size < 0.5) { embers.splice(i, 1); continue }
      const t = e.life / e.maxLife
      const alpha = t < 0.3 ? t / 0.3 : t > 0.85 ? (1 - t) / 0.15 : 1
      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size)
      grad.addColorStop(0, `hsla(${e.hue + 50},100%,95%,${alpha})`)
      grad.addColorStop(0.3, `hsla(${e.hue + 30},100%,65%,${alpha * 0.9})`)
      grad.addColorStop(0.7, `hsla(${e.hue},100%,45%,${alpha * 0.6})`)
      grad.addColorStop(1, `hsla(${e.hue},100%,20%,0)`)
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill()
    }
    if (elapsed < 2000 || embers.length > 0) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Lightning ──────────────────────────────────────────────────────────────
function playLightning(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  function bolt(x1: number, y1: number, x2: number, y2: number, depth: number) {
    if (depth === 0) return
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * (Math.abs(x2 - x1) + Math.abs(y2 - y1)) * 0.4
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20
    bolt(x1, y1, mx, my, depth - 1); bolt(mx, my, x2, y2, depth - 1)
    const alpha = Math.min(1, depth / 5)
    ctx.strokeStyle = `rgba(160,180,255,${alpha * 0.4})`; ctx.lineWidth = depth * 2.5
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.strokeStyle = `rgba(200,220,255,${alpha * 0.7})`; ctx.lineWidth = depth * 1.2
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = depth * 0.4
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    if (depth >= 3 && Math.random() < 0.45) bolt(mx, my, mx + (Math.random() - 0.5) * W * 0.3, my + H * 0.15, depth - 2)
  }

  function drawStrike(originX: number) {
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(180,200,255,0.06)'; ctx.fillRect(0, 0, W, H)
    ctx.lineCap = 'round'
    bolt(originX, 0, originX + (Math.random() - 0.5) * W * 0.5, H, 6)
  }

  const strikes = [
    { t: 0,   x: W * (0.3 + Math.random() * 0.4) },
    { t: 220, x: W * (0.2 + Math.random() * 0.6) },
    { t: 450, x: W * (0.25 + Math.random() * 0.5) },
    { t: 620, x: W * (0.3 + Math.random() * 0.4) },
  ]
  const startTime = performance.now()
  let lastStrike = -1

  function frame(now: number) {
    const elapsed = now - startTime
    let struck = false
    for (let i = 0; i < strikes.length; i++) {
      if (elapsed >= strikes[i]!.t && lastStrike < i) { drawStrike(strikes[i]!.x); lastStrike = i; struck = true; break }
    }
    if (!struck && elapsed > (strikes.at(-1)?.t ?? 0) + 120) ctx.clearRect(0, 0, W, H)
    if (elapsed < 900) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Money Rain ─────────────────────────────────────────────────────────────
function playMoneyRain(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  type Bill = { x: number; y: number; vx: number; vy: number; rot: number; rotV: number; w: number; h: number; alpha: number; wobble: number; wobbleSpeed: number }
  const bills: Bill[] = []

  function spawnBill() {
    const w = 52 + Math.random() * 28
    bills.push({
      x: Math.random() * (W + 80) - 40,
      y: -60,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.5 + Math.random() * 3,
      rot: (Math.random() - 0.5) * 0.6,
      rotV: (Math.random() - 0.5) * 0.06,
      w, h: w * 0.44,
      alpha: 0.92,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
    })
  }

  function drawBill(b: Bill) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.rot)
    const scaleY = Math.abs(Math.cos(b.wobble)) * 0.85 + 0.15
    ctx.scale(1, scaleY)
    ctx.globalAlpha = b.alpha

    // Bill body
    const grad = ctx.createLinearGradient(-b.w / 2, -b.h / 2, b.w / 2, b.h / 2)
    grad.addColorStop(0, '#1a5c1a')
    grad.addColorStop(0.4, '#2d8c2d')
    grad.addColorStop(1, '#1a5c1a')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 3)
    ctx.fill()

    // Border
    ctx.strokeStyle = 'rgba(100,200,100,0.5)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Inner border
    ctx.strokeStyle = 'rgba(100,200,100,0.3)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.roundRect(-b.w / 2 + 4, -b.h / 2 + 3, b.w - 8, b.h - 6, 1)
    ctx.stroke()

    // $ symbol
    ctx.fillStyle = 'rgba(150,255,150,0.9)'
    ctx.font = `bold ${b.h * 0.6}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('$', 0, 0)

    ctx.restore()
  }

  const startTime = performance.now()
  let spawnAcc = 0

  function frame(now: number) {
    const elapsed = now - startTime
    ctx.clearRect(0, 0, W, H)

    if (elapsed < 1800) {
      spawnAcc += 0.4
      while (spawnAcc >= 1) { spawnBill(); spawnAcc-- }
    }

    for (let i = bills.length - 1; i >= 0; i--) {
      const b = bills[i]!
      b.x += b.vx + Math.sin(b.wobble) * 1.2
      b.y += b.vy
      b.rot += b.rotV
      b.wobble += b.wobbleSpeed
      if (elapsed > 1600) b.alpha -= 0.015
      if (b.y > H + 80 || b.alpha <= 0) { bills.splice(i, 1); continue }
      drawBill(b)
    }
    ctx.globalAlpha = 1

    if (elapsed < 2400 || bills.length > 0) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Blood Splatter ──────────────────────────────────────────────────────────
function playBloodSplatter(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  type Drop = { x: number; y: number; vx: number; vy: number; r: number; stuck: boolean; drip: number; dripSpeed: number; alpha: number }
  const drops: Drop[] = []

  function splat(cx: number, cy: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 10
      drops.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        r: 3 + Math.random() * 10,
        stuck: false,
        drip: 0,
        dripSpeed: Math.random() < 0.4 ? 0.4 + Math.random() * 1.2 : 0,
        alpha: 1,
      })
    }
  }

  // 4–6 impact points spread across screen
  const impacts = Array.from({ length: 5 }, () => ({
    t: Math.random() * 400,
    x: W * (0.1 + Math.random() * 0.8),
    y: H * (0.1 + Math.random() * 0.6),
  })).sort((a, b) => a.t - b.t)

  const startTime = performance.now()

  function frame(now: number) {
    const elapsed = now - startTime
    ctx.clearRect(0, 0, W, H)

    for (const imp of impacts) {
      if (elapsed >= imp.t && !('fired' in imp)) { splat(imp.x, imp.y, 40 + Math.floor(Math.random() * 30)); (imp as any).fired = true }
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]!
      if (!d.stuck) {
        d.vx *= 0.88; d.vy += 0.35
        d.x += d.vx; d.y += d.vy
        if (d.vy > 0 && d.y > H * 0.15 && Math.random() < 0.04) d.stuck = true
      } else if (d.dripSpeed > 0) {
        d.drip += d.dripSpeed
      }
      if (elapsed > 1400) d.alpha -= 0.008
      if (d.alpha <= 0) { drops.splice(i, 1); continue }

      ctx.globalAlpha = d.alpha
      const hue = 0, sat = 90, lit = d.stuck ? 18 : 25
      ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`

      // Main blob
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill()

      // Drip
      if (d.stuck && d.dripSpeed > 0 && d.drip > 0) {
        ctx.beginPath()
        ctx.moveTo(d.x - d.r * 0.4, d.y)
        ctx.quadraticCurveTo(d.x, d.y + d.drip * 0.5, d.x, d.y + d.drip)
        ctx.quadraticCurveTo(d.x, d.y + d.drip * 0.5, d.x + d.r * 0.4, d.y)
        ctx.fill()
        ctx.beginPath(); ctx.arc(d.x, d.y + d.drip, d.r * 0.55, 0, Math.PI * 2); ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    if (elapsed < 2000 || drops.length > 0) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Vortex ──────────────────────────────────────────────────────────────────
function playVortex(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height
  const cx = W / 2, cy = H / 2

  type Mote = { angle: number; radius: number; speed: number; inSpeed: number; size: number; alpha: number; hue: number }
  const motes: Mote[] = []

  for (let i = 0; i < 220; i++) {
    const radius = 80 + Math.random() * Math.max(W, H) * 0.6
    motes.push({
      angle: Math.random() * Math.PI * 2,
      radius,
      speed: (0.04 + Math.random() * 0.04) * (Math.random() < 0.5 ? 1 : 1),
      inSpeed: 4 + Math.random() * 6,
      size: 2 + Math.random() * 5,
      alpha: 0.7 + Math.random() * 0.3,
      hue: Math.random() * 60 + 200, // blue-purple range
    })
  }

  const startTime = performance.now()

  function frame(now: number) {
    const elapsed = now - startTime
    const t = elapsed / 1800
    ctx.fillStyle = `rgba(0,0,0,${0.12 + t * 0.08})`
    ctx.fillRect(0, 0, W, H)

    for (const m of motes) {
      m.angle += m.speed * (1 + t * 3)
      m.radius -= m.inSpeed * (1 + t * 2)
      if (m.radius < 4) m.radius = 4

      const x = cx + Math.cos(m.angle) * m.radius
      const y = cy + Math.sin(m.angle) * m.radius
      const fade = Math.max(0, 1 - elapsed / 1800)
      const alpha = m.alpha * fade

      ctx.globalAlpha = alpha
      ctx.fillStyle = `hsl(${m.hue}, 80%, 65%)`
      ctx.beginPath(); ctx.arc(x, y, m.size * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill()
    }

    // Dark center hole growing
    const holeR = t * t * Math.min(W, H) * 0.4
    if (holeR > 2) {
      const hGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, holeR)
      hGrad.addColorStop(0, 'rgba(0,0,0,0.95)')
      hGrad.addColorStop(0.7, 'rgba(0,0,0,0.7)')
      hGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = 1; ctx.fillStyle = hGrad
      ctx.beginPath(); ctx.arc(cx, cy, holeR, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1

    if (elapsed < 1800) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Portal ──────────────────────────────────────────────────────────────────
function playPortal(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height
  const cx = W / 2, cy = H / 2

  type Orb = { angle: number; dist: number; speed: number; size: number; hue: number; alpha: number }
  const orbs: Orb[] = []
  for (let i = 0; i < 60; i++) {
    orbs.push({ angle: Math.random() * Math.PI * 2, dist: 0.3 + Math.random() * 0.7, speed: 0.02 + Math.random() * 0.04, size: 2 + Math.random() * 4, hue: 160 + Math.random() * 120, alpha: 0.5 + Math.random() * 0.5 })
  }

  const startTime = performance.now()

  function frame(now: number) {
    const elapsed = now - startTime
    const t = Math.min(1, elapsed / 1600)
    ctx.clearRect(0, 0, W, H)

    const maxR = Math.min(W, H) * 0.45 * t
    const innerR = maxR * 0.35

    if (maxR > 4) {
      // Outer glow rings
      for (let ring = 0; ring < 4; ring++) {
        const rr = maxR + ring * 18 * (1 - t * 0.3)
        const grad = ctx.createRadialGradient(cx, cy, Math.max(0, rr - 30), cx, cy, rr + 30)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(0.4, `hsla(${180 + ring * 20},100%,60%,${0.15 - ring * 0.03})`)
        grad.addColorStop(0.7, `hsla(${200 + ring * 20},100%,70%,${0.25 - ring * 0.05})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, rr + 30, 0, Math.PI * 2); ctx.fill()
      }

      // Main ring
      ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(190,100%,75%,${0.9})`; ctx.lineWidth = 4 + t * 6
      ctx.shadowBlur = 30; ctx.shadowColor = '#00ffee'; ctx.stroke(); ctx.shadowBlur = 0

      // Inner void
      const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR)
      voidGrad.addColorStop(0, 'rgba(0,0,20,1)')
      voidGrad.addColorStop(0.6, 'rgba(0,10,40,0.95)')
      voidGrad.addColorStop(1, 'rgba(0,20,60,0.5)')
      ctx.fillStyle = voidGrad; ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill()

      // Inner shimmer
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(200,100%,80%,0.6)`; ctx.lineWidth = 2; ctx.stroke()
    }

    // Orbiting particles
    for (const orb of orbs) {
      orb.angle += orb.speed
      const r = maxR * orb.dist
      const x = cx + Math.cos(orb.angle) * r
      const y = cy + Math.sin(orb.angle) * r
      ctx.globalAlpha = orb.alpha * t
      ctx.fillStyle = `hsl(${orb.hue},100%,70%)`
      ctx.beginPath(); ctx.arc(x, y, orb.size, 0, Math.PI * 2); ctx.fill()
    }

    // Fade out
    if (t > 0.75) {
      ctx.globalAlpha = (t - 0.75) / 0.25
      ctx.fillStyle = '#000010'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.globalAlpha = 1

    if (elapsed < 1600) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Smoke ───────────────────────────────────────────────────────────────────
function playSmoke(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  type Puff = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; rot: number; rotV: number; life: number; maxLife: number }
  const puffs: Puff[] = []

  function spawnPuff() {
    const maxLife = 80 + Math.random() * 60
    puffs.push({
      x: W * (0.1 + Math.random() * 0.8),
      y: H + 20,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(1.2 + Math.random() * 2.5),
      r: 30 + Math.random() * 60,
      alpha: 0,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.012,
      life: 0,
      maxLife,
    })
  }

  const startTime = performance.now()
  let acc = 0

  function frame(now: number) {
    const elapsed = now - startTime
    ctx.clearRect(0, 0, W, H)

    if (elapsed < 1500) { acc += 0.3; while (acc >= 1) { spawnPuff(); acc-- } }

    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i]!
      p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99
      p.r += 0.4; p.rot += p.rotV; p.life++
      const t = p.life / p.maxLife
      p.alpha = t < 0.2 ? t / 0.2 * 0.55 : t > 0.6 ? (1 - t) / 0.4 * 0.55 : 0.55
      if (elapsed > 1400) p.alpha *= Math.max(0, 1 - (elapsed - 1400) / 800)
      if (p.life >= p.maxLife || p.alpha <= 0) { puffs.splice(i, 1); continue }

      ctx.save()
      ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      const l = 18 + Math.floor(t * 12)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r)
      grad.addColorStop(0, `rgba(${l+10},${l+10},${l+10},${p.alpha * 0.9})`)
      grad.addColorStop(0.5, `rgba(${l},${l},${l},${p.alpha * 0.6})`)
      grad.addColorStop(1, `rgba(${l},${l},${l},0)`)
      ctx.fillStyle = grad
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.75, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    if (elapsed < 2200 || puffs.length > 0) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Ink Splat ────────────────────────────────────────────────────────────────
function playInkSplat(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  const startTime = performance.now()
  const impacts = Array.from({ length: 3 }, (_, i) => ({
    t: i * 180,
    x: W * (0.2 + Math.random() * 0.6),
    y: H * (0.2 + Math.random() * 0.6),
    maxR: Math.min(W, H) * (0.25 + Math.random() * 0.2),
  }))

  // Tentacles per impact
  type Tentacle = { angle: number; len: number; maxLen: number; cx: number; cy: number; ctrl1x: number; ctrl1y: number; ctrl2x: number; ctrl2y: number; w: number }
  const tentacles: Tentacle[] = []

  function addTentacles(x: number, y: number, maxR: number) {
    const count = 10 + Math.floor(Math.random() * 8)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const len = maxR * (0.5 + Math.random() * 0.8)
      const wobble = (Math.random() - 0.5) * 0.8
      tentacles.push({
        angle, len, maxLen: len, cx: x, cy: y,
        ctrl1x: x + Math.cos(angle + wobble) * len * 0.4,
        ctrl1y: y + Math.sin(angle + wobble) * len * 0.4,
        ctrl2x: x + Math.cos(angle - wobble) * len * 0.75,
        ctrl2y: y + Math.sin(angle - wobble) * len * 0.75,
        w: 3 + Math.random() * 8,
      })
    }
  }

  function frame(now: number) {
    const elapsed = now - startTime

    for (const imp of impacts) {
      if (elapsed >= imp.t && !('fired' in imp)) { addTentacles(imp.x, imp.y, imp.maxR); (imp as any).fired = true }
    }

    ctx.clearRect(0, 0, W, H)
    const totalT = Math.min(1, elapsed / 900)

    // Draw each impact blob + tentacles
    for (const imp of impacts) {
      if (!('fired' in imp)) continue
      const localT = Math.min(1, (elapsed - imp.t) / 700)
      const r = imp.maxR * localT
      if (r < 1) continue

      // Blob
      const fadeAlpha = elapsed > 1100 ? Math.max(0, 1 - (elapsed - 1100) / 400) : 1
      ctx.globalAlpha = fadeAlpha
      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath(); ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2); ctx.fill()

      // Splatter dots around edge
      for (let d = 0; d < 12; d++) {
        const da = (Math.PI * 2 * d) / 12 + imp.t * 0.01
        const dr = r * (0.9 + Math.random() * 0.3)
        ctx.beginPath(); ctx.arc(imp.x + Math.cos(da) * dr, imp.y + Math.sin(da) * dr, r * 0.08, 0, Math.PI * 2); ctx.fill()
      }
    }

    // Draw tentacles
    for (const ten of tentacles) {
      const localT = Math.min(1, Math.max(0, (elapsed - impacts.find(i => (i as any).fired && Math.abs((i as any).x - ten.cx) < 2)?.t! || 0) / 600))
      const drawLen = ten.maxLen * localT
      if (drawLen < 2) continue
      const ratio = drawLen / ten.maxLen
      const ex = ten.cx + Math.cos(ten.angle) * drawLen
      const ey = ten.cy + Math.sin(ten.angle) * drawLen
      const fadeAlpha = elapsed > 1100 ? Math.max(0, 1 - (elapsed - 1100) / 400) : 1
      ctx.globalAlpha = fadeAlpha
      ctx.strokeStyle = '#0a0a0a'
      ctx.lineWidth = ten.w * (1 - ratio * 0.6)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(ten.cx, ten.cy)
      ctx.bezierCurveTo(ten.ctrl1x, ten.ctrl1y, ten.ctrl2x, ten.ctrl2y, ex, ey)
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    if (elapsed < 1500) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Pixel Dissolve ───────────────────────────────────────────────────────────
function playPixelDissolve(done: () => void) {
  const c = canvasEl.value!
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height

  const TILE = 18
  const cols = Math.ceil(W / TILE)
  const rows = Math.ceil(H / TILE)

  type Tile = { x: number; y: number; vy: number; vx: number; alpha: number; delay: number; color: string }
  const tiles: Tile[] = []

  const palette = ['#1a1a2e','#16213e','#0f3460','#1a0a2e','#2e1a0a','#0a2e1a','#2e0a1a']

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        x: col * TILE, y: r * TILE,
        vx: (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 5,
        alpha: 1,
        delay: Math.random() * 600,
        color: palette[Math.floor(Math.random() * palette.length)]!,
      })
    }
  }

  const startTime = performance.now()

  function frame(now: number) {
    const elapsed = now - startTime
    ctx.clearRect(0, 0, W, H)

    let anyAlive = false
    for (const t of tiles) {
      const localT = elapsed - t.delay
      if (localT < 0) {
        ctx.globalAlpha = 1; ctx.fillStyle = t.color
        ctx.fillRect(t.x, t.y, TILE - 1, TILE - 1)
        anyAlive = true; continue
      }
      const progress = localT / 500
      t.alpha = Math.max(0, 1 - progress)
      t.x += t.vx * progress * 0.5
      t.y += t.vy * progress
      if (t.alpha <= 0) continue
      anyAlive = true
      ctx.globalAlpha = t.alpha; ctx.fillStyle = t.color
      ctx.fillRect(t.x, t.y, TILE - 1, TILE - 1)
    }
    ctx.globalAlpha = 1

    if (anyAlive) { animId = requestAnimationFrame(frame) }
    else { ctx.clearRect(0, 0, W, H); done() }
  }
  animId = requestAnimationFrame(frame)
}

// ── Public API ─────────────────────────────────────────────────────────────
defineExpose({
  play(effect: string, done: () => void) {
    stop()
    resize()
    if      (effect === 'fx-fireworks')     playFireworks(done)
    else if (effect === 'fx-flames')        playFlames(done)
    else if (effect === 'fx-lightning')     playLightning(done)
    else if (effect === 'fx-money-rain')    playMoneyRain(done)
    else if (effect === 'fx-blood')         playBloodSplatter(done)
    else if (effect === 'fx-vortex')        playVortex(done)
    else if (effect === 'fx-portal')        playPortal(done)
    else if (effect === 'fx-smoke')         playSmoke(done)
    else if (effect === 'fx-ink-splat')     playInkSplat(done)
    else if (effect === 'fx-pixel-dissolve') playPixelDissolve(done)
    else done()
  },
  stop,
})
</script>

<style scoped>
.effect-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.55;
}
</style>
