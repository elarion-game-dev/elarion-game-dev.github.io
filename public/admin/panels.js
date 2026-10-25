// The admin's editing panels. Each panel returns DOM nodes bound to paths in the settings draft.
// `page` is the preview page a panel switches to when it is opened.

import { PERK_ICONS, perkIconSvg } from '../assets/lib/icons.mjs';
import { PROVIDERS, resolveProvider } from '../assets/lib/providers.mjs';
import {
  BAND_LAYOUTS,
  BAND_PLACES,
  HALFTONE_COLORS,
  HALFTONE_PLACES,
  HOME_LAYOUTS,
  LIMITS,
  LOGO_BACKGROUNDS,
  NAV_IDS,
  NAV_LABELS,
  NAV_STYLES,
  PERK_ICON_COLORS,
  PRESS_SECTION_LABELS,
  SOCIAL_GROUPS,
  SOCIAL_PLATFORMS,
  setupChecklist,
} from '../assets/lib/settings.mjs';
import {
  BUTTON_STYLES,
  CARD_STYLES,
  COLOR_KEYS,
  DEFAULT_TEXT_STYLE,
  FONTS,
  FORM_LAYOUTS,
  HEADING_CASES,
  HERO_BACKGROUNDS,
  PRESETS,
  TEXT_CASES,
  TEXT_COLORS,
  TEXT_ROLES,
  TEXT_SHADOWS,
  contrastReport,
} from '../assets/lib/themes.mjs';
import { isEmail, safeUrl, slugify } from '../assets/lib/util.mjs';
import { card, code, color, h, icon, image, link, note, range, repeater, sectionList, select, stringList, steps, text, toggle } from './ui.js';

const httpsOnly = (v) => (safeUrl(v, { allowMailto: false, allowRelative: false }).startsWith('https://') ? '' : 'Must be a full https:// address.');
const linkCheck = (v) => (safeUrl(v) ? '' : 'Use a full https:// address, a mailto: link or a path like /press/.');
const MARKDOWN_HELP = 'Blank line = new paragraph. Supports **bold**, *italic*, lists and [links](https://…).';

function head(title, description) {
  return h('header', { class: 'panel-head' }, h('h2', {}, title), description ? h('p', {}, description) : null);
}

// --- overview -------------------------------------------------------------------------

function overview(app) {
  const s = app.normalized();
  const provider = resolveProvider(s.newsletter);
  const checklist = setupChecklist(s, provider);
  const left = checklist.filter((c) => !c.done && !c.optional).length;
  const base = app.siteUrl;

  const items = checklist.map((c) =>
    h(
      'li',
      { class: `check-item${c.done ? ' done' : ''}${c.optional ? ' optional' : ''}` },
      h('span', { class: 'check-mark' }, icon(c.done ? 'check' : c.optional ? 'plus' : 'alert')),
      h('div', { class: 'check-text' }, h('strong', {}, c.title), h('span', {}, c.detail)),
      c.done ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => app.goto(c.panel) }, 'Open')
    )
  );

  const protections = [
    "Strict Content Security Policy on every page: only this site's own scripts run, and pages can only talk to your email provider.",
    'No cookies, analytics or third-party scripts, so no cookie banner is needed.',
    'Fonts and images are hosted on this site: page visits contact no other servers.',
    'Double opt-in (subscribers confirm by email) at your provider, with a clear statement and a privacy policy link under the form. An optional consent checkbox is available.',
    'Bot protection on the form: hidden honeypot field, minimum fill time and rate limiting.',
    'Subscriber emails go straight to your provider. They are never stored on this site or in the repository.',
    'HTTPS enforced by GitHub Pages, with HSTS.',
    'Generated privacy policy, security.txt, robots.txt, sitemap and RSS feed.',
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
        link(`${base}/`, 'Home'),
        s.nav.news.enabled ? link(`${base}/news/`, 'News') : null,
        s.nav.press.enabled ? link(`${base}/press/`, 'Press kit') : null,
        link(`${base}/privacy/`, 'Privacy policy'),
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

// --- pages & menu -----------------------------------------------------------------------

function pages(app) {
  const rows = NAV_IDS.map((id) =>
    h(
      'div',
      { class: 'menu-row' },
      toggle(app, `nav.${id}.enabled`, {
        label: id === 'home' ? 'Show "Home" in the menu' : `Publish the ${NAV_LABELS[id]} page`,
        rerender: true,
      }),
      text(app, `nav.${id}.label`, { label: 'Menu label', maxlength: 30 }),
      h(
        'p',
        { class: 'field-help' },
        id === 'home'
          ? 'The home page (the sign-up page) always exists; this only hides its menu link. The logo still links home.'
          : `When off, ${id === 'news' ? '/news/, every post and the RSS feed are' : '/press/ is'} removed from the live site and the menu.`
      )
    )
  );
  return [
    head('Pages & menu', 'Choose which pages appear in the top menu. Pages that are switched off can still be opened in the preview.'),
    card('Pages', null, h('div', { class: 'menu-rows' }, rows)),
    card(
      'Menu style',
      'On phones the menu folds into a button in the top-left corner.',
      select(app, 'nav.style', { label: 'Style', options: NAV_STYLES }),
      toggle(app, 'nav.dividers', { label: 'Star dividers between menu items' }),
      toggle(app, 'nav.showSocials', { label: 'Social icons at the end of the menu', help: 'Choose which links appear there under Social links.' })
    ),
  ];
}

// --- home page ------------------------------------------------------------------------------

function perkIconPicker(app) {
  const current = app.get('newsletter.perkIcon');
  const choose = (id) => {
    app.set('newsletter.perkIcon', id);
    app.rerender();
  };
  const choice = (id, label, content) =>
    h('button', { type: 'button', class: 'icon-choice', title: label, 'aria-label': label, 'aria-pressed': String(current === id), onclick: () => choose(id) }, content);
  const svg = (id) => {
    const holder = h('span', {});
    holder.innerHTML = perkIconSvg(id, 'icon'); // static markup from icons.mjs
    return holder.firstChild;
  };
  return h(
    'div',
    { class: 'field' },
    h('span', { class: 'field-label' }, 'Icon in front of each perk'),
    h(
      'div',
      { class: 'icon-picker' },
      Object.entries(PERK_ICONS).map(([id, icon]) => choice(id, icon.label, svg(id))),
      choice('none', 'No icon', 'None'),
      choice('custom', 'Your own image', 'Own image')
    ),
    current === 'custom'
      ? image(app, 'newsletter.perkImage', {
          label: 'Icon image',
          help: 'A small square PNG with a transparent background works best.',
          upload: { maxWidth: 128, maxHeight: 128, format: 'image/png', name: 'perk-icon' },
        })
      : null,
    current === 'none'
      ? null
      : h(
          'div',
          { class: 'grid-2' },
          current === 'custom' ? h('div', {}) : select(app, 'newsletter.perkIconColor', { label: 'Icon colour', options: PERK_ICON_COLORS }),
          range(app, 'newsletter.perkIconSize', { label: 'Icon size', min: 8, max: 40, unit: 'px' })
        )
  );
}

function followCard(app) {
  return card(
    'Follow socials',
    'Your social icons under a heading. Choose which links appear here under Social links.',
    h('div', { class: 'grid-2' }, select(app, 'socialBand.layout', { label: 'Position', options: BAND_LAYOUTS }), select(app, 'socialBand.show', { label: 'Show on', options: BAND_PLACES })),
    text(app, 'socialBand.heading', { label: 'Heading', maxlength: 80, placeholder: 'Leave empty for icons only' }),
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => app.goto('socials') }, icon('socials'), 'Edit the links')
  );
}

