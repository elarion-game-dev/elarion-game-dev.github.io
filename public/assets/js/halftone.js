// Comic-book halftone dots on a <canvas>. The dot screen drifts with the mouse (parallax) and the dots
// swell and part around the cursor. With an image, dot sizes follow the image's darkness like print.
// Shared by the site (site.js) and the admin preview, which drives a canvas inside its preview frame.

const TAU = Math.PI * 2;

/** Default pattern when there is no image: light dots in the middle (where the text is), heavier towards the edges. */
function pattern(x, y) {
  const dx = x - 0.5;
  const dy = y - 0.42;
  const edge = Math.min(1, Math.sqrt(dx * dx * 1.4 + dy * dy * 1.1) * 1.75);
  const ripple = 0.5 + 0.5 * Math.sin(x * 7.1 + y * 4.3) * Math.cos(y * 5.7 - x * 2.9);
  return 0.12 + 0.62 * edge * edge + 0.16 * ripple;
}

/**
 * Start drawing. Options:
 *   color, size (dot spacing in px), angle (degrees), mouse (0–100 strength), image (URL),
 *   reduceMotion (draw once, ignore the mouse), win (window that receives pointer events), raf.
 * Returns { destroy }.
 */
export function startHalftone(canvas, opts = {}) {
  const win = opts.win ?? window;
  const raf = opts.raf ?? ((fn) => win.requestAnimationFrame(fn));
  const ctx = canvas.getContext('2d');
  const size = Math.max(6, Number(opts.size) || 11);
  const angle = ((Number(opts.angle) || 0) * Math.PI) / 180;
  const strength = Math.min(1, Math.max(0, (Number(opts.mouse) || 0) / 100));
  const color = opts.color || '#ffffff';
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let luminance = null; // Float32Array of image darkness, sampled on a coarse grid
  let lumW = 0;
  let lumH = 0;
  let frame = 0;
  let destroyed = false;
  let visible = true;

  // Target and eased values: parallax offset, pointer position and how present the pointer is.
  const target = { x: 0.5, y: 0.5, presence: 0 };
  const eased = { x: 0.5, y: 0.5, presence: 0, ox: 0, oy: 0 };

  function sampleImage(img) {
    const step = 4;
    lumW = Math.max(1, Math.ceil(width / step));
    lumH = Math.max(1, Math.ceil(height / step));
    const off = canvas.ownerDocument.createElement('canvas');
    off.width = lumW;
    off.height = lumH;
    const octx = off.getContext('2d', { willReadFrequently: true });
    // Same framing as CSS "background-size: cover; background-position: center".
    const scale = Math.max(lumW / img.naturalWidth, lumH / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    octx.drawImage(img, (lumW - dw) / 2, (lumH - dh) / 2, dw, dh);
    const data = octx.getImageData(0, 0, lumW, lumH).data;
    luminance = new Float32Array(lumW * lumH);
    for (let i = 0; i < luminance.length; i++) {
      const lum = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
      luminance[i] = 1 - lum;
    }
  }

  let image = null;
  if (opts.image) {
    image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (destroyed) return;
      sampleImage(image);
      draw();
    };
    image.src = opts.image;
  }

  function intensity(x, y) {
    if (luminance) {
      const ix = Math.min(lumW - 1, Math.max(0, (x / width) * lumW)) | 0;
      const iy = Math.min(lumH - 1, Math.max(0, (y / height) * lumH)) | 0;
      return luminance[iy * lumW + ix];
    }
    return pattern(x / width, y / height);
  }

  function draw() {
    if (!width || !height) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = color;
    ctx.beginPath();

    const half = size / 2;
    const reach = Math.hypot(width, height) / 2 + size * 2;
    const steps = Math.ceil(reach / size);
    const cx = width / 2 + eased.ox;
    const cy = height / 2 + eased.oy;
    const px = eased.x * width;
    const py = eased.y * height;
    const radius = 140 + size * 9;
    const r2 = radius * radius;
    const pull = eased.presence * strength;

    for (let i = -steps; i <= steps; i++) {
      for (let j = -steps; j <= steps; j++) {
        const gx = i * size;
        const gy = j * size;
        let x = cx + gx * cos - gy * sin;
        let y = cy + gx * sin + gy * cos;
        if (x < -size || y < -size || x > width + size || y > height + size) continue;

        let t = intensity(x, y);
        if (pull > 0.001) {
          const dx = x - px;
          const dy = y - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / radius;
            const k = f * f * pull;
            t = Math.min(1, t + k * 0.85);
            x += (dx / d) * k * size * 1.6;
            y += (dy / d) * k * size * 1.6;
          }
        }
        const r = t * half * 0.92;
        if (r < 0.4) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
    }
    ctx.fill();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(win.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    if (image?.complete && image.naturalWidth) sampleImage(image);
    draw();
  }

  function tick() {
    frame = 0;
    if (destroyed || !visible) return;
    const ease = 0.12;
    const tox = (0.5 - target.x) * strength * size * 3;
    const toy = (0.5 - target.y) * strength * size * 3;
    eased.x += (target.x - eased.x) * 0.22;
    eased.y += (target.y - eased.y) * 0.22;
    eased.presence += (target.presence - eased.presence) * ease;
    eased.ox += (tox - eased.ox) * ease;
    eased.oy += (toy - eased.oy) * ease;
    draw();
    const moving =
      Math.abs(target.x - eased.x) + Math.abs(target.y - eased.y) > 0.0005 ||
      Math.abs(target.presence - eased.presence) > 0.002 ||
      Math.abs(tox - eased.ox) + Math.abs(toy - eased.oy) > 0.05;
    if (moving) frame = raf(tick);
  }

  const wake = () => {
    if (!frame && !destroyed) frame = raf(tick);
  };

  function onMove(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    target.x = (event.clientX - rect.left) / rect.width;
    target.y = (event.clientY - rect.top) / rect.height;
    target.presence = target.x >= -0.1 && target.x <= 1.1 && target.y >= -0.1 && target.y <= 1.1 ? 1 : 0;
    wake();
  }

  function onLeave() {
    target.presence = 0;
    target.x = 0.5;
    target.y = 0.5;
    wake();
  }

  const doc = canvas.ownerDocument;
  win.addEventListener('resize', resize);
  if (!opts.reduceMotion && strength > 0) {
    win.addEventListener('pointermove', onMove, { passive: true });
    doc.documentElement.addEventListener('pointerleave', onLeave);
  }

  // Don't draw while the canvas is off screen or the tab is hidden.
  let observer = null;
  if ('IntersectionObserver' in win) {
    observer = new win.IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) wake();
    });
    observer.observe(canvas);
  }

  resize();

  return {
    destroy() {
      destroyed = true;
      win.removeEventListener('resize', resize);
      win.removeEventListener('pointermove', onMove);
      doc.documentElement.removeEventListener('pointerleave', onLeave);
      observer?.disconnect();
    },
  };
}

/** Read the options the renderer put on the canvas and start it. */
export function startHalftoneFromMarkup(canvas, { win = window, raf, imageSrc = (src) => src } = {}) {
  const docEl = canvas.ownerDocument.documentElement;
  const style = win.getComputedStyle(docEl);
  const colorVar = { accent: '--accent', accent2: '--accent-2', text: '--text' }[canvas.dataset.color] ?? '--accent-2';
  const motionOff = docEl.dataset.motion === 'off' || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return startHalftone(canvas, {
    win,
    raf,
    color: style.getPropertyValue(colorVar).trim() || '#ffffff',
    size: canvas.dataset.size,
    angle: canvas.dataset.angle,
    mouse: canvas.dataset.mouse,
    image: canvas.dataset.image ? imageSrc(canvas.dataset.image) : '',
    reduceMotion: motionOff,
  });
}
