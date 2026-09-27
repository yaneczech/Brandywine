# Zadání: Open Source Brand Platform

## Orientace

Jedna self-hosted aplikace pokrývající dvě vzájemně propojené oblasti:

1. **Brand manuál** — prezentace vizuální identity (vzor: visualbook.pro)
2. **Asset management** — správa a distribuce brandových souborů (inspirace: brandcloud.pro, Brandfolder)

Komerční vzor (Visualbook) stojí na Kirby CMS (flat-file, bez databáze). My chceme plnohodnotnější open source řešení s Docker deploymentem, webovým adminem a rozšířenými funkcemi.

---

## Deployment & provoz

- **Docker Compose** — `docker-compose up`, hotovo
- **Webový admin bez CLI** — veškerá správa přes prohlížeč po nasazení
- **Single-brand** — jedna instance = jeden brand (žádný multi-tenant v MVP)
- Cílový hosting: VPS s Docker podporou (Hetzner, DigitalOcean), bez závislosti na CLI přístupu
- Flat-file nebo lehká DB (SQLite) — bez nutnosti spravovat PostgreSQL pro základní provoz
- **Licence: AGPL v3**
- **Multilang od začátku** — architektura i18n od prvního dne (viz sekce Lokalizace)

---

## Modul 1: Brand Manuál

Prezentační vrstva — hezky vypadající, rychlá, přístupná přes odkaz.

### Přístup
| Typ | Popis |
|---|---|
| Veřejný | Kdokoli s URL |
| Heslo | Jeden sdílený přístupový kód |
| Email whitelist | Přístup jen pro konkrétní adresy |
| Token link | Časově omezený odkaz (pro sdílení s externími partnery) |

### Sekce manuálu (modulární, admin zapíná co potřebuje)

#### Loga
- Náhled všech variant (barevná / mono / inverzní / na tmavém pozadí / na světlém pozadí)
- Ke každé variantě: stažení v různých formátech (viz sekce Export níže)
- Pravidla použití — zakázané úpravy, ochranná zóna, minimální velikost
- Tmavý/světlý preview pozadí přímo v prohlížeči

#### Barvy
- Primární, sekundární, doplňkové palety
- Zobrazení hodnot: **HEX, RGB, CMYK, HSL, LAB/L\*a\*b\*, NCS**
- Pojmenování barev (brand název + systémový název)
- Kopírování hodnoty jedním klikem (HEX, RGB CSS, CMYK…)
- Mapování na **Pantone** (PMS číslo + vizuální vzorek)
- Mapování na **RAL** (RAL číslo + vizuální vzorek)
- Export barevné palety (viz sekce Export níže)
- Přístup ke knihovnám RAL Classic / RAL Design a Pantone (viz Knihovny barev)

#### Typografie
- Použitá písma — název, foundry, licence
- Ukázky řezů (Regular, Medium, Bold, Italic…) s živým textem
- Přednastavené textové styly (H1–H6, Body, Caption…) s hodnotami (velikost, řádkování, tracking)
- Způsob instalace / získání (odkaz na Google Fonts, Adobe Fonts, stažení souboru)
- Ukázky v kontextu (heading + body kombinace)

#### Ikony
- Galerie ikon s možností stažení (SVG, PNG)
- Hromadné stažení jako ZIP
- Kategorizace (UI ikony, piktogramy, ilustrace…)

