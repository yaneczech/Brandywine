# Roadmap

Brandywine stays a full server application: large uploads, FFmpeg,
Ghostscript, custom fonts, PDFs and ZIP exports need long-running processes,
local working space and predictable performance. One production Docker stack
serves both self-hosted installs and any future managed hosting.

This roadmap lists what is planned, roughly in order. It changes as we learn —
open an issue to discuss an item or propose a new one.

## Already in place

- Public brand manual with a page tree, 35 content block types, chapter
  numbering, light/dark/toggle themes, brand fonts and card covers
- Manual audit (empty blocks, missing alt text, broken files, contrast,
  duplicate anchors) and a Markdown / `llms.txt` / MCP export for AI tools
- Colours, palettes, gradients, shades, contrast checks, token and format
  exports; typography with font files and text styles
- Asset library with folders, tags, previews and background conversions
- Roles (admin, editor, member), password and e-mail-allowlist manual access,
  magic links
- Extension points: block and module registries, compiled plugins, runtime
  plugins installed from a zip, events and signed webhooks
- Self-hosting CLI: install, doctor, backup, restore, update

## Milestone A — Release foundation

- Finish every manual access mode end to end, including token share links
- Rate limiting for sign-in, password reset, magic links and share links
- Upload pipeline states (`processing / ready / failed`), retries and visible
  errors instead of silent queue failures
- Safer handling of SVG and PDF uploads, upload limits, optional virus scan
- Integration tests for roles, protected manuals, upload → preview → download
  and upgrades from older versions
- Signed, versioned container images instead of building on the server;
  pre-migration backups, release notes and rollback

## Milestone B — A manual you can publish

- Draft and published versions, scheduled publishing, preview links, change
  comparison and history
- Per-language content for pages and blocks with fallbacks and a view of
  untranslated content
- Curation for gallery, carousel, icon, asset-gallery and download blocks
  (manual order, limits, renditions)
- Full-text search across pages, blocks and asset metadata
- Reusable blocks and section templates
- SEO: canonical URLs, sitemap, Open Graph per page
- PDF and offline export of the whole manual
- Device preview (desktop, tablet, phone) in the editor

## Milestone C — Asset management workflows

- Collections across folders and public collection pages
- Bulk operations (tag, move, status, ZIP, delete) with an error summary
- Asset versions with changelog, comparison and rollback
- Share links for assets, collections and folders with expiry, password and
  download limits
- Rich metadata (author, copyright, licence, expiry, dimensions, colour
  profile, IPTC/XMP/EXIF) and a lifecycle `draft / approved / deprecated`
- Duplicate review, saved filters, list/grid/masonry views, paging
- Background ZIP export with progress; rendition presets for web, social,
  print and Office
- S3-compatible storage

## Milestone D — Brand operations

- Team and resource permissions in the admin (the data model exists)
- Comments and mentions on pages, blocks and assets; approval workflow
- Notifications in the app and by e-mail; "what changed since your last visit"
- Content ownership, review reminders and a brand-system completeness score
- Versioned REST API with scoped tokens; webhook retries and delivery log
- W3C Design Tokens export and a Figma / Tokens Studio sync
- SSO (OIDC, SAML) and SCIM for larger organisations

## Definition of done

A feature is done when it has permissions, validation, error states, tests,
a migration where needed, a mobile layout and translations — not when a table
or a control exists.
