# Brandywine — designový kodex

Závazná pravidla pro admin i veřejný manuál. Každé pravidlo je formulované
tak, aby šlo ověřit — ručně nebo auditem (`app/scripts/design-audit.mjs`).
Když je potřeba pravidlo porušit, porušení se zdůvodní v komentáři u kódu.

## Charakter

Brandywine je rám pro cizí značku. Úspěch se měří tím, jak dobře vynikne
prezentovaná značka — ne platforma.

1. **Tisk, ne aplikace.** Obsah leží na papíře. Strukturu nese typografie,
   mřížka a vlasové linky, ne krabice, stíny a barevné plochy.
2. **Jeden signál na jeden význam.** Každá informace je vyjádřena právě
   jednou: buď ikonou, nebo textem; buď linkou, nebo mezerou; buď barvou,
   nebo popiskem. Nikdy dvakrát.
3. **Vzdálenost je význam.** Co k sobě patří, je blíž; co ne, je dál. Mezera
   se nevybírá od oka, ale podle vztahu mezi prvky (viz Rytmus).
4. **Barva patří značce.** Plochy jsou neutrální. Barva značky je akcent jen
   pro akci, aktivní stav, fokus a data. Barvy stavů jsou signál, ne výplň.
5. **Klid je funkce.** Nic se nehýbe, nebliká ani nevystupuje bez důvodu.
   Pohyb jen potvrzuje akci uživatele.

Zdroje: Gestalt princip blízkosti; spacing systémy Atlassian a damato.design
(„near / away“, hustota klesá se zanořením); Butterick, *Practical Typography*;
Nielsen, *10 Usability Heuristics*; WCAG 2.2 AA; online brand booky
B&O, IBM, Dropbox, DevRev, Firefox (Frontify, 2026).

## Rytmus a mezery

Mezery tvoří pět vztahových úrovní. Jiná hodnota mezi prvky obsahu je chyba.

| Úroveň | Vztah | Manuál | Admin |
|---|---|---|---|
| **inline** | ikona ↔ text, hodnota ↔ jednotka | 4–8 px | `--space-1`–`--space-2` |
| **near** | popisek ↔ pole, nadpis ↔ podtitul, položky seznamu | 8–16 px | `--space-2`–`--space-4` |
| **group** | skupiny uvnitř bloku (pole formuláře, sloupce karet) | 20–32 px | `--space-5`–`--space-8` |
| **flow** | blok bez nadpisu navazující na předchozí | `--manual-flow-gap` (28–40 px) | `--space-8` |
| **section** | nová sekce s nadpisem | `--manual-section-gap` (64–104 px) + linka | `--space-12`–`--space-16` |

Pravidla:

- **Poměr úrovní ≥ 1,5×.** Mezera kolem skupiny musí být aspoň 1,5× větší než
  mezera uvnitř ní — jinak se vztah nečte.
- **Linka nahrazuje mezeru, nepřidává se k ní.** Dvě vodorovné linky blíž než
  `near` jsou duplicita (sloučit na jednu).
- **Prázdný kontejner nemá rozměr.** Prvek bez obsahu nesmí držet padding,
  min-height ani rámeček.
- **Mřížka 4 px.** Všechny mezery a rozměry ovládacích prvků jsou násobky 4.
  Výjimka: optické dorovnání pod 4 px (popisek ↔ hodnota, překryv linky
  o −1 px) a mezery v jednotkách `em`, které sledují velikost písma.

## Typografie

- **Text:** 16 px (`--text-lg`), řádkování 1,55–1,75, délka řádku max. 72 znaků
  (`max-width: 72ch`), minimum 45 znaků na desktopu.
- **Stupnice:** jen hodnoty `--text-*`. Sousední úrovně nadpisů se liší
  aspoň 1,2×.
- **Řezy:** 400 a 500; 600 jen pro krátké UI popisky v adminu; 300 jen pro
  velká čísla (≥ 36 px).
- **Popisky (labels):** verzálky 11 px (`--manual-label-size`), prostrkání 8 %
  (`--manual-label-tracking`), barva muted. Verzálky nikdy na víc než jeden
  řádek.
- **Čísla v datech** (hodnoty barev, rozměry, tabulky, statistiky):
  `font-variant-numeric: tabular-nums`.
- **Znaky:** české uvozovky „…“, pomlčka –, nezlomitelná mezera mezi číslem
  a jednotkou, × pro rozměry. Žádné ASCII šipky `->`.