#### Fotostyl / Imagery
- Vizuální styl fotek (moodboard, do / don't příklady)
- Filtry, tóny, kompoziční pravidla
- Ukázkové fotografie ke stažení (pokud jsou veřejné)

#### Ilustrace & grafické prvky
- Textury, patterny, grafické elementy
- Stažení jednotlivě nebo jako balíček

#### Šablony
- Odkaz nebo náhled šablon (PowerPoint, Keynote, Google Slides, Word, Canva)
- Možnost přímého stažení

#### Strategie značky (volitelné)
- Mise a vize
- Hodnoty
- Cílová skupina / persony
- Tone of voice
- Messaging framework

#### Vlastní sekce
- Admin může přidat libovolnou sekci s vlastním názvem, popisem a médii

---

## Modul 2: Asset Management

Úložiště souborů s řízeným přístupem.

### Organizace médií
- **Složky a podsložky** — libovolná hloubka hierarchie
- **Tagy** — volné + předdefinované (admin definuje taxonomii)
- **Kolekce** — kurátorský výběr napříč složkami (např. "Pro tisk", "Pro web", "Sociální sítě")
- **Media typy jako první třída** — sekce Logo / Barvy / Typografie / Fotografie / Videa / Dokumenty jsou oddělené pohledy, ne jen složky
- **Automatická kategorizace** — při uploadu se detekuje typ (SVG → vektor, PDF → dokument, MP4 → video) a přiřadí výchozí kategorie
- **Smart filtry** — kombinované filtrování: typ + tag + složka + datum + rozměry + velikost
- **Pohled mřížka / seznam / masonry** — přepínatelné zobrazení
- **Hromadné operace** — výběr více souborů → přesun / tagování / stažení jako ZIP / smazání
- **Duplicate detection** — upozornění při uploadu souboru se stejným hashem
- **Metadata** — název, popis, autor, copyright, datum, verze, licence, expirace, rozměry (px/mm/cm), DPI, barevný profil (RGB/CMYK)
- **IPTC/XMP metadata** — čtení z existujících souborů při uploadu (fotografie)
- **Vztahy mezi soubory** — "toto SVG je zdrojem těchto PNG exportů", verzová historie

### Upload & formáty
- Drag & drop, hromadný upload
- Podporované formáty: JPEG, PNG, GIF, WebP, AVIF, SVG, PDF, AI, EPS, PSD, TIFF, HEIC, MP4, MOV, WebM, MP3, WAV, OTF, TTF, WOFF, WOFF2, ZIP
- Automatické thumbnaily a náhledy
- **PDF preview** — stránkování přímo v prohlížeči (PDF.js)
- **SVG preview** — inline rendering
- Video preview — přehrávač přímo v prohlížeči
- Detekce MIME typu (bez spoléhání na příponu)

### Vyhledávání & filtrování
- Fulltextové vyhledávání (název, popis, tagy)
- Filtrování: typ souboru / složka / tag / datum / verze
- Řazení: název / datum / velikost / typ

### Verzování
- Nahrání nové verze souboru (zachovává historii)
- Přepnutí na předchozí verzi
- Zobrazení changeloga verze (volitelná poznámka)

### Sdílení
- Veřejný odkaz (s/bez hesla)
- Časově omezený odkaz
- Embed kód (iframe pro weby)
- Hromadné stažení jako ZIP

### Oprávnění
| Role | Co může |
|---|---|
| Admin | Vše — správa, upload, mazání, nastavení |
| Editor | Upload, editace metadat, organizace |
| Viewer | Prohlížení a stažení povolených souborů |
| Guest | Přístup přes sdílený link (bez účtu) |

---

## Export a integrace barev

Toto je jedna z klíčových oblastí. Brand barvy by mělo jít exportovat do všech relevantních nástrojů jedním klikem.

### Export formáty barev

| Formát | Použití | Popis |
|---|---|---|
| **ASE** | Adobe (PS, AI, InDesign) | Adobe Swatch Exchange — standardní formát Adobe aplikací |
| **ACO** | Adobe Photoshop | Starší formát swatchů PS |
| **ACB** | Adobe Color Book | Pro Pantone/RAL knihovny v Adobe |
| **GPL** | GIMP, Inkscape | GIMP Palette — open source nástroje |
| **CLR** | macOS | macOS Color Palette (Color Picker) |
| **SKP / SKETCHPALETTE** | Sketch | Sketch paleta |
| **CSS Variables** | Web | `--color-primary: #FF0000;` |
| **SCSS Variables** | Web | `$color-primary: #FF0000;` |
| **JSON (Design Tokens)** | Figma Tokens, Style Dictionary | W3C Design Tokens formát |
| **Tailwind config** | Tailwind CSS | `colors: { primary: '#FF0000' }` |
| **Android XML** | Android | `<color name="primary">#FF0000</color>` |
| **iOS / Swift** | iOS | `UIColor` nebo `Color` extension |
| **Procreate .swatches** | iPad / Procreate | JSON-based formát |

### Integrace s designovými nástroji

#### Figma
- Export barev jako **Design Tokens JSON** (kompatibilní s Figma Tokens / Token Studio pluginem)
- Export typografie jako Design Tokens
- Veřejné API endpointy — Figma plugin může tahat barvy/fonty přímo z naší instance
- Možný read-only REST endpoint: `GET /api/brand/tokens.json`

#### Canva
- Canva Brand Kit API umožňuje napojení přes OAuth — **import barev a fontů přímo do Canva Brand Kitu**
- Alternativně: ruční export hodnot + návod jak importovat
- Canva nemá veřejné API pro přímý push barev (zatím), ale lze připravit formát kompatibilní s jejich importem

#### Adobe Creative Cloud
- Export jako **ASE** (Adobe Swatch Exchange) — funguje v PS, AI, InDesign, XD
- Swatch knihovny dostupné přes Adobe CC Libraries API (pokud user propojí CC účet)
- Export fontů s instrukcemi pro Adobe Fonts

#### Sketch
- Export barev jako `.sketchpalette`
- Export Design Tokens kompatibilních se Sketch

#### Procreate
- Export `.swatches` souboru pro iPad umělce

---

## Knihovny barev

### RAL
- **RAL Classic** — 213 barev (RAL 1000–RAL 9023), standard pro průmysl a architekturu
- **RAL Design System+** — 1825 barev v systematické mřížce
- Každá RAL barva: číslo, název CZ/EN/DE, HEX approximace, RGB, CMYK
- Poznámka: přesné HEX hodnoty RAL nejsou standardizované (RAL barvy jsou definovány fyzicky) — zobrazujeme nejlepší digitální aproximaci s upozorněním

### Pantone
- **Pantone Matching System (PMS)** — 1867+ barev pro tisk
- **Pantone Fashion, Home + Interiors (FHI)** — textil a interiér
- **Pantone Color of the Year** — aktuální a historické
- Každá Pantone barva: PMS číslo, název, HEX aproximace, RGB, CMYK
- Poznámka: Pantone hodnoty jsou IP chráněné — použijeme volně dostupná data nebo open source alternativy (pantone-colors npm package, ~2100 barev s HEX hodnotami)
- Právní situace: zobrazení Pantone hodnot pro referenci je standardní praxe, ne distribuce proprietárního softwaru

### Další knihovny (volitelné / future)
- **NCS (Natural Color System)** — skandinávský standard (6 primárních, 1950 barev)
- **HKS** — německý tiskový standard (HKS K pro hlubotisk, HKS N pro ofset, HKS E pro etikety, HKS Z pro novinový tisk)
- **Federal Standard 595** — US vládní/vojenský standard
- **Dulux / Benjamin Moore** — inspirace pro interiérový design (licence nutná)
- **CSS Named Colors** — 148 standardních CSS barev
- **Material Design Colors** — Google Material paleta
- **Tailwind Colors** — Tailwind CSS výchozí paleta

---

## Export log

### Logo export formáty
| Formát | Použití |
|---|---|
| **SVG** | Web, skalovatelný vektor |
| **PNG** (transparent) | Digitální média, prezentace |
| **PNG** (na bílém/tmavém pozadí) | Kde není podpora průhlednosti |
| **PDF** | Tisk, předtisková příprava |
| **EPS** | Starší tiskové workflow |
| **WebP** | Moderní web |
| **ICO** | Favicon |
| **ZIP (vše)** | Balíček všech variant |

Automatická konverze: admin nahraje SVG, systém vygeneruje ostatní formáty automaticky (Sharp + Inkscape/librsvg).

### Font export
- OTF / TTF / WOFF / WOFF2 soubory ke stažení (pokud licence dovoluje)
- CSS `@font-face` snippet připravený ke kopírování
- Google Fonts embed kód

---

## Média a zpracování souborů

### PDF
- Inline preview (PDF.js) — stránkování v prohlížeči bez stažení
- Generování náhledového obrázku (1. strana jako thumbnail)
- Fullscreen mód
- Stažení originálu

### Obrázky
- Automatické thumbnaily (Sharp): 200px, 400px, 800px verze
- Lazy loading
- EXIF stripping při uploadu (bezpečnost + soukromí)
- WebP konverze pro web preview

### Video
- HTML5 přehrávač
- Automatický thumbnail z 1. vteřiny (FFmpeg)
- Podporované formáty: MP4 (H.264), WebM

### Vektory (SVG, AI, EPS)
- **SVG inline preview** — renderování přímo v prohlížeči, ne jako obrázek
- **SVG editor / inspektor** — zobrazení viewBox, rozměrů, použitých barev, fontů
- **SVG optimalizace** — automatický průchod přes SVGO při uploadu (redukce velikosti)
- **Sanitizace SVG** — odstranění `<script>`, `<foreignObject>`, on* atributů (XSS ochrana)
- **Extrakce barev ze SVG** — automatická detekce použitých fill/stroke barev, možnost namapovat na brand paletu
- **Konverze SVG → PNG/PDF/WebP** — přes librsvg nebo Inkscape (headless)
- AI/EPS: thumbnail přes Ghostscript nebo Inkscape (headless)

---

## Technické požadavky

### Stack (doporučení)
Na základě priorit (Docker, webový admin, média, bezpečnost, rychlost):

| Vrstva | Doporučení | Důvod |
|---|---|---|
| **Frontend** | **SvelteKit** | SSR, rychlost, Paraglide.js pro i18n |
| **Ikony** | **Phosphor Icons** (`phosphor-svelte`) | MIT, 9000+ ikon, 6 váh, tree-shakeable |
| **Backend/API** | Node.js (SvelteKit server routes) | Jeden stack, žádný separátní backend |
| **Databáze** | **PostgreSQL** | Robustní, souběžné uploady, Docker Compose |
| **ORM** | Drizzle ORM | Type-safe, lehký, výborná Postgres podpora |
| **Barvy** | `pantone-colors` npm (MIT) + vlastní RAL dataset | Pantone ~2100 barev, RAL Classic + Design |
| **Soubory** | Lokální disk (default) + S3/R2/MinIO (volitelně) | Nejjednodušší deployment |
| **Media processing** | Sharp (Node), FFmpeg, librsvg/Inkscape | Ověřené open source nástroje |
| **PDF** | PDF.js (frontend preview), Ghostscript (thumbnaily) | Standard |
| **Auth** | Vlastní (email + heslo) + magic link | Bez závislosti na OAuth poskytovateli |

### Docker Compose struktura
```
services:
  app:        # SvelteKit/Next.js app
  worker:     # Background job worker (média processing)
  redis:      # Queue pro background jobs (volitelně BullMQ)
  db:         # SQLite volume nebo PostgreSQL
volumes:
  uploads:    # Nahrané soubory
  db:         # Databáze
```

### Bezpečnost
- CSRF ochrana
- Sanitizace SVG souborů (XSS vektor)
- Bezpečné nahrávání: MIME detection, size limits, quarantine před zpracováním
- Rate limiting na upload a auth endpoints
- Žádné secrets v env variables viditelných ve frontendu
- HTTPS-only (Traefik nebo Caddy jako reverse proxy v Docker Compose)

---

## Lokalizace (i18n)

Multilang podpora od prvního dne — ne jako add-on.

### Principy
- Všechny texty v UI jsou externalizované — žádné hardcoded stringy v kódu
- Překladové soubory ve formátu **JSON** (standard, tooling všude)
- Výchozí jazyky: **CS + EN** (lze přidat libovolný další)
- Jazyk se detekuje z: 1) URL prefixu (`/en/`, `/cs/`), 2) prohlížeče, 3) manuálního přepínače