function home(app) {
  const showSuccess = h(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-sm',
      'aria-pressed': String(app.previewSuccess),
      onclick: () => app.setPreviewSuccess(!app.previewSuccess),
    },
    icon('eye'),
    app.previewSuccess ? 'Show the form again in the preview' : 'Show this in the preview'
  );

  return [
    head('Home page', 'The home page is the sign-up page: logo, a short about text, the newsletter hook and the email form. Tip: click any text in the preview to jump to its field.'),
    card(
      'Logo',
      null,
      toggle(app, 'home.showLogo', { label: 'Show the logo at the top', rerender: true }),
      app.get('home.showLogo')
        ? [
            image(app, 'home.logoImage', {
              label: 'Logo or key art banner (optional)',
              help: 'Without an image, the site name is shown as a large wordmark with the star mark.',
              upload: { maxWidth: 1600, maxHeight: 900, format: 'image/png', name: 'home-logo' },
            }),
            text(app, 'home.logoImageAlt', { label: 'Image description', maxlength: 200, help: 'Defaults to the site name.' }),
          ]
        : null
    ),
    card(
      'About text',
      null,
      toggle(app, 'home.about.enabled', { label: 'Show the about text', rerender: true }),
      app.get('home.about.enabled')
        ? [text(app, 'home.about.heading', { label: 'Heading', maxlength: 100 }), text(app, 'home.about.body', { label: 'Text', multiline: true, rows: 4, maxlength: 3000, help: MARKDOWN_HELP })]
        : null,
      select(app, 'home.layout', { label: 'Order', options: HOME_LAYOUTS })
    ),
    card(
      'Newsletter sign-up',
      'One email field and one clear button. Connect the provider under Email provider.',
      text(app, 'newsletter.heading', { label: 'Hook (main heading)', maxlength: 140, counter: 80 }),
      text(app, 'newsletter.body', { label: 'Extra text under the hook (optional)', multiline: true, rows: 2, maxlength: 600 }),
      toggle(app, 'newsletter.showPerks', { label: 'Show what subscribers get', rerender: true }),
      app.get('newsletter.showPerks') ? [stringList(app, 'newsletter.perks', { label: 'Subscriber perks', max: LIMITS.perks, placeholder: 'Exclusive screenshots' }), perkIconPicker(app)] : null,
      h(
        'div',
        { class: 'grid-3' },
        text(app, 'newsletter.emailLabel', { label: 'Field label', maxlength: 60 }),
        text(app, 'newsletter.placeholder', { label: 'Placeholder', maxlength: 60 }),
        text(app, 'newsletter.buttonLabel', { label: 'Button', maxlength: 40 })
      ),
      text(app, 'newsletter.trustText', {
        label: 'Trust line under the button',
        maxlength: 300,
        help: 'Say how often you email and that people can unsubscribe at any time.',
      })
    ),
    followCard(app),
    card(
      'Consent',
      'Double opt-in plus this statement is the common standard for newsletter forms. Turn on the checkbox if you prefer explicit, ticked consent.',
      toggle(app, 'newsletter.requireConsent', { label: 'Require a consent checkbox', rerender: true }),
      text(app, 'newsletter.consentText', {
        label: app.get('newsletter.requireConsent') ? 'Checkbox text' : 'Statement under the form',
        multiline: true,
        rows: 2,
        maxlength: 400,
        help: 'Write {privacy} where the link to the privacy policy should go.',
        validate: (v) => (v.includes('{privacy}') ? '' : 'Tip: include {privacy} so people can read the policy.'),
      })
    ),
    card(
      'After sign-up',
      'Shown in place of the form after someone subscribes. The Steam button also appears on the confirmation page.',
      showSuccess,
      text(app, 'newsletter.successTitle', { label: 'Title', maxlength: 100 }),
      text(app, 'newsletter.successBody', { label: 'Text', multiline: true, rows: 2, maxlength: 500 }),
      toggle(app, 'wishlist.enabled', { label: 'Show a Steam wishlist button', rerender: true }),
      app.get('wishlist.enabled')
        ? [
            text(app, 'wishlist.url', {
              label: 'Steam store page',
              type: 'url',
              mono: true,
              placeholder: 'https://store.steampowered.com/app/…',
              validate: httpsOnly,
              help: 'Until this is filled in, the button only shows in the preview.',
            }),
            text(app, 'wishlist.text', { label: 'Text above the button', maxlength: 200 }),
            text(app, 'wishlist.buttonLabel', { label: 'Button', maxlength: 40 }),
          ]
        : null
    ),
  ];
}

