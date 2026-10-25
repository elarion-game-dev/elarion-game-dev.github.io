// The admin's editing panels. Each panel returns DOM nodes bound to paths in the settings draft.

import { PROVIDERS, resolveProvider } from '../assets/lib/providers.mjs';
import { LIMITS, SECTION_LABELS, SOCIAL_PLATFORMS, setupChecklist } from '../assets/lib/settings.mjs';
import { CARD_STYLES, COLOR_KEYS, FONTS, HERO_BACKGROUNDS, HERO_LAYOUTS, PRESETS, contrastReport } from '../assets/lib/themes.mjs';
import { isEmail, safeUrl } from '../assets/lib/util.mjs';
import { card, code, color, h, icon, image, link, note, range, repeater, select, stringList, steps, tags, text, toggle } from './ui.js';

const httpsOnly = (v) => (safeUrl(v, { allowMailto: false, allowRelative: false }).startsWith('https://') ? '' : 'Must be a full https:// address.');
const linkCheck = (v) => (safeUrl(v) ? '' : 'Use a full https:// address, a mailto: link or a path like /privacy/.');

function head(title, description) {
  return h('header', { class: 'panel-head' }, h('h2', {}, title), description ? h('p', {}, description) : null);
}

// --- overview -------------------------------------------------------------------------

function overview(app) {
  const s = app.normalized();
  const provider = resolveProvider(s.newsletter);
  const checklist = setupChecklist(s, provider);
  const left = checklist.filter((c) => !c.done).length;

  const items = checklist.map((c) =>
    h(
      'li',
      { class: `check-item${c.done ? ' done' : ''}` },
      h('span', { class: 'check-mark' }, icon(c.done ? 'check' : 'alert')),
      h('div', { class: 'check-text' }, h('strong', {}, c.title), h('span', {}, c.detail)),
      c.done ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => app.goto(c.panel) }, 'Open')
    )
  );

  const protections = [
    'Strict Content Security Policy on every page: only this site\'s own scripts run, and pages can only talk to your email provider.',
    'No cookies, analytics or third-party scripts, so no cookie banner is needed.',
    'Fonts and images are self-hosted: no visitor data goes to Google Fonts or other CDNs.',
    'Unticked consent checkbox, plus double opt-in (subscribers confirm by email) at your provider.',
    'Bot protection on the form: hidden honeypot field, minimum fill time and rate limiting.',
    'Subscriber emails go straight to your provider. They are never stored on this site or in the repository.',
    'HTTPS enforced by GitHub Pages, with HSTS.',
    'Generated privacy policy, security.txt, robots.txt and sitemap.',
    'Admin access is controlled by GitHub: a token limited to this one repository. Every change is a git commit you can roll back.',
  ];

  return [
    head(`Welcome back${app.user?.name ? `, ${app.user.name.split(' ')[0]}` : ''}`, 'Edit anything on the left. The preview updates as you type, and nothing goes live until you press Publish.'),
    card(
      left ? `Setup: ${left} thing${left === 1 ? '' : 's'} left` : 'Setup complete',
      left ? 'These keep the newsletter working and the privacy policy complete.' : 'Your newsletter is connected and the privacy policy is filled in.',
      h('ul', { class: 'checklist' }, items)
    ),
    card(
      'Your site',
      null,
      h(
        'div',
        { class: 'link-grid' },
        link(app.siteUrl + '/', 'Open live site'),
        link(app.siteUrl + '/privacy/', 'Privacy policy'),
        link(`https://github.com/${app.repo.owner}/${app.repo.repo}`, 'GitHub repository'),
        link(`https://github.com/${app.repo.owner}/${app.repo.repo}/actions`, 'Deploy history'),
        provider.ready && provider.id === 'kit' ? link('https://app.kit.com/subscribers', 'Kit subscribers') : null,
        provider.ready && provider.id === 'mailerlite' ? link('https://dashboard.mailerlite.com/subscribers', 'MailerLite subscribers') : null,
        provider.ready && provider.id === 'buttondown' ? link('https://buttondown.com/subscribers', 'Buttondown subscribers') : null
      )
    ),
    card('Privacy and security built in', null, h('ul', { class: 'bullet-list' }, protections.map((p) => h('li', {}, p)))),
  ];
}

