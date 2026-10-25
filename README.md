# Elarion website

Elarion's game dev site: a newsletter sign-up home page, news and a press kit. Live at **https://elarion-game-dev.github.io/**.

- **Home** (`/`): the sign-up page. Logo, a short about text, the newsletter hook, one email field and one button. After signing up, a "Wishlist on Steam" button.
- **News** (`/news/`): posts, one page per post (`/news/<address>/`) and an RSS feed (`/news/feed.xml`).
- **Press kit** (`/press/`): factsheet, description, history, features, screenshots, logos, videos, quotes, team and contact. Every section can be switched off, renamed and reordered.
- **Menu**: a bar hanging from the top edge with star dividers and social icons; a full-screen menu behind a button on phones (works without JavaScript).
- **Social links**: ~30 game-dev platforms (stores, Discord, video, social, crowdfunding). Each link can show in the top menu, in the "Follow" band above the footer, or both.
- **Effects**: a CRT screen (scanlines, phosphor stripes, flicker, red/blue text split) and comic halftone dots that drift with the mouse. Both have still versions for visitors who prefer reduced motion.
- **Admin** (`/admin/`): edits every text, image, page, menu item, social link, effect and visual setting, with a live preview of every page (including ones switched off).

The sign-up form posts straight to your email provider (Kit, MailerLite, Buttondown or any HTML-form provider). Subscriber emails never touch this site or this repository. There's no server and no npm dependencies: plain HTML/CSS/JS built by a small Node script and deployed by GitHub Actions.

## Everyday use

1. Open `/admin/` and sign in with a GitHub token (the sign-in page has a link that pre-fills it).
2. Edit; the preview on the right follows the panel you're in and updates as you type. Use the page picker to see any page, and the ✓ button to see the message shown after signing up.
3. Press **Publish** (or Ctrl+S). That makes one commit to `content/site.json` (plus any uploaded images), and the site is live about a minute later. The admin shows the deploy status.

Every publish is a git commit, so **History & backup** in the admin can load any older version. You can also edit `content/site.json` directly and push.

### Admin token

Create a **fine-grained** token (the link on the sign-in page pre-fills it):

- Resource owner: `elarion-game-dev`
- Repository access: **Only select repositories** → `elarion-game-dev.github.io`
- Permissions: **Contents: Read and write**, **Actions: Read** (for deploy status)
- Expiry: 90 days is a good balance. When it expires, just make a new one.

By default the token lives in the tab's session storage and is gone when the tab closes. Tick "Keep me signed in" only on your own device. To cut off access, revoke the token at https://github.com/settings/personal-access-tokens.

## Connecting the newsletter (Kit, recommended)

Kit is free for up to 10,000 subscribers. The admin's **Email provider** panel has the full steps:

1. Create a Kit account and an inline form.
2. Turn on double opt-in ("Send incentive email") and set the redirect after confirming to `https://elarion-game-dev.github.io/confirmed/`. That page thanks them and shows the Steam button.
3. Copy the form ID into the admin and publish.
4. Add your mailing address in Kit (anti-spam laws require it in every email footer; Kit adds it for you).

Until a provider is connected, the form shows a "coming soon" message instead of collecting anything. Add your Steam store link under **Home page → After sign-up**; until then the Steam button only appears in the preview.

## Privacy & security

| | |
|---|---|
| Content Security Policy | Strict policy on every page: `default-src 'none'`, scripts, styles and images only from this site, network access only to the configured email provider. No `unsafe-inline`. |
| Tracking | No cookies, analytics, ads or third-party scripts, so no cookie banner is needed. Nothing is stored in visitors' browsers. |
| Third parties | Fonts and all images are hosted on this site (images must be uploaded; remote image URLs are rejected). Page visits contact no other servers. Videos in the press kit are links, not embeds. |
| Consent | Double opt-in at the provider, plus a consent statement linking the privacy policy under the form. An unticked, required checkbox can be switched on in the admin. |
| Bots | Hidden honeypot field, minimum fill time, 4 attempts/minute limit; the provider's own spam checks on top. |
| Privacy policy | Generated at `/privacy/` from the admin settings: controller, purposes, legal bases, processors, transfers, retention, rights. Optional legal notice (Impressum) at `/legal/`. |
| Transport | HTTPS with HSTS (GitHub Pages). `strict-origin-when-cross-origin` referrer policy. |
| Admin | No password database to leak. Access is a GitHub token scoped to this one repository; the admin only talks to `api.github.com`, refuses to run in a frame, and is `noindex`. Uploaded images are re-encoded in the browser (strips GPS/EXIF metadata); SVG uploads are refused. |
| Input handling | All settings pass through one normaliser (length limits, colour/URL/enum validation) and all output is escaped. `npm test` throws hostile input at every field. |
| Supply chain | No npm dependencies. GitHub Actions pinned to commit SHAs, kept current by Dependabot. |
| Disclosure | `/.well-known/security.txt`, `SECURITY.md` and private vulnerability reporting. |

The privacy policy is a careful template for a newsletter-only site, not legal advice. Have it reviewed if you add analytics, ads or sales.

## Local development

Requires Node.js 20+. No `npm install` needed.

```sh
npm run dev    # builds, serves http://127.0.0.1:4321 and rebuilds on change
npm test       # security and sanity checks
npm run build  # output in dist/
```

The local admin (`http://127.0.0.1:4321/admin/`) still publishes to the real repository.

## Layout

```
content/site.json      all site settings (what the admin edits)
src/                   shared by the build and the admin preview
  settings.mjs         defaults + normaliser
  render.mjs           every page, RSS feed, robots.txt, sitemap, security.txt, manifest
  themes.mjs           presets, fonts, theme.css, contrast checks
  providers.mjs        newsletter providers
public/                copied as-is (CSS, sign-up script, fonts, images, press logos, admin)
public/assets/uploads/ images uploaded through the admin
scripts/               build, dev server, checks
```

Fonts are licensed under the SIL Open Font License (see `public/assets/fonts/LICENSES.txt`). Brand icons are from Simple Icons (CC0).
