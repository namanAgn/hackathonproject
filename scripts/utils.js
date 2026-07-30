// utilities used across modules (drawing helpers, coordinate transforms)
import { state } from './state.js';
import * as C from './constants.js';

let ctx = null;
export function initUtils(context) {
  ctx = context;
}

export function lerp(a, b, t) { return a + (b - a) * t; }

export function triggerScreenShake(intensity, duration) {
  state.camera.shakeIntensity = intensity;
  state.camera.shakeDuration = duration;
}

export function worldToScreen(wx, wy) {
  return { x: wx * state.camera.scale + state.camera.x, y: wy * state.camera.scale + state.camera.y };
}
export function screenToWorld(sx, sy) {
  return { x: (sx - state.camera.x) / state.camera.scale, y: (sy - state.camera.y) / state.camera.scale };
}

export function drawText(ctx, text, x, y, size = 24, color = "#fff", align = "center") {
  ctx.save();

  ctx.font = `bold ${size}px Montserrat`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  // Shadow
  ctx.fillStyle = "black";
  ctx.fillText(text, x + 2, y + 2);

  // Text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}

export function drawRect(x, y, w, h, color, angle = 0) {
  if (!ctx) return;
  const center = worldToScreen(x + w / 2, y + h / 2);
  const scaledW = w * state.camera.scale;
  const scaledH = h * state.camera.scale;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-scaledW / 2, -scaledH / 2, scaledW, scaledH);
  ctx.restore();
}

export function roundRectPath(x, y, w, h, r) {
  if (!ctx) return;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawEntityShadow(x, y, w, h) {
  if (!ctx) return;
  const center = worldToScreen(x + w / 2, y + h * 0.62);
  const rx = (w / 2) * 0.85 * state.camera.scale;
  const ry = (h / 2) * 0.32 * state.camera.scale;
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.restore();
}

export function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let r = (num >> 16) + amt;
  let g = (num >> 8 & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = r < 255 ? (r < 0 ? 0 : r) : 255;
  g = g < 255 ? (g < 0 ? 0 : g) : 255;
  b = b < 255 ? (b < 0 ? 0 : b) : 255;
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

export function drawCircle(wx, wy, r, color) {
  if (!ctx) return;
  const p = worldToScreen(wx, wy);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * state.camera.scale, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawLine(wx1, wy1, wx2, wy2, color, width = 1) {
  if (!ctx) return;
  const p1 = worldToScreen(wx1, wy1);
  const p2 = worldToScreen(wx2, wy2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width * state.camera.scale;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

export function drawGrid(canvas) {
  if (!ctx) return;
  const step = C.GRID_SIZE * state.camera.scale;
  if (step < 3) return;
  const offsetX = ((state.camera.x % step) + step) % step;
  const offsetY = ((state.camera.y % step) + step) % step;
  ctx.strokeStyle = C.GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = offsetX; x < canvas.width; x += step) {
    ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, canvas.height);
  }
  for (let y = offsetY; y < canvas.height; y += step) {
    ctx.moveTo(0, y + 0.5); ctx.lineTo(canvas.width, y + 0.5);
  }
  ctx.stroke();
}