// --- newsletter -------------------------------------------------------------------------

const GUIDES = {
  kit: (siteUrl) => [
    h('span', {}, 'Create a free account at ', link('https://kit.com', 'kit.com'), '.'),
    h('span', {}, 'Go to ', h('strong', {}, 'Grow → Landing Pages & Forms → Create new → Form → Inline'), ' and pick any template (its design is not used; this site draws its own form).'),
    h('span', {}, 'In the form\'s ', h('strong', {}, 'Settings → Incentive'), ', turn on ', h('strong', {}, 'Send incentive email'), '. This is double opt-in: people must click a link in their inbox before they are subscribed.'),
    h('span', {}, 'Set the redirect after confirming to ', code(`${siteUrl}/confirmed/`), ' so new subscribers land on your welcome page.'),
    h('span', {}, 'Press ', h('strong', {}, 'Publish → HTML'), '. The Form ID is the number in ', code('app.kit.com/forms/1234567/subscriptions'), '. Paste it below.'),
    h('span', {}, 'In Kit\'s account settings, add your sender name and mailing address. Anti-spam laws (CAN-SPAM) require an address in every email footer; Kit adds it automatically.'),
  ],
  mailerlite: (siteUrl) => [
    h('span', {}, 'Create an account at ', link('https://www.mailerlite.com', 'mailerlite.com'), ' and create an ', h('strong', {}, 'embedded form'), ' (Forms → Embedded forms).'),
    h('span', {}, 'In the form settings, turn on ', h('strong', {}, 'double opt-in'), ' and set the confirmation redirect to ', code(`${siteUrl}/confirmed/`), '.'),
    h('span', {}, 'Leave reCAPTCHA off for this form (this site has its own bot protection and does not load Google scripts).'),
    h('span', {}, 'Open the form\'s ', h('strong', {}, 'HTML code'), ' and find ', code('assets.mailerlite.com/jsonp/ACCOUNT/forms/FORM/subscribe'), '. Copy both numbers below.'),
  ],
  buttondown: (siteUrl) => [
    h('span', {}, 'Create an account at ', link('https://buttondown.com', 'buttondown.com'), '. Double opt-in is always on.'),
    h('span', {}, 'Under ', h('strong', {}, 'Settings → Subscribing'), ', set the confirmation redirect to ', code(`${siteUrl}/confirmed/`), '.'),
    h('span', {}, 'Under ', h('strong', {}, 'Settings → Embedding'), ', copy your username from the form URL and paste it below.'),
  ],
  custom: () => [
    'Paste the action URL and email field name from your provider\'s HTML embed code.',
    'With a custom provider the browser goes to the provider\'s own page after subscribing. Make sure double opt-in is on there.',
  ],
};

