const canvas = document.querySelector("#motion-field");
const ctx = canvas.getContext("2d");
const sketchCard = document.querySelector(".sketch-card");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let width = 0;
let height = 0;
let pixelRatio = 1;
let pointerX = 0.5;
let pointerY = 0.5;
let rafId = 0;
let burstStartedAt = -1;
let burstX = 0;
let burstY = 0;
let investigationTimer = 0;

const shapes = [
  { x: 0.15, y: 0.22, size: 54, color: "#1f67c7", phase: 0.2, kind: "glass" },
  { x: 0.83, y: 0.25, size: 68, color: "#d5b886", phase: 1.6, kind: "tag" },
  { x: 0.68, y: 0.76, size: 72, color: "#7a5637", phase: 2.7, kind: "diamond" },
  { x: 0.2, y: 0.78, size: 48, color: "#172a42", phase: 4.1, kind: "circle" },
];

function resize() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawJitteredLine(x1, y1, x2, y2, seed, alpha = 0.32) {
  ctx.strokeStyle = `rgba(25, 25, 23, ${alpha})`;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  for (let pass = 0; pass < 2; pass += 1) {
    const wobble = Math.sin(seed + pass * 7) * 2.6;
    ctx.moveTo(x1 + wobble, y1 - wobble);
    const cx = (x1 + x2) / 2 + Math.sin(seed * 0.7 + pass) * 36;
    const cy = (y1 + y2) / 2 + Math.cos(seed * 0.9 + pass) * 28;
    ctx.quadraticCurveTo(cx, cy, x2 - wobble, y2 + wobble);
  }
  ctx.stroke();
}

