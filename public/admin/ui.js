// DOM helpers and form controls for the admin page. Everything is built with createElement and
// textContent; innerHTML is only used for the static icon strings below.

export const ICONS = {
  overview: '<path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/>',
  newsletter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  brand: '<path d="M12 2.5c.5 4.3 2.3 7.7 9 9-6.7 1.3-8.5 4.7-9 9-.5-4.3-2.3-7.7-9-9 6.7-1.3 8.5-4.7 9-9z"/>',
  appearance: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/><path d="M12 21a3 3 0 0 1 0-6h1.5a2.5 2.5 0 0 0 0-5"/>',
  sections: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="11" width="18" height="9" rx="1.5"/>',
  press: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 17h3"/>',
  devlog: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  about: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  socials: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  privacy: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z"/>',
  seo: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  desktop: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  mobile: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};

export function icon(name, cls = 'icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = ICONS[name] ?? '';
  return svg;
}

const PROPS = new Set(['value', 'checked', 'selected', 'disabled', 'hidden', 'indeterminate']);

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPS.has(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

let uid = 0;
export const nextId = (prefix = 'f') => `${prefix}-${++uid}`;

// --- layout pieces ------------------------------------------------------------------

export function card(title, description, ...children) {
  return h(
    'section',
    { class: 'panel-card' },
    title ? h('h3', { class: 'panel-card-title' }, title) : null,
    description ? h('p', { class: 'panel-card-desc' }, description) : null,
    ...children
  );
}

export function note(text, tone = 'info') {
  return h('div', { class: `note note-${tone}` }, icon(tone === 'warn' ? 'alert' : tone === 'ok' ? 'check' : 'eye'), h('div', {}, text));
}

export function steps(items) {
  return h('ol', { class: 'steps' }, items.map((item) => h('li', {}, item)));
}

export function code(text) {
  return h('code', { class: 'inline-code' }, text);
}

export function link(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text, icon('external', 'icon icon-xs'));
}

function wrap(label, control, { help, id, inline = false } = {}) {
  const error = h('p', { class: 'field-error', hidden: true, id: `${id}-error`, role: 'alert' });
  const el = h(
    'div',
    { class: `field${inline ? ' field-inline' : ''}` },
    label ? h('label', { class: 'field-label', for: id }, label) : null,
    control,
    help ? h('p', { class: 'field-help', id: `${id}-help` }, help) : null,
    error
  );
  el.showError = (message) => {
    error.textContent = message || '';
    error.hidden = !message;
    const input = el.querySelector('input, textarea, select');
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };
  return el;
}

// --- bound controls: each reads/writes one settings path via the app ------------------

export function text(app, path, { label, help, placeholder, maxlength, type = 'text', multiline = false, rows = 3, validate, counter, rerender, mono, onInput } = {}) {
  const id = nextId();
  const value = app.get(path) ?? '';
  const attrs = { id, placeholder, maxlength, class: `input${mono ? ' mono' : ''}`, 'aria-describedby': help ? `${id}-help` : null, spellcheck: type === 'text' && !mono ? 'true' : 'false' };
  const input = multiline ? h('textarea', { ...attrs, rows, value }) : h('input', { ...attrs, type, value, autocomplete: 'off' });
  const count = counter ? h('span', { class: 'counter' }) : null;
  const el = wrap(label, counter ? h('div', { class: 'with-counter' }, input, count) : input, { help, id });

  const check = () => {
    if (count) {
      count.textContent = `${input.value.length}/${counter}`;
      count.classList.toggle('over', input.value.length > counter);
    }
    if (validate) el.showError(input.value ? validate(input.value.trim()) : '');
  };
  let previous = input.value;
  input.addEventListener('input', () => {
    app.set(path, type === 'number' ? Number(input.value) : input.value);
    onInput?.(input.value, previous);
    previous = input.value;
    check();
  });
  input.addEventListener('change', () => {
    if (rerender) app.rerender();
  });
  check();
  return el;
}