### Co je přeložitelné
| Oblast | Popis |
|---|---|
| UI aplikace | Všechny labely, tlačítka, chybové hlášky, navigace |
| Obsah brand manuálu | Admin může zadat texty sekcí v každém aktivním jazyce zvlášť |
| Názvy sekcí | Každá sekce má přeložitelný název i popis |
| Metadata assetů | Název, popis — volitelně vícejazyčně |
| Emailové notifikace | Šablony emailů podle jazyka příjemce |

### Správa překladů
- Překladové JSON soubory v repozitáři — community contributions přes PR
- Admin UI pro správu aktivních jazyků (zapnout/vypnout)
- Fallback: pokud překlad chybí → zobrazí se výchozí jazyk (EN)
- Přepínač jazyka ve veřejném i admin rozhraní

### Technické řešení
- SvelteKit: **svelte-i18n** nebo **paraglide-js** (type-safe, zero-runtime overhead)
- URL struktura: `/{lang}/sekce` (SEO-friendly, každý jazyk má vlastní URL)
- `hreflang` meta tagy pro vyhledávače

---

## Analytics (vestavěné)
- Počty zobrazení stránek manuálu
- Počty stažení (které soubory, jak často)
- Zdroje návštěvnosti
- Zařízení (desktop/mobile)
- Bez závislosti na externích analytických nástrojích (GDPR friendly)