function newsletter(app) {
  const s = app.normalized();
  const id = app.get('newsletter.provider');
  const provider = resolveProvider(s.newsletter);
  const def = PROVIDERS[id] ?? PROVIDERS.none;
  const options = Object.fromEntries(Object.entries(PROVIDERS).map(([key, p]) => [key, p.label]));

  const connection = card(
    'Email provider',
    'Your provider stores the subscriber list and sends the emails. Kit is recommended: it is free for up to 10,000 subscribers.',
    select(app, 'newsletter.provider', { label: 'Provider', options, rerender: true }),
    id !== 'none' && def.free ? h('p', { class: 'field-help' }, def.free) : null,
    ...def.fields.map((f) =>
      text(app, `newsletter.${id}.${f.key}`, {
        label: f.label,
        help: f.help,
        placeholder: f.placeholder,
        mono: true,
        validate: (v) => (f.pattern.test(v) ? '' : 'This doesn\'t look right. Check the value from your provider.'),
        rerender: true,
      })
    ),
    id === 'none'
      ? note('Until a provider is connected, the form shows your "coming soon" message instead of an email field.', 'warn')
      : provider.ready
        ? note(`Connected. Sign-ups are sent to ${provider.name}. Publish, then try subscribing yourself to test it.`, 'ok')
        : note(`Still needed: ${provider.missing.join(', ')}.`, 'warn'),
    GUIDES[id] ? h('details', { class: 'guide', open: !provider.ready }, h('summary', {}, `How to set up ${def.short ?? def.label}`), steps(GUIDES[id](app.siteUrl))) : null
  );

  return [
    head('Newsletter', 'The sign-up form is the centrepiece of the homepage. Connect your provider and write the copy here.'),
    connection,
    card(
      'Sign-up card',
      null,
      text(app, 'newsletter.heading', { label: 'Heading', maxlength: 100 }),
      text(app, 'newsletter.body', { label: 'Text', multiline: true, rows: 3, maxlength: 500, help: 'Supports **bold**, *italic* and [links](https://…).' }),
      stringList(app, 'newsletter.perks', { label: 'Perks (bullet points)', max: LIMITS.perks, placeholder: 'Early access to playtests' }),
      h(
        'div',
        { class: 'grid-3' },
        text(app, 'newsletter.emailLabel', { label: 'Email field label', maxlength: 60 }),
        text(app, 'newsletter.placeholder', { label: 'Placeholder', maxlength: 60 }),
        text(app, 'newsletter.buttonLabel', { label: 'Button', maxlength: 40 })
      )
    ),
    card(
      'Consent',
      'GDPR requires consent that is specific, informed and freely given. An unticked checkbox is the safest way to record it.',
      toggle(app, 'newsletter.requireConsent', { label: 'Require a consent checkbox (recommended)' }),
      text(app, 'newsletter.consentText', {
        label: 'Consent text',
        multiline: true,
        rows: 2,
        maxlength: 400,
        help: 'Write {privacy} where the link to the privacy policy should go.',
        validate: (v) => (v.includes('{privacy}') ? '' : 'Tip: include {privacy} so people can read the policy before agreeing.'),
      }),
      text(app, 'newsletter.finePrint', { label: 'Fine print under the form', maxlength: 300 })
    ),
    card(
      'Messages',
      null,
      text(app, 'newsletter.successTitle', { label: 'After submitting: title', maxlength: 100 }),
      text(app, 'newsletter.successBody', { label: 'After submitting: text', multiline: true, rows: 2, maxlength: 500 }),
      text(app, 'newsletter.closedMessage', { label: '"Coming soon" message (no provider connected)', maxlength: 200 }),
      text(app, 'newsletter.confirmedTitle', { label: 'Confirmation page: title', maxlength: 100, help: 'Shown at /confirmed/ after someone clicks the link in the confirmation email.' }),
      text(app, 'newsletter.confirmedBody', { label: 'Confirmation page: text', multiline: true, rows: 3, maxlength: 600 })
    ),
  ];
}

// --- brand & hero ---------------------------------------------------------------------

function brand(app) {
  return [
    head('Brand & hero', 'Your name, logo and the first thing visitors read.'),
    card(
      'Brand',
      null,
      text(app, 'site.name', { label: 'Site name', maxlength: 60 }),
      image(app, 'theme.logo', {
        label: 'Logo (optional)',
        help: 'Square image, shown next to the name. Without one, the star mark is used in your accent colour.',
        upload: { maxWidth: 256, maxHeight: 256, name: 'logo' },
      }),
      image(app, 'theme.favicon', {
        label: 'Browser tab icon (optional)',
        help: 'Square image, at least 180×180. Without one, the star mark is used.',
        upload: { maxWidth: 256, maxHeight: 256, format: 'image/png', name: 'favicon' },
      }),
      text(app, 'site.copyrightName', { label: 'Copyright name (footer)', maxlength: 80 })
    ),
    card(
      'Hero',
      null,
      text(app, 'hero.eyebrow', { label: 'Small label above the headline', maxlength: 80 }),
      text(app, 'hero.headline', { label: 'Headline', maxlength: 140, counter: 60 }),
      text(app, 'hero.intro', { label: 'Introduction', multiline: true, rows: 4, maxlength: 600, help: 'Supports **bold**, *italic* and [links](https://…).' })
    ),
  ];
}

// --- appearance ------------------------------------------------------------------------