export function toggle(app, path, { label, help, rerender } = {}) {
  const id = nextId();
  const input = h('input', { type: 'checkbox', id, class: 'switch-input', role: 'switch', checked: Boolean(app.get(path)) });
  input.addEventListener('change', () => {
    app.set(path, input.checked);
    if (rerender) app.rerender();
  });
  return h(
    'div',
    { class: 'field field-toggle' },
    h('label', { class: 'switch', for: id }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' }), h('span', { class: 'switch-label' }, label)),
    help ? h('p', { class: 'field-help' }, help) : null
  );
}

export function select(app, path, { label, help, options, rerender, onChange } = {}) {
  const id = nextId();
  const current = app.get(path);
  const input = h(
    'select',
    { id, class: 'input' },
    Object.entries(options).map(([value, text]) => h('option', { value, selected: value === current }, text))
  );
  input.addEventListener('change', () => {
    app.set(path, input.value);
    onChange?.(input.value);
    if (rerender) app.rerender();
  });
  return wrap(label, input, { help, id });
}

export function range(app, path, { label, help, min, max, step = 1, unit = '' } = {}) {
  const id = nextId();
  const output = h('output', { class: 'range-value', for: id });
  const input = h('input', { type: 'range', id, min, max, step, value: app.get(path), class: 'range' });
  const show = () => (output.textContent = `${input.value}${unit}`);
  input.addEventListener('input', () => {
    app.set(path, Number(input.value));
    show();
  });
  show();
  return wrap(label, h('div', { class: 'range-row' }, input, output), { help, id });
}

export function color(app, path, { label, onChange } = {}) {
  const id = nextId();
  const value = app.get(path);
  const picker = h('input', { type: 'color', id, value, class: 'color-swatch', 'aria-label': `${label} colour picker` });
  const hex = h('input', { type: 'text', value, class: 'input mono color-hex', maxlength: 7, 'aria-label': `${label} hex value`, spellcheck: 'false' });
  const commit = (v) => {
    app.set(path, v.toLowerCase());
    onChange?.();
  };
  picker.addEventListener('input', () => {
    hex.value = picker.value;
    commit(picker.value);
  });
  hex.addEventListener('input', () => {
    const v = hex.value.trim();
    const ok = /^#[0-9a-f]{6}$/i.test(v);
    hex.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (ok) {
      picker.value = v;
      commit(v);
    }
  });
  return h('div', { class: 'field field-color' }, h('label', { class: 'field-label', for: id }, label), h('div', { class: 'color-row' }, picker, hex));
}

/** Ordered sections with an on/off switch, up/down buttons and an editable heading: [{ id, enabled, heading }]. */
export function sectionList(app, path, { labels, help } = {}) {
  const sections = app.get(path) ?? [];
  const rows = sections.map((section, i) => {
    const toggleId = nextId('section');
    const input = h('input', { type: 'checkbox', class: 'switch-input', role: 'switch', checked: section.enabled, id: toggleId, 'aria-label': `Show ${labels[section.id]}` });
    input.addEventListener('change', () => app.set(`${path}.${i}.enabled`, input.checked));
    const heading = h('input', { type: 'text', class: 'input input-sm', value: section.heading ?? '', maxlength: 80, 'aria-label': `${labels[section.id]} heading` });
    heading.addEventListener('input', () => app.set(`${path}.${i}.heading`, heading.value));
    return h(
      'li',
      { class: 'section-row' },
      h('label', { class: 'switch', for: toggleId }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' })),
      h('div', { class: 'section-main' }, h('span', { class: 'section-name' }, labels[section.id]), heading),
      rowButtons(app, path, i, sections.length, { removable: false })
    );
  });
  return h('div', { class: 'field' }, h('ul', { class: 'section-list' }, rows), help ? h('p', { class: 'field-help' }, help) : null);
}

/** Editable list of strings with add / remove / reorder. */
export function stringList(app, path, { label, help, max = 6, placeholder } = {}) {
  const items = app.get(path) ?? [];
  const rows = items.map((value, i) => {
    const input = h('input', { type: 'text', class: 'input', value, placeholder, 'aria-label': `${label} ${i + 1}` });
    input.addEventListener('input', () => app.set(`${path}.${i}`, input.value));
    return h('div', { class: 'list-row' }, input, rowButtons(app, path, i, items.length));
  });
  const add =
    items.length < max
      ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => (app.set(path, [...items, '']), app.rerender()) }, icon('plus'), 'Add')
      : null;
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), h('div', { class: 'list' }, rows), add, help ? h('p', { class: 'field-help' }, help) : null);
}

function rowButtons(app, path, index, length, { removable = true } = {}) {
  const move = (delta) => {
    const list = [...app.get(path)];
    const [item] = list.splice(index, 1);
    list.splice(index + delta, 0, item);
    app.set(path, list);
    app.rerender();
  };
  const remove = () => {
    const list = [...app.get(path)];
    list.splice(index, 1);
    app.set(path, list);
    app.rerender();
  };
  return h(
    'div',
    { class: 'row-buttons' },
    h('button', { type: 'button', class: 'icon-btn', title: 'Move up', 'aria-label': 'Move up', disabled: index === 0, onclick: () => move(-1) }, icon('up')),
    h('button', { type: 'button', class: 'icon-btn', title: 'Move down', 'aria-label': 'Move down', disabled: index === length - 1, onclick: () => move(1) }, icon('down')),
    removable ? h('button', { type: 'button', class: 'icon-btn danger', title: 'Remove', 'aria-label': 'Remove', onclick: remove }, icon('trash')) : null
  );
}