// --- email provider ----------------------------------------------------------------------

const GUIDES = {
  kit: (siteUrl) => [
    h('span', {}, 'Create a free account at ', link('https://kit.com', 'kit.com'), '.'),
    h('span', {}, 'Go to ', h('strong', {}, 'Grow → Landing Pages & Forms → Create new → Form → Inline'), ' and pick any template (its design is not used; this site draws its own form).'),
    h('span', {}, "In the form's ", h('strong', {}, 'Settings → Incentive'), ', turn on ', h('strong', {}, 'Send incentive email'), '. This is double opt-in: people must click a link in their inbox before they are subscribed.'),
    h('span', {}, 'Set the redirect after confirming to ', code(`${siteUrl}/confirmed/`), ' so new subscribers land on your welcome page (with the Steam button).'),
    h('span', {}, 'Press ', h('strong', {}, 'Publish → HTML'), '. The Form ID is the number in ', code('app.kit.com/forms/1234567/subscriptions'), '. Paste it below.'),
    h('span', {}, "In Kit's account settings, add your sender name and mailing address. Anti-spam laws (CAN-SPAM) require an address in every email footer; Kit adds it automatically."),
  ],
  mailerlite: (siteUrl) => [
    h('span', {}, 'Create an account at ', link('https://www.mailerlite.com', 'mailerlite.com'), ' and create an ', h('strong', {}, 'embedded form'), ' (Forms → Embedded forms).'),
    h('span', {}, 'In the form settings, turn on ', h('strong', {}, 'double opt-in'), ' and set the confirmation redirect to ', code(`${siteUrl}/confirmed/`), '.'),
    h('span', {}, 'Leave reCAPTCHA off for this form (this site has its own bot protection and does not load Google scripts).'),
    h('span', {}, "Open the form's ", h('strong', {}, 'HTML code'), ' and find ', code('assets.mailerlite.com/jsonp/ACCOUNT/forms/FORM/subscribe'), '. Copy both numbers below.'),
  ],
  buttondown: (siteUrl) => [
    h('span', {}, 'Create an account at ', link('https://buttondown.com', 'buttondown.com'), '. Double opt-in is always on.'),
    h('span', {}, 'Under ', h('strong', {}, 'Settings → Subscribing'), ', set the confirmation redirect to ', code(`${siteUrl}/confirmed/`), '.'),
    h('span', {}, 'Under ', h('strong', {}, 'Settings → Embedding'), ', copy your username from the form URL and paste it below.'),
  ],
  custom: () => [
    "Paste the action URL and email field name from your provider's HTML embed code.",
    "With a custom provider the browser goes to the provider's own page after subscribing. Make sure double opt-in is on there.",
  ],
};