function appearance(app) {
  const theme = app.get('theme');
  const presetCards = Object.entries(PRESETS).map(([id, preset]) =>
    h(
      'button',
      {
        type: 'button',
        class: `preset${theme.preset === id ? ' active' : ''}`,
        'aria-pressed': theme.preset === id ? 'true' : 'false',
        onclick: () => app.applyPreset(id),
      },
      h(
        'span',
        { class: 'preset-swatches' },
        ['bg', 'surface', 'accent', 'accent2', 'text'].map((k) => {
          const swatch = h('span', { class: 'preset-swatch' });
          swatch.style.background = preset.colors[k];
          return swatch;
        })
      ),
      h('span', { class: 'preset-name' }, preset.label),
      h('span', { class: 'preset-fonts' }, `${FONTS[preset.headingFont].label.split(' (')[0]} + ${FONTS[preset.bodyFont].label.split(' (')[0]}`)
    )
  );

  const report = h('ul', { class: 'contrast' });
  const updateReport = () => {
    report.replaceChildren(
      ...contrastReport(app.get('theme.colors')).map((c) =>
        h(
          'li',
          { class: c.pass ? 'pass' : 'fail' },
          icon(c.pass ? 'check' : 'alert'),
          h('span', {}, c.label),
          h('strong', {}, `${c.ratio.toFixed(1)}:1`),
          h('span', { class: 'contrast-need' }, c.pass ? 'OK' : `needs ${c.min}:1`)
        )
      )
    );
  };
  updateReport();

  const colorFields = COLOR_KEYS.map(([key, label]) =>
    color(app, `theme.colors.${key}`, {
      label,
      onChange: () => {
        app.set('theme.preset', 'custom');
        updateReport();
      },
    })
  );

  const fontOptions = Object.fromEntries(Object.entries(FONTS).map(([id, f]) => [id, f.label]));
  const fontSample = (path) => {
    const sample = h('p', { class: 'font-sample' }, 'The quick mage casts a meteor 123');
    const update = () => sample.dataset.font = app.get(path);
    update();
    sample.update = update;
    return sample;
  };
  const headingSample = fontSample('theme.headingFont');
  const bodySample = fontSample('theme.bodyFont');

  return [
    head('Appearance', 'Pick a starting point, then fine-tune colours, fonts and the hero background.'),
    card('Theme presets', 'Applying a preset replaces the colours, fonts, hero background and card style.', h('div', { class: 'presets' }, presetCards)),
    card('Colours', null, h('div', { class: 'grid-2' }, colorFields), h('h4', { class: 'subhead' }, 'Readability (WCAG AA)'), report),
    card(
      'Typography',
      'All fonts are hosted on this site; nothing is loaded from Google Fonts.',
      h(
        'div',
        { class: 'grid-2' },
        h('div', {}, select(app, 'theme.headingFont', { label: 'Headings', options: fontOptions, onChange: () => headingSample.update() }), headingSample),
        h('div', {}, select(app, 'theme.bodyFont', { label: 'Body text', options: fontOptions, onChange: () => bodySample.update() }), bodySample)
      ),
      h('div', { class: 'grid-2' }, range(app, 'theme.baseSize', { label: 'Text size', min: 14, max: 22, unit: 'px' }), range(app, 'theme.radius', { label: 'Corner roundness', min: 0, max: 32, unit: 'px' }))
    ),
    card(
      'Hero & layout',
      null,
      h(
        'div',
        { class: 'grid-2' },
        select(app, 'theme.heroLayout', { label: 'Hero layout', options: HERO_LAYOUTS }),
        select(app, 'theme.heroBackground', { label: 'Hero background', options: HERO_BACKGROUNDS, rerender: true })
      ),
      theme.heroBackground === 'image'
        ? [
            image(app, 'theme.heroImage', { label: 'Background image', help: 'Wide image, at least 1600 px. A screenshot or key art works well.', upload: { maxWidth: 2400, maxHeight: 1600, name: 'hero' } }),
            range(app, 'theme.heroOverlay', { label: 'Darken image (keeps text readable)', min: 0, max: 95, unit: '%' }),
          ]
        : null,
      h('div', { class: 'grid-2' }, select(app, 'theme.cardStyle', { label: 'Card style', options: CARD_STYLES })),
      toggle(app, 'theme.animations', { label: 'Animations', help: 'Subtle movement in the hero and on hover. Always off for visitors who ask their system for reduced motion.' })
    ),
  ];
}