- Tučné písmo jen pro zvýraznění v textu, nikdy spolu s kurzívou.

## Barva

- Plochy: `--manual-paper` / `--color-bg`, `--manual-stage` (jen pod
  materiálem značky: obrázky, loga, vzorky, specimeny).
- **Akcent značky** (`--manual-brand`, `--color-accent`): primární akce,
  aktivní stav, fokus, datová linka. Nikdy výplň plochy ani barva textu nadpisu.
- **Stavy** (info, úspěch, varování, chyba): jen 1px linka, ikona nebo popisek.
  Nikdy podbarvená plocha.
- **Barevně se značí jen porušení** (zákaz, špatný příklad, neprošlý kontrast).
  Správný stav je inkoust.

## Tvar a hloubka

- **Jedno zaoblení:** `--manual-radius` (nastavitelné v adminu) / `--radius`.
  Žádné pilulky (`--radius-full` jen pro kruhové prvky: avatar, tečka).
- **Linky 1 px.** Silnější linka jen jako `--manual-border-strong` pod hlavičkou
  tabulky nebo nad citací.
- **Hloubka:** stín jen u plovoucích vrstev (menu, dialog, tooltip, toast).
  Rámeček + pozadí + stín na jednom prvku je vždy chyba.

## Komponenty — jedna na potřebu

| Potřeba | Jediné řešení |
|---|---|
| přepínání pohledů | podtržené textové záložky |
| primární akce | plné tlačítko v inkoustu (admin: akcent značky) |
| sekundární akce | tlačítko s vlasovou linkou |
| seznam položek, souborů, odkazů | řádky oddělené linkami |
| upozornění | 1px linka vlevo v barvě stavu + ikona |
| ukázka materiálu značky | stage (`--manual-stage`) se zaoblením |
| specifikace (rozměry, parametry) | popisek nad hodnotou, v řádku, nad linkou |
| data v řádcích | tabulka bez rámečku, silnější linka pod hlavičkou |

## Ikony

- Sada: **Google Material Symbols, Outlined, váha 400** (ladí s řezem textu 500), výhradně přes
  `$lib/icons` (mapování v `app/scripts/icon-map.json`).
- Velikosti 16 / 20 / 24 px. Ikona v textu = velikost písma × 1,15.
- Ikona doprovází text jen tehdy, když přidává význam (typ souboru, směr,
  stav). Nikdy ikona + stejná informace textem (šipka + „→“).
- Ikona bez textu musí mít `aria-label` nebo `title`.

## Přístupnost (WCAG 2.2 AA)

- Kontrast textu ≥ 4,5 : 1 (velký text ≥ 3 : 1), prvky UI a ikony ≥ 3 : 1.
- Cíl kliknutí ≥ 24 × 24 px.
- Viditelný fokus (2px outline v akcentu), nikdy zakrytý lepkavou lištou.
- Stav nesmí být sdělen jen barvou — vždy i ikonou nebo slovem.

## Pohyb

- Trvání 120 / 180 / 280 ms (`--dur-*`), křivka `--ease`.
- Hover mění barvu nebo linku, ne polohu (žádné „vyskočení“ karet).
- Žádná nekonečná animace (pulzy, blikání).

## Audit

Kodex se ověřuje měřením vykreslených stránek, ne čtením kódu:

- **Veřejný manuál:** `node scripts/design-audit/run.mjs http://localhost:5173 design-audit.md`
  (v `app/`; projde všechny stránky ve světlém a tmavém režimu a na šířce
  1440 a 390 px a zapíše seskupené nálezy).
- **Admin** vyžaduje přihlášení: obsah `scripts/design-audit/core.js` se spustí
  v konzoli přihlášeného prohlížeče (vrací `{ findings }` pro aktuální stránku).
- **Mezery mimo mřížku** srovná `python3 scripts/design-audit/snap-spacing.py <soubory>`
  (zaokrouhlí gap/margin/padding na násobky 4 px; clamp/calc/var nechá být).

Pravidla auditu: `gap-off-grid`, `double-rule`, `empty-box`, `triple-chrome`,
`contrast`, `target-size`, `measure`, `leading`, `duplicate-signal`,
`typography`, `pill`, `type-off-scale`, `heading-order`, `unnamed-control`.
Materiál značky (inline styly bloků, specimeny, náhledy) je z UI pravidel vyjmut.