function newsletter(app) {
  const s = app.normalized();
  const id = app.get('newsletter.provider');
  const provider = resolveProvider(s.newsletter);
  const def = PROVIDERS[id] ?? PROVIDERS.none;
  const options = Object.fromEntries(Object.entries(PROVIDERS).map(([key, p]) => [key, p.label]));

  return [
    head('Email provider', 'Your provider stores the subscriber list and sends the emails. Subscriber addresses never touch this site.'),
    card(
      'Connection',
      'Kit is recommended: it is free for up to 10,000 subscribers.',
      select(app, 'newsletter.provider', { label: 'Provider', options, rerender: true }),
      id !== 'none' && def.free ? h('p', { class: 'field-help' }, def.free) : null,
      ...def.fields.map((f) =>
        text(app, `newsletter.${id}.${f.key}`, {
          label: f.label,
          help: f.help,
          placeholder: f.placeholder,
          mono: true,
          validate: (v) => (f.pattern.test(v) ? '' : "This doesn't look right. Check the value from your provider."),
          rerender: true,
        })
      ),
      id === 'none'
        ? note('Until a provider is connected, the form shows your "coming soon" message instead of an email field.', 'warn')
        : provider.ready
          ? note(`Connected. Sign-ups are sent to ${provider.name}. Publish, then try subscribing yourself to test it.`, 'ok')
          : note(`Still needed: ${provider.missing.join(', ')}.`, 'warn'),
      GUIDES[id] ? h('details', { class: 'guide', open: !provider.ready }, h('summary', {}, `How to set up ${def.short ?? def.label}`), steps(GUIDES[id](app.siteUrl))) : null
    ),
    card('While not connected', null, text(app, 'newsletter.closedMessage', { label: '"Coming soon" message', maxlength: 200 })),
    card(
      'Confirmation page',
      'Shown at /confirmed/ after someone clicks the link in the confirmation email. Point your provider\'s "redirect after confirming" here.',
      text(app, 'newsletter.confirmedTitle', { label: 'Title', maxlength: 100 }),
      text(app, 'newsletter.confirmedBody', { label: 'Text', multiline: true, rows: 3, maxlength: 600 })
    ),
    card('News pages', null, toggle(app, 'newsletter.showOnNews', { label: 'Show the sign-up box at the end of the news page and every post' })),
  ];
}

// --- news --------------------------------------------------------------------------------

function news(app) {
  return [
    head('News', 'Posts appear on /news/, each with its own page and in the RSS feed. Switch the page on or off under Pages & menu.'),
    app.get('nav.news.enabled') ? null : note('The News page is switched off, so none of this is on the live site.', 'warn'),
    card(
      'News page',
      null,
      text(app, 'news.heading', { label: 'Heading', maxlength: 80 }),
      text(app, 'news.intro', { label: 'Intro', multiline: true, rows: 2, maxlength: 500 }),
      text(app, 'news.readMoreLabel', { label: '"Read more" link text', maxlength: 40 })
    ),
    card(
      'Posts',
      'Sorted newest first by date. Opening a post here shows it in the preview.',
      repeater(app, 'news.posts', {
        max: LIMITS.posts,
        addLabel: 'Add a post',
        empty: 'No posts yet.',
        itemTitle: (p) => [p.date, p.title].filter(Boolean).join(' · '),
        onOpen: (i) => app.previewPost(i),
        newItem: (existing) => {
          const used = new Set(existing.map((p) => p.slug));
          let slug = 'new-post';
          for (let n = 2; used.has(slug); n++) slug = `new-post-${n}`;
          return { title: 'New post', slug, date: new Date().toISOString().slice(0, 10), image: '', imageAlt: '', summary: '', body: '', url: '', linkLabel: '' };
        },
        fields: (p) => [
          text(app, `${p}.title`, {
            label: 'Title',
            maxlength: 140,
            rerender: true,
            // Until a post is published, its address follows the title. Afterwards it stays put so links keep working.
            onInput: (title, previous) => {
              const slug = app.get(`${p}.slug`);
              if (app.isPublishedSlug(slug) || !(/^new-post(-\d+)?$/.test(slug) || slug === slugify(previous, 'post'))) return;
              const others = new Set(app.get('news.posts').map((post) => post.slug).filter((s) => s !== slug));
              const base = slugify(title, 'post');
              let next = base;
              for (let n = 2; others.has(next); n++) next = `${base}-${n}`;
              app.set(`${p}.slug`, next);
            },
          }),
          h(
            'div',
            { class: 'grid-2' },
            text(app, `${p}.date`, { label: 'Date', type: 'date' }),
            text(app, `${p}.slug`, {
              label: 'Address',
              mono: true,
              maxlength: 60,
              help: `/news/${app.get(`${p}.slug`) || '…'}/`,
              validate: (v) => (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? '' : `Lowercase letters, numbers and dashes, e.g. ${slugify(app.get(`${p}.title`), 'my-post')}`),
            })
          ),
          text(app, `${p}.summary`, { label: 'Summary (shown on the news page and in link previews)', multiline: true, rows: 2, maxlength: 400 }),
          text(app, `${p}.body`, { label: 'Post', multiline: true, rows: 10, maxlength: 20000, help: `${MARKDOWN_HELP} Use ## for a subheading.` }),
          image(app, `${p}.image`, { label: 'Cover image (optional)', help: 'Also used as the share image for this post. 1200×630 works best.', upload: { maxWidth: 1600, maxHeight: 1200, name: 'news' } }),
          text(app, `${p}.imageAlt`, { label: 'Image description', maxlength: 200 }),
          h(
            'div',
            { class: 'grid-2' },
            text(app, `${p}.url`, { label: 'Button link (optional)', type: 'url', mono: true, validate: linkCheck, placeholder: 'https://…' }),
            text(app, `${p}.linkLabel`, { label: 'Button text', maxlength: 40, placeholder: app.get('news.readMoreLabel') })
          ),
        ],
      })
    ),
  ];
}

