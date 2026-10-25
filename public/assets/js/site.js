// Newsletter sign-up, as progressive enhancement: without JavaScript the form still posts straight to the provider.
// Nothing is stored in the browser (no cookies, no localStorage) and the email address is never logged.

const MIN_FILL_MS = 1500; // humans take longer than this to type an address and tick the box
const MAX_ATTEMPTS = 4; // per minute, per page load
const TIMEOUT_MS = 15000;

const MESSAGES = {
  email: 'Please enter a valid email address.',
  consent: 'Please tick the box to confirm you want to receive the newsletter.',
  tooMany: 'Too many attempts. Please wait a minute and try again.',
  network: "Couldn't reach the newsletter service. Check your connection and try again.",
  rejected: "That address couldn't be added. Please check it and try again.",
  challenge: 'One more step to prove you are human:',
  challengeLink: 'complete the quick check',
};

const loadedAt = Date.now();
const attempts = [];

const isEmail = (value) => value.length <= 254 && /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/.test(value);

function firstMessage(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstMessage(value[0]);
  if (typeof value === 'object') return firstMessage(Object.values(value)[0]);
  return '';
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

/** Each provider answers differently; normalise to { ok, message?, challenge? }. */
async function interpret(provider, response) {
  if (provider === 'kit') {
    const data = await readJson(response);
    if (data.status === 'success') return { ok: true };
    if (data.status === 'quarantined' && /^https:\/\//.test(data.url ?? '')) return { ok: false, challenge: data.url };
    return { ok: false, message: firstMessage(data.errors?.messages) };
  }
  if (provider === 'mailerlite') {
    const data = await readJson(response);
    if (response.ok && data.success !== false) return { ok: true };
    return { ok: false, message: firstMessage(data.errors) || firstMessage(data.message) };
  }
  // buttondown: a successful embed sign-up answers with a redirect
  if (response.type === 'opaqueredirect' || response.ok) return { ok: true };
  return { ok: false };
}

function enhance(form) {
  const success = form.closest('[data-signup]')?.querySelector('[data-success]');
  const email = form.querySelector('input[type="email"]');
  const consent = form.querySelector('[data-consent]');
  const honeypot = form.querySelector('[data-honeypot]');
  const status = form.querySelector('[data-status]');
  const button = form.querySelector('button[type="submit"]');
  const provider = form.dataset.provider;
  const responds = form.dataset.responds;
  let busy = false;

  const say = (text, tone = 'info') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  const done = () => {
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.focus();
    }
  };

  form.noValidate = true;
  email.addEventListener('input', () => email.removeAttribute('aria-invalid'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const address = email.value.trim();
    if (!isEmail(address)) {
      email.setAttribute('aria-invalid', 'true');
      email.focus();
      return say(MESSAGES.email, 'error');
    }
    if (consent && !consent.checked) {
      consent.focus();
      return say(MESSAGES.consent, 'error');
    }

    // Bots fill hidden fields and submit instantly. Show them a normal success and send nothing.
    if (honeypot?.value || Date.now() - loadedAt < MIN_FILL_MS) return done();

    const now = Date.now();
    while (attempts.length && now - attempts[0] > 60000) attempts.shift();
    if (attempts.length >= MAX_ATTEMPTS) return say(MESSAGES.tooMany, 'error');
    attempts.push(now);

    if (responds === 'navigate') {
      email.value = address;
      form.submit();
      return;
    }

    const body = new URLSearchParams();
    for (const input of form.querySelectorAll('input[type="hidden"]')) body.append(input.name, input.value);
    body.append(email.name, address);

    busy = true;
    button.disabled = true;
    button.classList.add('is-loading');
    say('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        redirect: responds === 'redirect' ? 'manual' : 'follow',
        referrerPolicy: 'strict-origin',
        signal: controller.signal,
      });
      const result = await interpret(provider, response);
      if (result.ok) return done();
      if (result.challenge) {
        say(`${MESSAGES.challenge} `);
        const link = document.createElement('a');
        link.href = result.challenge;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = MESSAGES.challengeLink;
        status.append(link, '.');
        return;
      }
      say(result.message || MESSAGES.rejected, 'error');
    } catch {
      say(MESSAGES.network, 'error');
    } finally {
      clearTimeout(timer);
      busy = false;
      button.disabled = false;
      button.classList.remove('is-loading');
    }
  });
}

document.querySelectorAll('form[data-subscribe]').forEach(enhance);