/** List of objects, each edited with its own set of fields. onOpen(index) runs when an item is expanded. */
export function repeater(app, path, { title, itemTitle, fields, newItem, max = 24, addLabel = 'Add', empty, onOpen } = {}) {
  const items = app.get(path) ?? [];
  const blocks = items.map((item, i) =>
    h(
      'details',
      { class: 'repeat-item', open: app.isOpen(`${path}.${i}`) },
      h('summary', { class: 'repeat-summary' }, h('span', { class: 'repeat-title' }, itemTitle(item, i) || `Item ${i + 1}`), rowButtons(app, path, i, items.length)),
      h('div', { class: 'repeat-body' }, fields(`${path}.${i}`, item))
    )
  );
  for (const [i, block] of blocks.entries()) {
    block.addEventListener('toggle', () => {
      app.setOpen(`${path}.${i}`, block.open);
      if (block.open) onOpen?.(i);
    });
  }
  const add =
    items.length < max
      ? h(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-sm',
            onclick: () => {
              app.set(path, [...items, newItem(items)]);
              app.setOpen(`${path}.${items.length}`, true);
              app.rerender();
              onOpen?.(items.length);
            },
          },
          icon('plus'),
          addLabel
        )
      : h('p', { class: 'field-help' }, `Maximum of ${max} reached.`);
  return h(
    'div',
    { class: 'repeater' },
    title ? h('span', { class: 'field-label' }, title) : null,
    !items.length && empty ? h('p', { class: 'field-help' }, empty) : null,
    blocks,
    add
  );
}

/**
 * Image field. Images are always uploaded to the site (re-encoded in the browser, metadata stripped),
 * so pages never load images from other servers.
 */
export function image(app, path, { label, help, upload = {} } = {}) {
  const id = nextId();
  const value = app.get(path) ?? '';
  const preview = h('div', { class: 'image-preview' });
  const showPreview = (src) => {
    preview.replaceChildren(src ? h('img', { src: app.imageSrc(src), alt: '' }) : h('span', { class: 'image-empty' }, 'No image'));
  };
  showPreview(value);

  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', class: 'visually-hidden', id: `${id}-file` });
  const status = h('span', { class: 'image-status' });

  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    file.value = '';
    if (!chosen) return;
    status.textContent = 'Processing…';
    try {
      const sitePath = await app.upload(chosen, { ...upload, name: upload.name ?? label });
      app.set(path, sitePath);
      showPreview(sitePath);
      status.textContent = 'Ready (uploads when you publish)';
    } catch (error) {
      status.textContent = error.message;
    }
  });

  const remove = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      onclick: () => {
        app.set(path, '');
        showPreview('');
        status.textContent = '';
      },
    },
    'Remove'
  );

  return h(
    'div',
    { class: 'field field-image' },
    h('span', { class: 'field-label' }, label),
    h(
      'div',
      { class: 'image-row' },
      preview,
      h(
        'div',
        { class: 'image-controls' },
        h('div', { class: 'image-buttons' }, h('label', { class: 'btn btn-ghost btn-sm', for: `${id}-file` }, icon('upload'), value ? 'Replace' : 'Upload'), remove, file),
        status
      )
    ),
    help ? h('p', { class: 'field-help' }, help) : null
  );
}

// --- dialogs and toasts ---------------------------------------------------------------

export function confirmDialog({ title, body, confirm = 'Continue', cancel = 'Cancel', danger = false, extra }) {
  return new Promise((resolve) => {
    const dialog = h(
      'dialog',
      { class: 'dialog' },
      h(
        'form',
        { method: 'dialog' },
        h('h2', { class: 'dialog-title' }, title),
        h('div', { class: 'dialog-body' }, body),
        h(
          'div',
          { class: 'dialog-actions' },
          h('button', { value: 'cancel', class: 'btn btn-ghost' }, cancel),
          extra ? h('button', { value: 'extra', class: 'btn btn-ghost' }, extra) : null,
          h('button', { value: 'ok', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}` }, confirm)
        )
      )
    );
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue || 'cancel');
      dialog.remove();
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export function toast(message, tone = 'info') {
  let region = document.querySelector('.toasts');
  if (!region) {
    region = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  const el = h('div', { class: `toast toast-${tone}` }, icon(tone === 'error' ? 'alert' : 'check'), h('span', {}, message));
  region.append(el);
  setTimeout(() => el.classList.add('leaving'), 4200);
  setTimeout(() => el.remove(), 4600);
}