// --- press kit -----------------------------------------------------------------------------

function press(app) {
  const list = (path, opts) => repeater(app, path, { addLabel: 'Add', ...opts });
  return [
    head('Press kit', 'A presskit for journalists and creators at /press/. Empty sections are hidden automatically.'),
    app.get('nav.press.enabled') ? null : note('The Press kit page is switched off, so none of this is on the live site.', 'warn'),
    card('Page', null, text(app, 'press.heading', { label: 'Heading', maxlength: 80 }), text(app, 'press.intro', { label: 'Intro', multiline: true, rows: 2, maxlength: 1000 })),
    card('Sections', 'Switch sections on or off, rename them and change their order. The factsheet always sits in the sidebar.', sectionList(app, 'press.sections', { labels: PRESS_SECTION_LABELS })),
    card(
      PRESS_SECTION_LABELS.factsheet,
      'Short facts. The press contact (from Privacy & legal) and your social links are added automatically.',
      list('press.facts', {
        max: LIMITS.facts,
        itemTitle: (f) => [f.label, f.value].filter(Boolean).join(': '),
        newItem: () => ({ label: 'Release date', value: 'TBA', url: '' }),
        fields: (p) => [
          h('div', { class: 'grid-2' }, text(app, `${p}.label`, { label: 'Label', maxlength: 60 }), text(app, `${p}.value`, { label: 'Value', maxlength: 200 })),
          text(app, `${p}.url`, { label: 'Link (optional)', type: 'url', mono: true, validate: linkCheck }),
        ],
      })
    ),
    card(PRESS_SECTION_LABELS.description, null, text(app, 'press.description', { label: 'Text', multiline: true, rows: 6, maxlength: 6000, help: MARKDOWN_HELP })),
    card(PRESS_SECTION_LABELS.history, null, text(app, 'press.history', { label: 'Text', multiline: true, rows: 5, maxlength: 6000, help: MARKDOWN_HELP })),
    card(PRESS_SECTION_LABELS.features, null, stringList(app, 'press.features', { label: 'Features', max: LIMITS.features, placeholder: 'A key feature' })),
    card(
      PRESS_SECTION_LABELS.images,
      'High-resolution screenshots press can download (saved as high-quality JPEG, up to 4K).',
      list('press.images', {
        max: LIMITS.images,
        empty: 'No screenshots yet.',
        itemTitle: (i, n) => i.caption || `Screenshot ${n + 1}`,
        newItem: () => ({ src: '', caption: '' }),
        fields: (p) => [
          image(app, `${p}.src`, { label: 'Image', upload: { maxWidth: 3840, maxHeight: 2160, format: 'image/jpeg', quality: 0.92, name: 'press-screenshot' } }),
          text(app, `${p}.caption`, { label: 'Caption', maxlength: 200 }),
        ],
      })
    ),
    card(
      PRESS_SECTION_LABELS.logos,
      'Transparent PNGs work best. Choose a tile colour that makes each logo readable.',
      list('press.logos', {
        max: LIMITS.logos,
        itemTitle: (i, n) => i.label || `Logo ${n + 1}`,
        newItem: () => ({ src: '', label: '', background: 'checker' }),
        fields: (p) => [
          image(app, `${p}.src`, { label: 'Logo file', upload: { maxWidth: 2048, maxHeight: 2048, format: 'image/png', name: 'press-logo' } }),
          h('div', { class: 'grid-2' }, text(app, `${p}.label`, { label: 'Label', maxlength: 100 }), select(app, `${p}.background`, { label: 'Tile', options: LOGO_BACKGROUNDS })),
        ],
      })
    ),
    card(
      PRESS_SECTION_LABELS.videos,
      'Shown as links (no embedded players, so nothing loads from YouTube until someone clicks).',
      list('press.videos', {
        max: LIMITS.videos,
        empty: 'No videos yet.',
        itemTitle: (v) => v.title,
        newItem: () => ({ title: 'Trailer', url: '' }),
        fields: (p) => [text(app, `${p}.title`, { label: 'Title', maxlength: 120 }), text(app, `${p}.url`, { label: 'URL', type: 'url', mono: true, validate: httpsOnly })],
      })
    ),
    card(
      PRESS_SECTION_LABELS.quotes,
      null,
      list('press.quotes', {
        max: LIMITS.quotes,
        empty: 'No quotes yet.',
        itemTitle: (q) => q.source || q.quote.slice(0, 40),
        newItem: () => ({ quote: '', source: '', url: '' }),
        fields: (p) => [
          text(app, `${p}.quote`, { label: 'Quote', multiline: true, rows: 2, maxlength: 600 }),
          h('div', { class: 'grid-2' }, text(app, `${p}.source`, { label: 'Source', maxlength: 120 }), text(app, `${p}.url`, { label: 'Link', type: 'url', mono: true, validate: httpsOnly })),
        ],
      })
    ),
    card(
      PRESS_SECTION_LABELS.team,
      null,
      list('press.team', {
        max: LIMITS.team,
        empty: 'No team members yet.',
        itemTitle: (t) => [t.name, t.role].filter(Boolean).join(', '),
        newItem: () => ({ name: '', role: '', url: '' }),
        fields: (p) => [
          h('div', { class: 'grid-2' }, text(app, `${p}.name`, { label: 'Name', maxlength: 80 }), text(app, `${p}.role`, { label: 'Role', maxlength: 80 })),
          text(app, `${p}.url`, { label: 'Link (optional)', type: 'url', mono: true, validate: linkCheck }),
        ],
      })
    ),
    card(
      PRESS_SECTION_LABELS.contact,
      app.get('site.contactEmail') ? `The email button uses ${app.get('site.contactEmail')} (set under Privacy & legal).` : 'Add a contact email under Privacy & legal to show an email button here.',
      text(app, 'press.contact', { label: 'Text', multiline: true, rows: 3, maxlength: 1000 })
    ),
  ];
}

