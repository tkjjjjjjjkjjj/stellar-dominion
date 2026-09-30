// Particle bursts on a shared canvas (sleeps when idle) + resource fly-to-HUD sprites.
import { resourceIcon, starIcon } from "./art.js";

const PALETTES = {
  cyan: ["#38e1ff", "#9ff4ff", "#ffffff"],
  gold: ["#ffc53d", "#fff0b0", "#ff9a3c"],
  green: ["#37f29a", "#b8ffd9", "#ffffff"],
  purple: ["#a978ff", "#e2c8ff", "#6f8cff"],
  red: ["#ff4d6a", "#ffb0b8", "#ff9a3c"],
};

let canvas, ctx, particles = [], running = false, dpr = 1;
let reduced = () => false;

export function initFx(canvasEl, reducedMotion) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  reduced = reducedMotion;
  resize();
  addEventListener("resize", resize);
}

function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function burst(x, y, count = 20, theme = "cyan", { speed = 1, ring = false } = {}) {
  if (reduced()) return;
  const palette = PALETTES[theme] || PALETTES.cyan;
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (1.5 + Math.random() * 5.5) * speed;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5, life: 1, decay: .018 + Math.random() * .02, size: 1.5 + Math.random() * 2.8, color: palette[i % palette.length], spark: Math.random() < .5 });
  }
  if (ring) particles.push({ ring: true, x, y, r: 6, life: 1, decay: .04, color: palette[0] });
  if (particles.length > 420) particles.splice(0, particles.length - 420);
  if (!running) { running = true; requestAnimationFrame(draw); }
}

export function burstAt(el, count, theme, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, theme, opts);
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    p.life -= p.decay;
    if (p.ring) {
      p.r += 4.2;
      ctx.globalAlpha = Math.max(0, p.life) * .8;
      ctx.strokeStyle = p.color; ctx.lineWidth = 3 * p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    p.x += p.vx; p.y += p.vy; p.vy += .12; p.vx *= .97; p.vy *= .985;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (p.spark) {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size * .7;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.6 + p.life * .5), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  particles = particles.filter(p => p.life > 0);
  if (particles.length) requestAnimationFrame(draw);
  else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

// Fly small resource icons from a point to their HUD counters.
export function flyResources(from, gains, targetFor, onArrive) {
  const entries = Object.entries(gains).filter(([, v]) => v > 0);
  if (!entries.length) return;
  const origin = from instanceof Element ? center(from.getBoundingClientRect()) : from;
  if (reduced()) { entries.forEach(([k]) => onArrive?.(k)); return; }
  const layer = document.getElementById("flyLayer");
  const per = Math.max(2, Math.min(6, Math.floor(18 / entries.length)));
  entries.forEach(([key], ei) => {
    const target = targetFor(key);
    if (!target) return;
    const to = center(target.getBoundingClientRect());
    for (let i = 0; i < per; i += 1) {
      const el = document.createElement("div");
      el.className = "fly-token";
      el.innerHTML = key === "stars" ? starIcon() : resourceIcon(key);
      layer.append(el);
      const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 46;
      const mid = { x: origin.x + Math.cos(a) * d, y: origin.y + Math.sin(a) * d * .8 };
      const delay = ei * 70 + i * 45;
      const anim = el.animate([
        { transform: `translate(${origin.x}px,${origin.y}px) scale(.3)`, opacity: 0 },
        { transform: `translate(${mid.x}px,${mid.y}px) scale(1.15)`, opacity: 1, offset: .32 },
        { transform: `translate(${mid.x}px,${mid.y - 6}px) scale(1)`, opacity: 1, offset: .42 },
        { transform: `translate(${to.x}px,${to.y}px) scale(.55)`, opacity: .9 },
      ], { duration: 820 + Math.random() * 180, delay, easing: "cubic-bezier(.5,0,.3,1)", fill: "both" });
      anim.onfinish = () => { el.remove(); if (i === per - 1) onArrive?.(key); };
    }
  });
}

function center(r) { return { x: r.left + r.width / 2 - 13, y: r.top + r.height / 2 - 13 }; }
