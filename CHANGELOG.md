# Changelog

Notable changes to Brandywine. The project follows
[Semantic Versioning](https://semver.org/) from 1.0; until then minor
releases may include breaking changes, listed under **Changed**.

## Unreleased

### Added

- Plugins: compiled plugins in the installation's `plugins/` folder, and
  runtime plugins uploaded as a zip in Admin → Plugins that work without a
  rebuild (blocks with generated editors, admin pages, API routes, event
  handlers, key-value storage)
- Events for content changes and outgoing webhooks signed with HMAC-SHA256
  (Admin → Settings → Webhooks)
- Block, admin-module and worker-queue registries: a new block, section or
  queue is a new folder or entry
- Brand fonts for manual headings and body text
- Card image independent of the page hero
- Subpages shown before or after the page content, with chapter numbers in
  reading order
- Manual typography presets and landing-page layouts
- Documentation: architecture, extension guides, contributing guide, security
  policy, code of conduct; CI for types, lint, tests and build

### Changed

- One shade scale for brand colours everywhere; the brand colour itself is
  step 500. Exported colour tokens no longer have a 50 step and other steps
  change value
- Icons use Material Symbols weight 400
- All interface copy, including sign-in and password-reset e-mails, comes
  from the translation catalogue

### Removed

- The unused legacy `manual_sections` table and `section_type` enum
  (migration 0031)
- The NOTICE requirement to display "Powered by Brandywine", which the
  Apache License 2.0 does not allow to add; the in-app attribution link
  stays an option in Admin → Brand

### Fixed

- The page editor's "View" link opened a missing page
- Colours of different palettes appeared in a different order on each load
- Image fields could show a "broken image" placeholder left over from another
  block
- Development servers leaked database connections on hot reload
- The worker's path guard used a different default upload folder than the
  rest of the worker