// --- site & brand ----------------------------------------------------------------------------

function brand(app) {
  return [
    head('Site & brand', 'Your name and the small logo used in the menu and footer.'),
    card(
      null,
      null,
      text(app, 'site.name', { label: 'Site name', maxlength: 60 }),
      image(app, 'theme.logo', {
        label: 'Menu logo (optional)',
        help: 'Square image shown next to the name in the menu and footer. Without one, the star mark is used in your accent colour.',
        upload: { maxWidth: 256, maxHeight: 256, format: 'image/png', name: 'logo' },
      }),
      image(app, 'theme.favicon', {
        label: 'Browser tab icon (optional)',
        help: 'Square image, at least 180×180. Without one, the star mark is used.',
        upload: { maxWidth: 256, maxHeight: 256, format: 'image/png', name: 'favicon' },
      }),
      text(app, 'site.copyrightName', { label: 'Copyright name (footer)', maxlength: 80 })
    ),
    card(
      'Footer',
      'One small line at the very bottom: copyright, privacy policy, press kit and contact links.',
      text(app, 'footer.note', { label: 'Short note (optional)', maxlength: 120, placeholder: 'No cookies, no tracking.' })
    ),
  ];
}

// --- appearance ------------------------------------------------------------------------------

function appearance(app) {
  const theme = app.get('theme');
  const presetCards = Object.entries(PRESETS).map(([id, preset]) =>
    h(
      'button',
      { type: 'button', class: `preset${theme.preset === id ? ' active' : ''}`, 'aria-pressed': theme.preset === id ? 'true' : 'false', onclick: () => app.applyPreset(id) },
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
        h('li', { class: c.pass ? 'pass' : 'fail' }, icon(c.pass ? 'check' : 'alert'), h('span', {}, c.label), h('strong', {}, `${c.ratio.toFixed(1)}:1`), h('span', { class: 'contrast-need' }, c.pass ? 'OK' : `needs ${c.min}:1`))
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
    const sample = h('p', { class: 'font-sample' }, 'Early playtest access 123');
    sample.update = () => (sample.dataset.font = app.get(path));
    sample.update();
    return sample;
  };
  const headingSample = fontSample('theme.headingFont');
  const bodySample = fontSample('theme.bodyFont');

  return [
    head('Appearance', 'Pick a starting point, then fine-tune colours, fonts, buttons and the background.'),
    card('Theme presets', 'Applying a preset replaces the colours, fonts, heading style, button style, background and card style.', h('div', { class: 'presets' }, presetCards)),
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
      h('div', { class: 'grid-2' }, select(app, 'theme.headingCase', { label: 'Headings and menu', options: HEADING_CASES }), range(app, 'theme.baseSize', { label: 'Text size', min: 14, max: 22, unit: 'px' }))
    ),
    card(
      'Buttons, form & cards',
      null,
      h('div', { class: 'grid-2' }, select(app, 'theme.buttonStyle', { label: 'Button style', options: BUTTON_STYLES }), select(app, 'theme.formLayout', { label: 'Sign-up form', options: FORM_LAYOUTS })),
      h('div', { class: 'grid-2' }, select(app, 'theme.cardStyle', { label: 'Cards (news, press kit)', options: CARD_STYLES }), range(app, 'theme.radius', { label: 'Corner roundness', min: 0, max: 32, unit: 'px' }))
    ),
    card(
      'Home background',
      'The background behind the logo and sign-up form.',
      select(app, 'theme.heroBackground', { label: 'Style', options: HERO_BACKGROUNDS, rerender: true }),
      theme.heroBackground === 'image'
        ? [
            image(app, 'theme.heroImage', {
              label: 'Background image',
              help: 'Key art or a screenshot, at least 1600 px wide. It is blurred and darkened so the text stays readable.',
              upload: { maxWidth: 2400, maxHeight: 1600, name: 'background' },
            }),
            range(app, 'theme.heroBlur', { label: 'Blur', min: 0, max: 40, unit: 'px' }),
            range(app, 'theme.heroOverlay', { label: 'Darken', min: 0, max: 95, unit: '%' }),
          ]
        : null,
      toggle(app, 'theme.animations', { label: 'Animations', help: 'Gentle movement in the background and on hover. Always off for visitors who ask their system for reduced motion.' })
    ),
  ];
}

