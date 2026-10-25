// Email newsletter providers. Subscriber emails go straight from the visitor's browser to the provider;
// they never touch this website or its GitHub repository.
//
// Each provider describes: the settings the admin fills in, how to build the form's POST URL,
// the name of the email field, extra hidden fields, and what to show in the privacy policy.

import { safeUrl } from './util.mjs';

export const PROVIDERS = {
  none: {
    label: 'Not connected yet',
    fields: [],
  },
  kit: {
    label: 'Kit (formerly ConvertKit)',
    short: 'Kit',
    site: 'https://kit.com',
    privacyUrl: 'https://kit.com/privacy',
    region: 'United States',
    free: 'Free for up to 10,000 subscribers.',
    fields: [
      {
        key: 'formId',
        label: 'Form ID',
        pattern: /^\d{1,12}$/,
        placeholder: '1234567',
        help: 'In Kit: Grow → Landing Pages & Forms → your form → Publish → HTML. The ID is the number in "app.kit.com/forms/<ID>/subscriptions".',
      },
    ],
    action: (c) => `https://app.kit.com/forms/${c.formId}/subscriptions`,
    emailField: 'email_address',
    hidden: () => ({}),
    responds: 'json',
  },
  mailerlite: {
    label: 'MailerLite',
    short: 'MailerLite',
    site: 'https://www.mailerlite.com',
    privacyUrl: 'https://www.mailerlite.com/legal/privacy-policy',
    region: 'European Union',
    free: 'Small free plan; check their pricing page for the current limit.',
    fields: [
      {
        key: 'accountId',
        label: 'Account ID',
        pattern: /^[A-Za-z0-9]{1,32}$/,
        placeholder: '123456',
        help: 'From your form\'s HTML embed code: "assets.mailerlite.com/jsonp/<ACCOUNT ID>/forms/<FORM ID>/subscribe".',
      },
      { key: 'formId', label: 'Form ID', pattern: /^[A-Za-z0-9]{1,32}$/, placeholder: '98765432109876543', help: 'The number after "/forms/" in the same URL.' },
    ],
    action: (c) => `https://assets.mailerlite.com/jsonp/${c.accountId}/forms/${c.formId}/subscribe`,
    emailField: 'fields[email]',
    hidden: () => ({ 'ml-submit': '1', anticsrf: 'true' }),
    responds: 'json',
  },
  buttondown: {
    label: 'Buttondown',
    short: 'Buttondown',
    site: 'https://buttondown.com',
    privacyUrl: 'https://buttondown.com/legal/privacy',
    region: 'United States',
    free: 'Free for up to 100 subscribers.',
    fields: [
      {
        key: 'username',
        label: 'Newsletter username',
        pattern: /^[A-Za-z0-9_-]{1,64}$/,
        placeholder: 'elarion',
        help: 'Settings → Embedding: the last part of "buttondown.com/api/emails/embed-subscribe/<username>".',
      },
      { key: 'tag', label: 'Tag new subscribers (optional)', pattern: /^[\w -]{0,40}$/, placeholder: 'website', optional: true, help: 'Adds this tag to everyone who signs up here.' },
    ],
    action: (c) => `https://buttondown.com/api/emails/embed-subscribe/${c.username}`,
    emailField: 'email',
    hidden: (c) => (c.tag ? { embed: '1', tag: c.tag } : { embed: '1' }),
    responds: 'redirect',
  },
  custom: {
    label: 'Other provider (plain HTML form)',
    short: 'Custom',
    fields: [
      { key: 'action', label: 'Form action URL', pattern: /^https:\/\/\S+$/, placeholder: 'https://…', help: 'The "action" URL from your provider\'s HTML embed code. Must start with https://.' },
      { key: 'emailField', label: 'Email field name', pattern: /^[\w[\]-]{1,64}$/, placeholder: 'email', help: 'The "name" of the email input in the embed code, e.g. EMAIL for Mailchimp.' },
      { key: 'providerName', label: 'Provider name (shown in privacy policy)', pattern: /^.{1,60}$/, placeholder: 'Mailchimp' },
      { key: 'privacyUrl', label: 'Provider privacy policy URL', pattern: /^https:\/\/\S+$/, placeholder: 'https://…', optional: true },
    ],
    action: (c) => safeUrl(c.action, { allowMailto: false, allowRelative: false }),
    emailField: 'email',
    hidden: () => ({}),
    responds: 'navigate',
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS);

/** Resolve the newsletter settings into everything the form needs. `ready` is false until required fields are valid. */
export function resolveProvider(newsletter) {
  const id = PROVIDERS[newsletter?.provider] ? newsletter.provider : 'none';
  const def = PROVIDERS[id];
  const config = newsletter?.[id] ?? {};
  const missing = def.fields.filter((f) => !f.optional && !f.pattern.test(String(config[f.key] ?? '')));
  const invalid = def.fields.filter((f) => f.optional && config[f.key] && !f.pattern.test(String(config[f.key])));
  const ready = id !== 'none' && missing.length === 0 && invalid.length === 0;
  if (!ready) return { id, ready: false, label: def.label, missing: [...missing, ...invalid].map((f) => f.label) };

  const action = def.action(config);
  let origin = '';
  try {
    origin = new URL(action).origin;
  } catch {
    return { id, ready: false, label: def.label, missing: ['Form action URL'] };
  }
  return {
    id,
    ready: true,
    label: def.label,
    name: id === 'custom' ? config.providerName : def.short,
    site: id === 'custom' ? '' : def.site,
    privacyUrl: id === 'custom' ? safeUrl(config.privacyUrl, { allowMailto: false, allowRelative: false }) : def.privacyUrl,
    region: def.region ?? '',
    action,
    origin,
    emailField: id === 'custom' ? config.emailField : def.emailField,
    hidden: def.hidden(config),
    responds: def.responds,
  };
}