// --- sections ---------------------------------------------------------------------------

function sections(app) {
  const list = app.get('sections');
  const rows = list.map((section, i) => {
    const input = h('input', { type: 'checkbox', class: 'switch-input', role: 'switch', checked: section.enabled, id: `section-${section.id}` });
    input.addEventListener('change', () => app.set(`sections.${i}.enabled`, input.checked));
    const move = (delta) => {
      const next = [...list];
      const [item] = next.splice(i, 1);
      next.splice(i + delta, 0, item);
      app.set('sections', next);
      app.rerender();
    };
    return h(
      'li',
      { class: 'section-row' },
      h('label', { class: 'switch', for: input.id }, input, h('span', { class: 'switch-track', 'aria-hidden': 'true' }), h('span', { class: 'switch-label' }, SECTION_LABELS[section.id])),
      h(
        'div',
        { class: 'row-buttons' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move up', disabled: i === 0, onclick: () => move(-1) }, icon('up')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Move down', disabled: i === list.length - 1, onclick: () => move(1) }, icon('down'))
      )
    );
  });

  return [
    head('Page sections', 'The hero with the sign-up form always comes first. Choose which sections follow, and in what order.'),
    card('Order & visibility', 'Games and Devlog only show when they have at least one entry.', h('ul', { class: 'section-list' }, rows)),
    card(
      'Closing call-to-action',
      'A final nudge to subscribe at the bottom of the page.',
      text(app, 'cta.heading', { label: 'Heading', maxlength: 100 }),
      text(app, 'cta.body', { label: 'Text', multiline: true, rows: 2, maxlength: 400 }),
      text(app, 'cta.buttonLabel', { label: 'Button', maxlength: 40 })
    ),
  ];
}

function games(app) {
  return [
    head('Games', 'Your games, shown as cards on the homepage.'),
    card('Section', null, text(app, 'games.heading', { label: 'Heading', maxlength: 80 }), text(app, 'games.intro', { label: 'Intro', multiline: true, rows: 2, maxlength: 400 })),
    card(
      'Games',
      null,
      repeater(app, 'games.items', {
        max: LIMITS.games,
        addLabel: 'Add a game',
        itemTitle: (g) => g.title,
        newItem: () => ({ title: 'New game', description: '', url: '', image: '', imageAlt: '', status: 'Coming soon', tags: [], linkLabel: 'Play' }),
        fields: (p) => [
          text(app, `${p}.title`, { label: 'Title', maxlength: 80 }),
          text(app, `${p}.description`, { label: 'Short description', multiline: true, rows: 2, maxlength: 500 }),
          h('div', { class: 'grid-2' }, text(app, `${p}.url`, { label: 'Link', type: 'url', placeholder: 'https://…', validate: linkCheck, mono: true }), text(app, `${p}.linkLabel`, { label: 'Link text', maxlength: 40 })),
          image(app, `${p}.image`, { label: 'Cover image', allowUrl: true, help: '1200×630 works best (the same size as social share images).', upload: { maxWidth: 1200, maxHeight: 900, name: 'game' } }),
          text(app, `${p}.imageAlt`, { label: 'Image description (for screen readers)', maxlength: 200 }),
          h('div', { class: 'grid-2' }, text(app, `${p}.status`, { label: 'Status badge', maxlength: 40, placeholder: 'Playable prototype' }), tags(app, `${p}.tags`, { label: 'Tags', max: LIMITS.tags })),
        ],
      })
    ),
  ];
}

function devlog(app) {
  return [
    head('Devlog', 'Short updates on the homepage. Turn the section on under Page sections.'),
    card('Section', null, text(app, 'devlog.heading', { label: 'Heading', maxlength: 80 }), text(app, 'devlog.intro', { label: 'Intro', maxlength: 400 })),
    card(
      'Posts',
      'Newest first, sorted by date automatically.',
      repeater(app, 'devlog.items', {
        max: LIMITS.devlog,
        addLabel: 'Add a post',
        itemTitle: (p) => [p.date, p.title].filter(Boolean).join(' · '),
        newItem: () => ({ date: new Date().toISOString().slice(0, 10), title: 'New post', body: '', url: '' }),
        fields: (p) => [
          h('div', { class: 'grid-2' }, text(app, `${p}.date`, { label: 'Date', type: 'date' }), text(app, `${p}.url`, { label: 'Link (optional)', type: 'url', validate: linkCheck, mono: true })),
          text(app, `${p}.title`, { label: 'Title', maxlength: 120 }),
          text(app, `${p}.body`, { label: 'Text', multiline: true, rows: 4, maxlength: 2000, help: 'Supports **bold**, *italic*, lists and [links](https://…).' }),
        ],
      })
    ),
  ];
}