function drawShape(shape, time) {
  const loop = (Math.sin(time * 0.00038 + shape.phase) + 1) / 2;
  const eased = easeInOutCubic(loop);
  const driftX = Math.sin(time * 0.0007 + shape.phase * 2) * (18 + pointerX * 14);
  const driftY = Math.cos(time * 0.00052 + shape.phase) * (16 + pointerY * 12);
  const x = shape.x * width + driftX;
  const y = shape.y * height + driftY;
  const rotation = eased * Math.PI * 1.25 + shape.phase;
  const size = shape.size + Math.sin(time * 0.0009 + shape.phase) * 5;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = shape.color;
  ctx.strokeStyle = "#191917";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(25, 25, 23, 0.18)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  if (shape.kind === "circle") {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.58, size * 0.48, 0.2, 0, Math.PI * 2);
  } else if (shape.kind === "glass") {
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.26, size * 0.26);
    ctx.lineTo(size * 0.64, size * 0.64);
    ctx.stroke();
    ctx.restore();
    return;
  } else if (shape.kind === "tag") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, -size * 0.28);
    ctx.lineTo(size * 0.28, -size * 0.36);
    ctx.lineTo(size * 0.54, 0);
    ctx.lineTo(size * 0.2, size * 0.42);
    ctx.lineTo(-size * 0.52, size * 0.3);
    ctx.closePath();
  } else if (shape.kind === "triangle") {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(size * 0.58, size * 0.52);
    ctx.lineTo(-size * 0.58, size * 0.5);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.56);
    ctx.lineTo(size * 0.58, 0);
    ctx.lineTo(0, size * 0.56);
    ctx.lineTo(-size * 0.58, 0);
    ctx.closePath();
  }

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawClueBurst(time) {
  if (burstStartedAt < 0) {
    return;
  }

  const progress = Math.min((time - burstStartedAt) / 1050, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  const alpha = (1 - progress) * 0.62;

  ctx.save();
  ctx.strokeStyle = `rgba(31, 103, 199, ${alpha})`;
  ctx.lineWidth = 2;

  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 18 + eased * (84 + ring * 34);
    ctx.beginPath();
    ctx.ellipse(
      burstX + Math.sin(ring * 2.3) * 4,
      burstY + Math.cos(ring * 1.7) * 3,
      radius,
      radius * (0.78 + ring * 0.04),
      ring * 0.08,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  for (let ray = 0; ray < 9; ray += 1) {
    const angle = ray * (Math.PI * 2 / 9) + eased * 0.28;
    const inner = 34 + eased * 34;
    const outer = inner + 18 + Math.sin(ray * 1.9) * 7;
    ctx.beginPath();
    ctx.moveTo(
      burstX + Math.cos(angle) * inner,
      burstY + Math.sin(angle) * inner,
    );
    ctx.lineTo(
      burstX + Math.cos(angle) * outer,
      burstY + Math.sin(angle) * outer,
    );
    ctx.stroke();
  }

  ctx.restore();

  if (progress >= 1) {
    burstStartedAt = -1;
  }
}

function draw(time = 0) {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < 8; i += 1) {
    const y = height * (0.12 + i * 0.115);
    const sway = Math.sin(time * 0.00023 + i * 0.7) * 22;
    drawJitteredLine(width * 0.06, y + sway, width * 0.94, y - sway * 0.45, time * 0.001 + i, 0.09);
  }

  shapes.forEach((shape) => drawShape(shape, time));
  drawClueBurst(time);

  if (!prefersReducedMotion) {
    rafId = requestAnimationFrame(draw);
  }
}

function updatePointer(event) {
  pointerX = event.clientX / Math.max(width, 1);
  pointerY = event.clientY / Math.max(height, 1);
}

function updateCardPointer(event) {
  if (prefersReducedMotion) {
    return;
  }

  const bounds = sketchCard.getBoundingClientRect();
  const normalizedX = (event.clientX - bounds.left) / bounds.width * 2 - 1;
  const normalizedY = (event.clientY - bounds.top) / bounds.height * 2 - 1;
  const curvedX = Math.sign(normalizedX) * normalizedX * normalizedX;
  const curvedY = Math.sign(normalizedY) * normalizedY * normalizedY;

  sketchCard.classList.add("is-tracking");
  sketchCard.style.setProperty("--hat-x", `${curvedX * 13}px`);
  sketchCard.style.setProperty("--hat-y", `${curvedY * 9}px`);
  sketchCard.style.setProperty("--hat-r", `${curvedX * 3.5}deg`);
  sketchCard.style.setProperty("--mag-x", `${-curvedX * 22}px`);
  sketchCard.style.setProperty("--mag-y", `${-curvedY * 16}px`);
  sketchCard.style.setProperty("--mag-r", `${-16 - curvedX * 8}deg`);
}

function resetCardPointer() {
  sketchCard.classList.remove("is-tracking");
  sketchCard.style.setProperty("--hat-x", "0px");
  sketchCard.style.setProperty("--hat-y", "0px");
  sketchCard.style.setProperty("--hat-r", "0deg");
}

function triggerInvestigation(event) {
  const bounds = sketchCard.getBoundingClientRect();
  const hasPointerPosition = event && event.clientX > 0 && event.clientY > 0;
  burstX = hasPointerPosition ? event.clientX : bounds.left + bounds.width / 2;
  burstY = hasPointerPosition ? event.clientY : bounds.top + bounds.height / 2;
  burstStartedAt = prefersReducedMotion ? -1 : performance.now();

  sketchCard.classList.remove("is-investigating");
  void sketchCard.offsetWidth;
  sketchCard.classList.add("is-investigating");

  window.clearTimeout(investigationTimer);
  investigationTimer = window.setTimeout(() => {
    sketchCard.classList.remove("is-investigating");
  }, 980);
}

function handleCardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  triggerInvestigation();
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", updatePointer, { passive: true });
sketchCard.addEventListener("pointermove", updateCardPointer, { passive: true });
sketchCard.addEventListener("pointerleave", resetCardPointer);
sketchCard.addEventListener("click", triggerInvestigation);
sketchCard.addEventListener("keydown", handleCardKeydown);

resize();
draw();

if (prefersReducedMotion) {
  cancelAnimationFrame(rafId);
}