// --- text styles -------------------------------------------------------------------------------

const BOLD_AND_CLEAN = { weight: 800, color: 'text', shadow: 'none', crt: false };

function textStyles(app) {
  const fontOptions = { '': 'Theme default', ...Object.fromEntries(Object.entries(FONTS).map(([id, f]) => [id, f.label])) };
  const isDefault = (t) => Object.entries(DEFAULT_TEXT_STYLE).every(([k, v]) => t[k] === v);
  const set = (p, values) => {
    app.set(p, { ...app.get(p), ...values });
    app.rerender();
  };

  const blocks = Object.entries(TEXT_ROLES).map(([id, role]) => {
    const p = `textStyles.${id}`;
    const t = app.get(p);
    const block = h(
      'details',
      { class: 'repeat-item', open: app.isOpen(p) },
      h('summary', { class: 'repeat-summary' }, h('span', { class: 'repeat-title' }, `${role.label}${isDefault(t) ? '' : ' · customised'}`)),
      h(
        'div',
        { class: 'repeat-body' },
        h(
          'div',
          { class: 'grid-2' },
          select(app, `${p}.font`, { label: 'Font', options: fontOptions }),
          range(app, `${p}.weight`, { label: 'Weight (boldness)', min: 0, max: 900, step: 100, format: (v) => (v ? String(v) : 'Default') })
        ),
        h(
          'div',
          { class: 'grid-2' },
          range(app, `${p}.size`, { label: 'Size', min: 50, max: 250, step: 5, unit: '%' }),
          range(app, `${p}.tracking`, { label: 'Letter spacing', min: -10, max: 40, format: (v) => (v ? `${(v / 100).toFixed(2)} em` : 'Default') })
        ),
        h('div', { class: 'grid-2' }, select(app, `${p}.case`, { label: 'Letters', options: TEXT_CASES }), select(app, `${p}.color`, { label: 'Colour', options: TEXT_COLORS, rerender: true })),
        t.color === 'custom' ? color(app, `${p}.customColor`, { label: 'Custom colour' }) : null,
        h(
          'div',
          { class: 'grid-2' },
          select(app, `${p}.shadow`, { label: 'Shadow', options: TEXT_SHADOWS, help: 'A shadow replaces the CRT colour split on this text.' }),
          toggle(app, `${p}.crt`, { label: 'CRT colour split', help: 'Only when the CRT effect is on (Effects).' })
        ),
        h(
          'div',
          { class: 'style-actions' },
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => set(p, BOLD_AND_CLEAN) }, 'Bold & clean'),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => set(p, DEFAULT_TEXT_STYLE) }, icon('refresh'), 'Reset')
        )
      )
    );
    block.addEventListener('toggle', () => app.setOpen(p, block.open));
    return block;
  });

  return [
    head('Text styles', 'Fine-tune single texts on top of the theme: font, boldness, size, colour and effects.'),
    card(
      null,
      '"Bold & clean" gives a heavy, crisp heading in the text colour without the CRT colour split. The CRT scanlines lie over the whole page; turn them down under Effects for an even cleaner look.',
      h('div', { class: 'repeater' }, blocks)
    ),
  ];
}

// --- socials, privacy, seo, history -----------------------------------------------------------

const PLATFORM_OPTIONS = Object.fromEntries(Object.entries(SOCIAL_GROUPS).map(([group, ids]) => [group, Object.fromEntries(ids.map((id) => [id, SOCIAL_PLATFORMS[id]]))]));
const URL_HINTS = {
  steam: 'https://store.steampowered.com/app/…',
  itch: 'https://yourname.itch.io/…',
  discord: 'https://discord.gg/…',
  youtube: 'https://youtube.com/@…',
  bluesky: 'https://bsky.app/profile/…',
  x: 'https://x.com/…',
  tiktok: 'https://tiktok.com/@…',
  email: 'mailto:you@example.com',
};

function socials(app) {
  const list = app.get('socials') ?? [];
  const filled = list.filter((s) => s.url).length;
  return [
    head('Social links', 'Your links, shown as icons in the top menu, in the "Follow" block and in the press kit.'),
    followCard(app),
    card(
      'Links',
      filled
        ? `${filled} of ${list.length} have a link. Links without a URL stay hidden on the live site (the preview shows them faded).`
        : 'The most common game-dev links are ready to fill in. Paste a URL into the ones you use and remove the rest. Links without a URL stay hidden on the live site.',
      repeater(app, 'socials', {
        max: LIMITS.socials,
        addLabel: 'Add a link',
        empty: 'No social links yet.',
        itemTitle: (s) => `${SOCIAL_PLATFORMS[s.platform] ?? s.platform}${s.url ? '' : ' · no link yet'}`,
        newItem: () => ({ platform: 'itch', url: '', label: '', inMenu: true, inBand: true }),
        fields: (p) => [
          h(
            'div',
            { class: 'grid-2' },
            select(app, `${p}.platform`, { label: 'Platform', options: PLATFORM_OPTIONS, rerender: true }),
            text(app, `${p}.label`, { label: 'Label (optional)', maxlength: 40, placeholder: 'Uses the platform name' })
          ),
          text(app, `${p}.url`, {
            label: 'URL',
            type: 'url',
            placeholder: URL_HINTS[app.get(`${p}.platform`)] ?? 'https://…',
            validate: linkCheck,
            mono: true,
            rerender: true,
          }),
          h('div', { class: 'grid-2' }, toggle(app, `${p}.inMenu`, { label: 'In the top menu' }), toggle(app, `${p}.inBand`, { label: 'In the "Follow" block' })),
        ],
      })
    ),
    note('Mastodon verification works: links use rel="me".', 'info'),
  ];
}