---

## Admin rozhraní

### Brand manuál admin
- Správa sekcí (zapnout/vypnout, přeřadit pořadí)
- Upload logotypů s definicí variant
- Správa barevné palety (přidat/editovat/smazat, mapování na Pantone/RAL)
- Správa typografie
- Textový editor pro popis sekcí (Markdown nebo WYSIWYG)
- Nastavení přístupu (veřejný / heslo / whitelist)
- Nastavení vzhledu (brand barva adminu, logo, název)
- Analytics dashboard

### Asset management admin
- File manager (složky, upload, přesun, smazání)
- Editace metadat
- Správa uživatelů a rolí
- Audit log
- Nastavení sdílení

---

## Co zatím odkládáme (post-MVP)

- Canva přímá API integrace (čeká na Canva API dostupnost)
- Adobe CC Libraries sync (vyžaduje Adobe OAuth)
- AI auto-tagging assetů
- Workflow schvalování (review → approve → publish)
- Komentáře a anotace na assetech
- Multi-brand (více brandů v jedné instanci)
- White-label (vlastní doména pro každý brand)
- Audit log export (CSV)
- Webhooks pro notifikace

---

## Otevřené otázky k rozhodnutí

1. ~~**Frontend framework**~~ — **SvelteKit** ✓
2. ~~**SQLite vs. PostgreSQL**~~ — **PostgreSQL** ✓
3. **Media worker** — v rámci hlavní app, nebo samostatný container?
4. ~~**Pantone/RAL data**~~ — **`pantone-colors` npm (MIT)** ✓
5. ~~**Licence projektu**~~ — **AGPL v3** ✓

---

## Inspirace a reference

- [demo.visualbook.pro](https://demo.visualbook.pro/) — živé demo, hlavní vzor
- [visualbook.pro](https://visualbook.pro/) — komerční produkt (Kirby CMS, flat-file, CZ/EN)
- [brandcloud.pro](https://brandcloud.pro/) — DAM, inspirace pro asset management
- [Frontify](https://frontify.com) — enterprise brand platform (příliš komplexní, ale dobrá inspirace)
- [Brandfolder](https://brandfolder.com) — DAM s AI taggingem
- Design Tokens: [W3C Community Group](https://www.w3.org/community/design-tokens/), [Style Dictionary](https://amzn.github.io/style-dictionary/)
- RAL barvy: `meodai/color-names`, `ral-colour` npm package
- Pantone barvy: `pantone-colors` npm package (MIT licence)

---

*Draft v0.3 — 2026-06-06 — hloubková analýza*
