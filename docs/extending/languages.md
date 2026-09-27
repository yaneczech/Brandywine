# Languages

Brandywine has two independent languages:

- **Admin language** — each user picks it; all admin copy comes from
  `app/src/messages/<lang>.json` through [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
  (`m.key()`).
- **Manual language** — one per brand (Admin → Brand → default language). The
  public manual and its emails follow it. Visitor-facing manual copy lives in
  `app/src/lib/manual/ui-strings.ts`.

## Add or fix a translation

Edit `app/src/messages/en.json` and `cs.json`. Keys are grouped by prefix
(`admin_`, `brand_`, `editor_`, `be_` = block editors, `block_type_`,
`audit_`, `email_`…). Messages can take parameters: `"be_palette_unavailable":
"Unavailable palette ({name})"` → `m.be_palette_unavailable({ name })`.

Never hard-code user-facing text in components, and never branch on the
language (`locale === 'cs' ? … : …`) — add a message instead.

## Add a language

1. Add the language tag to `languageTags` in `app/project.inlang/settings.json`.
2. Copy `app/src/messages/en.json` to `app/src/messages/<lang>.json` and
   translate it.
3. To offer it as a manual language, add a dictionary to `STRINGS` in
   `app/src/lib/manual/ui-strings.ts` — TypeScript reports every missing key.
4. Add the option to the language selects in Admin → Brand and Admin →
   Settings, and typography rules (quotes, separators) for it in
   `app/src/routes/admin/settings/+page.svelte`.
5. `npm run check`, then switch the admin and the manual to the new language
   and look through every screen.