function effects(app) {
  return [
    head('Effects', 'Retro screen and comic-book effects. Visitors who ask their system for reduced motion get still versions.'),
    card(
      'CRT screen',
      'Scanlines, colour stripes and a faint flicker over the whole site, like an old monitor.',
      toggle(app, 'effects.crt.enabled', { label: 'CRT effect', rerender: true }),
      app.get('effects.crt.enabled')
        ? [
            range(app, 'effects.crt.scanlines', { label: 'Scanline strength', min: 0, max: 60, unit: '%' }),
            toggle(app, 'effects.crt.flicker', { label: 'Flicker' }),
            toggle(app, 'effects.crt.rgbText', { label: 'Red/blue colour split on headings and the menu' }),
            toggle(app, 'effects.crt.vignette', { label: 'Darker screen edges' }),
          ]
        : null
    ),
    card(
      'Comic halftone dots',
      'A screen of print-style dots that drifts with the mouse and swells around the cursor. With an uploaded home background image, the dots follow the image.',
      toggle(app, 'effects.halftone.enabled', { label: 'Halftone dots', rerender: true }),
      app.get('effects.halftone.enabled')
        ? [
            h('div', { class: 'grid-2' }, select(app, 'effects.halftone.where', { label: 'Where', options: HALFTONE_PLACES }), select(app, 'effects.halftone.color', { label: 'Dot colour', options: HALFTONE_COLORS })),
            h('div', { class: 'grid-2' }, range(app, 'effects.halftone.opacity', { label: 'Strength', min: 5, max: 80, unit: '%' }), range(app, 'effects.halftone.size', { label: 'Dot size', min: 6, max: 28, unit: 'px' })),
            h('div', { class: 'grid-2' }, range(app, 'effects.halftone.angle', { label: 'Screen angle', min: 0, max: 90, unit: '°' }), range(app, 'effects.halftone.mouse', { label: 'Mouse reaction', min: 0, max: 100, unit: '%' })),
            note('Move the mouse over the preview to try it.', 'info'),
          ]
        : null
    ),
  ];
}

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
        label: 'Contact email',
        type: 'email',
        maxlength: 254,
        validate: (v) => (isEmail(v) ? '' : 'Enter a valid email address.'),
        help: 'Shown publicly: privacy page, footer, press kit contact and security.txt. A dedicated address is a good idea.',
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
      app.get('legal.enabled') ? [text(app, 'legal.heading', { label: 'Page title', maxlength: 80 }), text(app, 'legal.body', { label: 'Content', multiline: true, rows: 8, maxlength: 6000 })] : null
    ),
  ];
}

function seo(app) {
  return [
    head('SEO & sharing', 'How the site looks in search results and when shared on Discord, X, Bluesky and others.'),
    card(
      null,
      null,
      text(app, 'seo.title', { label: 'Home page title', maxlength: 120, counter: 60 }),
      text(app, 'seo.description', { label: 'Description', multiline: true, rows: 2, maxlength: 300, counter: 160 }),
      image(app, 'seo.ogImage', { label: 'Share image', help: '1200×630 px. Shown in link previews. News posts with a cover image use their own.', upload: { maxWidth: 1200, maxHeight: 630, format: 'image/jpeg', name: 'share' } }),
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
  { id: 'pages', label: 'Pages & menu', icon: 'sections', render: pages },
  { id: 'home', label: 'Home page', icon: 'brand', render: home, page: 'home' },
  { id: 'newsletter', label: 'Email provider', icon: 'newsletter', render: newsletter, page: 'home' },
  { id: 'news', label: 'News', icon: 'devlog', render: news, page: 'news' },
  { id: 'press', label: 'Press kit', icon: 'press', render: press, page: 'press' },
  { id: 'brand', label: 'Site & brand', icon: 'about', render: brand },
  { id: 'appearance', label: 'Appearance', icon: 'appearance', render: appearance, page: 'home' },
  { id: 'text', label: 'Text styles', icon: 'type', render: textStyles, page: 'home' },
  { id: 'effects', label: 'Effects', icon: 'effects', render: effects, page: 'home' },
  { id: 'socials', label: 'Social links', icon: 'socials', render: socials, page: 'home' },
  { id: 'privacy', label: 'Privacy & legal', icon: 'privacy', render: privacy, page: 'privacy' },
  { id: 'seo', label: 'SEO & sharing', icon: 'seo', render: seo },
  { id: 'history', label: 'History & backup', icon: 'history', render: history },
];