function about(app) {
  return [
    head('About', 'Who you are and what you make.'),
    card(
      null,
      null,
      h('div', { class: 'grid-2' }, text(app, 'about.heading', { label: 'Heading', maxlength: 80 }), text(app, 'about.navLabel', { label: 'Menu label', maxlength: 30 })),
      text(app, 'about.body', { label: 'Text', multiline: true, rows: 8, maxlength: 4000, help: 'Blank line = new paragraph. Supports **bold**, *italic*, lists and [links](https://…).' }),
      image(app, 'about.image', { label: 'Photo or artwork (optional)', allowUrl: true, upload: { maxWidth: 1200, maxHeight: 1200, name: 'about' } }),
      text(app, 'about.imageAlt', { label: 'Image description', maxlength: 200 })
    ),
  ];
}

function socials(app) {
  return [
    head('Social links', 'Shown in the About section and the footer.'),
    card(
      null,
      'For Mastodon verification, links use rel="me".',
      repeater(app, 'socials', {
        max: LIMITS.socials,
        addLabel: 'Add a link',
        itemTitle: (s) => SOCIAL_PLATFORMS[s.platform] ?? s.platform,
        newItem: () => ({ platform: 'itch', url: '', label: '' }),
        fields: (p) => [
          h(
            'div',
            { class: 'grid-2' },
            select(app, `${p}.platform`, { label: 'Platform', options: SOCIAL_PLATFORMS }),
            text(app, `${p}.label`, { label: 'Label (optional)', maxlength: 40, placeholder: 'Uses the platform name' })
          ),
          text(app, `${p}.url`, { label: 'URL', type: 'url', placeholder: 'https://…', validate: linkCheck, mono: true }),
        ],
      })
    ),
  ];
}

// --- privacy & legal ------------------------------------------------------------------------

function privacy(app) {
  return [
    head('Privacy & legal', 'These details fill in the privacy policy at /privacy/.'),
    note('The privacy policy is a careful template for a newsletter-only site, not legal advice. If you sell things, run ads or add analytics later, have it reviewed.', 'info'),
    card(
      'Who runs the site',
      'GDPR requires the policy to name the data controller and a way to contact them.',
      text(app, 'privacy.controllerName', { label: 'Your name or company', maxlength: 120 }),
      text(app, 'privacy.country', { label: 'Country', maxlength: 60 }),
      text(app, 'privacy.controllerAddress', { label: 'Postal address (optional, required in some countries)', multiline: true, rows: 3, maxlength: 300 }),
      text(app, 'site.contactEmail', {
        label: 'Contact email for privacy requests',
        type: 'email',
        maxlength: 254,
        validate: (v) => (isEmail(v) ? '' : 'Enter a valid email address.'),
        help: 'Shown publicly on the privacy page, in the footer and in security.txt. A dedicated address is a good idea.',
      })
    ),
    card(
      'Policy details',
      null,
      h('div', { class: 'grid-2' }, text(app, 'privacy.effectiveDate', { label: 'Effective date', type: 'date' }), text(app, 'privacy.minimumAge', { label: 'Minimum age', type: 'number', help: '16 is the safest choice across the EU.' })),
      toggle(app, 'privacy.emailTracking', {
        label: 'My newsletter emails track opens and clicks',
        help: 'Kit and MailerLite do this by default. Turn this off only if you disabled tracking in your provider; the policy text changes to match.',
      }),
      text(app, 'privacy.extra', { label: 'Extra section (optional)', multiline: true, rows: 4, maxlength: 6000, help: 'Added at the end under "More information".' })
    ),
    card(
      'Legal notice / Impressum',
      'Required for websites run from Germany or Austria, and some other countries. Adds a page at /legal/ linked from the footer.',
      toggle(app, 'legal.enabled', { label: 'Publish a legal notice page', rerender: true }),
      app.get('legal.enabled')
        ? [text(app, 'legal.heading', { label: 'Page title', maxlength: 80 }), text(app, 'legal.body', { label: 'Content', multiline: true, rows: 8, maxlength: 6000 })]
        : null
    ),
  ];
}

function seo(app) {
  return [
    head('SEO & sharing', 'How the site looks in search results and when shared on Discord, X, Bluesky and others.'),
    card(
      null,
      null,
      text(app, 'seo.title', { label: 'Page title', maxlength: 120, counter: 60 }),
      text(app, 'seo.description', { label: 'Description', multiline: true, rows: 2, maxlength: 300, counter: 160 }),
      image(app, 'seo.ogImage', { label: 'Share image', help: '1200×630 px. Shown in link previews.', upload: { maxWidth: 1200, maxHeight: 630, name: 'share' } }),
      text(app, 'seo.ogImageAlt', { label: 'Share image description', maxlength: 200 }),
      toggle(app, 'seo.indexable', { label: 'Allow search engines to index the site' })
    ),
    card(
      'Address & language',
      null,
      text(app, 'site.url', { label: 'Site address', type: 'url', validate: httpsOnly, mono: true, help: 'Change this when you move to your own domain.' }),
      text(app, 'site.language', { label: 'Language code', maxlength: 10, mono: true, help: 'For example en, de or sl.' })
    ),
  ];
}

// --- history ------------------------------------------------------------------------------

function history(app) {
  const list = h('div', { class: 'history' }, h('p', { class: 'muted' }, 'Loading versions…'));
  app
    .loadHistory()
    .then((commits) => {
      list.replaceChildren(
        ...commits.map((c, i) =>
          h(
            'div',
            { class: 'history-row' },
            h('div', { class: 'history-text' }, h('strong', {}, c.commit.message.split('\n')[0]), h('span', { class: 'muted' }, `${new Date(c.commit.author.date).toLocaleString()} · ${c.author?.login ?? c.commit.author.name}`)),
            i === 0 ? h('span', { class: 'pill' }, 'Current') : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => app.loadVersion(c.sha) }, 'Load into editor')
          )
        )
      );
    })
    .catch((error) => list.replaceChildren(note(`Couldn't load history: ${error.message}`, 'warn')));

  const importInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', id: 'import-file' });
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (file) app.importJson(file);
  });

  return [
    head('History & backup', 'Every publish is a git commit. Load an older version into the editor, check it in the preview, then publish to restore it.'),
    card('Versions', null, list),
    card(
      'Backup',
      null,
      h(
        'div',
        { class: 'button-row' },
        h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => app.exportJson() }, icon('download'), 'Download settings (.json)'),
        h('label', { class: 'btn btn-ghost', for: 'import-file' }, icon('upload'), 'Import settings'),
        importInput,
        h('button', { type: 'button', class: 'btn btn-ghost danger-text', onclick: () => app.resetDefaults() }, icon('refresh'), 'Reset to defaults')
      )
    ),
  ];
}

export const PANELS = [
  { id: 'overview', label: 'Overview', icon: 'overview', render: overview },
  { id: 'newsletter', label: 'Newsletter', icon: 'newsletter', render: newsletter },
  { id: 'brand', label: 'Brand & hero', icon: 'brand', render: brand },
  { id: 'appearance', label: 'Appearance', icon: 'appearance', render: appearance },
  { id: 'sections', label: 'Page sections', icon: 'sections', render: sections },
  { id: 'games', label: 'Games', icon: 'games', render: games },
  { id: 'devlog', label: 'Devlog', icon: 'devlog', render: devlog },
  { id: 'about', label: 'About', icon: 'about', render: about },
  { id: 'socials', label: 'Social links', icon: 'socials', render: socials },
  { id: 'privacy', label: 'Privacy & legal', icon: 'privacy', render: privacy },
  { id: 'seo', label: 'SEO & sharing', icon: 'seo', render: seo },
  { id: 'history', label: 'History & backup', icon: 'history', render: history },
];
