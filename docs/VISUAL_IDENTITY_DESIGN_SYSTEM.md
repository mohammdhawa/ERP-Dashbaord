# Al-Raqi ERP — Visual Identity Guide & Design System

**Implementation audit · 22 October 2026 · branch `phase_1` · commit `128e620`**

This standalone guide documents the existing React dashboard. The supplied visual reference informed the presentation of the original audit; its palette, Cairo font, mobile action heights and business rules are not treated as existing website standards. All essential findings, design values and recommendations are included below.

## How to read this guide

- **Existing / measured:** a value confirmed in isolated browser specimens using the actual Vite transformation of `src/index.scss`.
- **Existing / source:** a rule or component usage found in the current repository, without authenticated-screen runtime verification.
- **Conflict:** two definitions or patterns disagree. Neither is silently presented as the approved standard.
- **Recommendation:** proposed future guidance; not implemented or approved as a brand standard.

The application source and styles were not modified during the audit. This Markdown file is the repository documentation deliverable. Local application navigation was blocked by network access/timeouts, including after an escalated retry. Consequently, this is a source audit plus isolated CSS/asset verification, not production or authenticated-flow certification. The font specimens use downloaded Rubik weights from the same Google Fonts family; Chrome confirmed that Rubik rendered both Arabic and Latin glyphs. Pixel conversions assume a 16px browser root.

## 1. Implementation and cascade: the critical finding

The application imports `src/index.scss` from `src/main.jsx`. The entry stylesheet `@use`s `_variables.scss` and five custom partials, and imports precompiled `bootstrap.css`, SimpleBar, `styles.css` and `icons.css`. Vite's transformed output places the precompiled CSS **before** the emitted SCSS `:root` declarations. Equal-specificity variables from SCSS therefore win. [S1–S3]

| Token | Precompiled `styles.css` | Later `_variables.scss` | Effective measured value |
|---|---|---|---|
| `--primary-rgb` | `255,190,0` / `#FFBE00` | `160,132,249` | **`#A084F9`** |
| `--secondary-rgb` | `163,72,224` / `#A348E0` | `180,90,237` | **`#B45AED`** |
| `--dark-rgb` | `44,62,80` / `#2C3E50` | `51,51,51` | **`#333333`** in light mode |
| `--primary-ink` | `#8A6200` | No override | **`#8A6200`** in light mode |
| `--on-primary` | `#2A2000` | No override | **`#2A2000`** |

**Implication:** the current UI combines lavender surfaces with gold-brown primary text, while the image assets use navy and gold. The compiled file's contrast comments describe yellow and darkened purple; those comments are not evidence of the final palette. Regenerating CSS with `npm run sass` could also overwrite handwritten fixes in the compiled stylesheet. Do not run it as a design-cleanup step without reconciling the sources first.

**Recommendation:** agree on the intended palette, establish one authoritative token source, port the compiled-only accessibility fixes into it, and then verify the emitted CSS. Do not simply copy the reference image's colors into this application.

## 2. Color palette

### Effective light theme

| Role | Existing token | Value | Existing use |
|---|---|---|---|
| Primary fill | `--primary-rgb`, `--primary-color` | `#A084F9` | Primary buttons, selected elements, primary tints |
| On primary | `--on-primary` | `#2A2000` | Text/icons on primary buttons |
| Primary text | `--primary-ink` | `#8A6200` | `.text-primary`, primary light/transparent buttons, active sidebar text |
| Secondary fill | `--secondary-rgb` | `#B45AED` | Secondary buttons, secondary accents |
| On secondary | `--on-secondary` | `#FFFFFF` | Secondary button text |
| Secondary text | `--secondary-ink` | `#B45AED` | Secondary foreground/transparent variants |
| Page canvas | `--default-body-bg-color`, `--default-background` | `#F7F8F9` | Body and neutral section backgrounds |
| Surface | `--custom-white`, `--form-control-bg` | `#FFFFFF` | Cards, inputs, menus, header |
| Main text | `--default-text-color` | `#333333` | Body copy, headings, controls |
| Muted text | `--text-muted` | `#6C757E` | Descriptions, metadata |
| Navigation text | `--menu-prime-color`, `--header-prime-color` | `#6F778E` | Sidebar/header foreground |
| Border | `--default-border`, `--input-border` | `#E8E8E8` | Dividers, inputs, section borders |
| Light utility | `--light-rgb` | `#F5F7FA` | Neutral buttons, disabled fields |
| Hover surface | `--list-hover-focus-bg` | `#F5F6F7` | List hover/focus backgrounds |
| Keyboard focus | `--focus-ring-color` | `#0A58CA` | 2px outline, 2px offset |

Sources: effective specimen evidence, `_variables.scss`, `styles.css` root/foreground overrides. [S1–S3, S8]

### Semantic colors and accents

| Role/token suffix | HEX | Current meaning/examples |
|---|---|---|
| `success` | `#2ECC71` | Approved, present, positive state |
| `warning` | `#F39C12` | Pending approval, missing checkout, warning |
| `info` | `#3498DB` | Information, currently checked in, corrected record |
| `danger` | `#E74C3C` | Rejected, absent, destructive action |
| `orange` | `#FF7417` | Available template accent; no canonical business meaning found |
| `pink` | `#FC6C85` | Available template accent |
| `teal` | `#00B1A3` | Available template accent |
| `purple` | `#8F00FF` | Available template accent; distinct from secondary |
| `green` | `#45D65B` | Available template accent; distinct from success |

Primary alpha tokens include `--primary005` at 5%, and `--primary01` through `--primary09` at 10–90%. Secondary has 10% and 20% tokens. Semantic transparent utilities use RGBA, typically 10% for badges. A translucent surface has no single universal HEX: its visible color depends on the surface below. The JSON reference preserves alpha instead of inventing solid values.

Gray tokens `--gray-1` through `--gray-9`: `#F9FAFB`, `#F2F4F5`, `#E6EAEB`, `#DBDFE1`, `#949EB7`, `#7987A1`, `#4D5875`, `#383853`, `#323251`. White/black alpha families run from 10% to 90%. Many extra gradients and accent utilities are template inventory rather than an approved product palette. [S2–S3]

### Dark theme

The app uses `data-theme-mode="dark"`, plus matching header/menu attributes, with the chosen mode stored in local storage. Bootstrap also has a separate `data-bs-theme` namespace in its stylesheet; the app's theme wrapper does not set it. Review Bootstrap-specific validation and component variables rather than assuming all Bootstrap dark tokens activate. [S1, S3, S11]

| Role | Existing dark value |
|---|---|
| Page canvas | `#2B2B30` (`--default-body-bg-color`) |
| Cards, inputs, header, sidebar | `#202025` (`--custom-white`, `--form-control-bg`) |
| Main text | `rgba(255,255,255,0.8)` |
| Muted text | `rgba(255,255,255,0.5)` |
| Navigation text | `rgba(255,255,255,0.6)` |
| Borders | `rgba(255,255,255,0.1)` |
| Light utility | `#2B2E31` |
| Dark utility | `#F0F5F8` |
| Primary fill / primary text | `#A084F9` / `#A084F9` |
| Secondary fill / secondary text | `#B45AED` / `#C98BF5` |
| Focus ring | `#8AB4FF` |

The name `--custom-white` means themed surface, not literal white. Reuse the token rather than assuming its name describes a fixed color.

## 3. Typography

### Family and weights

The existing stack is **`"Rubik", serif`**, with body weight **300**, size **0.8725rem / 13.96px**, and line-height **1.5 / 20.94px**. Text aligns to `start`; HTML is Arabic and RTL. The global font import requests Alexandria, Almarai, Readex Pro, Rubik, Tajawal and Zain, but the default stack selects Rubik. Cairo belongs to the supplied image, not this implementation. [S1–S3]

Rubik weights 300, 400, 500, 600 and 700 were loaded and the Arabic/Latin 300-weight specimens were verified via Chrome's platform-font inspection. The fallback remains generic `serif`; rendering when the remote font is unavailable can differ by platform.

| Role | Selector/usage | Size | Weight | Line-height |
|---|---|---|---|---|
| Standard page title | `Pageheader` h1 `.fs-18.fw-medium` | 18px | 500 | 1.2 inherited heading rhythm |
| Dashboard greeting | h1 `.fs-20.fw-medium` | 20px | 500 | 1.2 |
| Sign-in heading | `.h4` | up to 24px | 400 | 1.2 |
| Card heading | `.card-header .card-title` | 15.2px | 500 | Depends on element; div specimen 22.8px |
| Profile section title | `.profile-section__title` | 14px | 600 | Inherits element/context |
| Body | `body` | 13.96px | 300 | 20.94px |
| Supporting text | `.fs-13` | 13px | Inherited | Context-dependent |
| Form label | `.form-label` | 12.8px | 400 | 19.2px in specimen |
| Input | `.form-control` | 14px | 300 | 25.2px / 1.8 |
| Standard button | `.btn` | 13.6px | 300 | 20.4px / 1.5 |
| Small button | `.btn-sm` | 12px | 300 | 18px |
| Badge | `.badge` | 0.75em; 10.47px at body size | 400 | 1 |

Raw Bootstrap h1–h6 sizes at a 1440px viewport are 40, 32, 28, 24, 20 and 16px with weight 400. The larger sizes use Bootstrap responsive formulas below 1200px. These are available defaults, not the hierarchy used by normal dashboard page titles. [S4, S7, S11]

**Naming conflict:** custom `.fs-1` through `.fs-6` claim pixel-like values in the SCSS utility file, but Bootstrap's `!important` declarations win. Measured `.fs-2` is 32px and `.fs-4` is 24px at 1440px, not 2px and 4px. Explicit `.fs-12`, `.fs-13`, `.fs-18` etc. use the custom pixel scale. Avoid reading a utility name as proof of its computed size.

**Recommendations:** document a compact role-based type scale, keep actual heading semantics separate from visual size, choose a tested Arabic fallback, and review 300-weight body copy and ~10.5px badges at realistic zoom. Do not increase all headings to the reference's sizes without a separate design decision.

## 4. Logo and branding

### Active assets

| Asset / alias | Existing dimensions | Use |
|---|---|---|
| `logo01.png` / `hBlackLogo` | 3288 × 798; transparent RGBA | Navy wordmark with gold emblem, light surfaces |
| `logo01-dark.png` / `hWhiteLogo` | 1000 × 243; indexed transparency | Light wordmark with gold emblem, dark surfaces |
| `logo02.png` / `sBlackLogo`, `sWhiteLogo`, `sYellowLogo`, `sPurpleLogo` | 3304 × 3310; transparent RGBA | Same gold emblem for compact variants and loader |
| `favicon.ico` | Existing browser icon asset | Linked from `index.html` |

`Imagedata.jsx` explicitly describes the dark logo as a derived recoloring, not an official designer-supplied reversed master. Multiple named compact aliases all resolve to the same gold mark; they are not distinct black, white, yellow and purple marks. [S5]

Dominant opaque pixel samples from `logo01.png`: **navy `#1F4067`**, **gold `#CAA46B`**. `logo02.png` uses the same gold. The dark asset has palette quantization and partially transparent pixels; it is better specified by its file than as a flat replacement color. These sampled colors are not active UI tokens and are not proof of a formal brand palette.

Additional assets exist: `Horizontal_Black.png`, `Horizontal_White.png`, `Solo_Black.png`, `Solo_White.png`, `Solo_Yellow.png`, `Solo_Purple.svg`. They are not selected by the active `ALLImages` alias mapping. Treat them as legacy/alternative inventory pending brand review.

### Implemented placement rules

- Full header/sidebar logo: width `min(11.5rem, 100%)` (up to 184px), auto height, maximum height 48px, `object-fit: contain`.
- Compact mark: 36 × 36px, `object-fit: contain`.
- Sign-in: width `min(16rem, 75vw)` (up to 256px), auto height, maximum height 72px.
- Theme-specific classes switch the light and dark wordmarks; aspect ratio is preserved. [S5, S8]

**Missing standards:** no authoritative clear-space unit, minimum readable size, monochrome policy, co-branding rules, approved print colors or asset-licensing guidance was found in the inspected implementation. Existing display sizes are usage evidence, not validated minimum sizes.

**Recommendations:** preserve aspect ratio and original lockup; avoid recoloring, stretching, rotating or redrawing assets; select the wordmark appropriate to its surface; approve a vector master and reversed version. Establish clear space and minimum size with the brand owner before treating them as requirements. Replace generic `alt="logo"` with a meaningful brand name where the image conveys the home link's identity.

## 5. Iconography

The loaded icon stylesheet imports **Remix Icon 4.1.0** and **Bootstrap Icons 1.11.1** as local webfonts. Remix `ri-…-line` dominates navigation/module/action icons; `ri-…-fill` variants also exist. Bootstrap `bi bi-moon` and `bi bi-brightness-high` appear in the sign-in theme switch. Boxicons/Tabler are not loaded by the current HTML. Files left in the repository do not establish active use. [S6]

| Context | Existing size |
|---|---|
| Sidebar `.side-menu__icon` | 1.15rem box ≈ 18.4px |
| Profile section icon | 16px glyph in 29.6px container |
| Pagination summary icon | 16px glyph in 32px container |
| `.btn-icon` | ~37px square; 15.2px font |
| `.btn-icon.btn-sm` | 28px square; 12.8px font |
| `.btn-icon.btn-lg` | 44px square; 19.2px font |
| Module icon `.fs-4` | 24px at desktop, Bootstrap responsive sizing |

Standard table action buttons sometimes use `.btn-sm` rather than `.btn-icon`, so do not assume all icon actions are square. Labels/tooltips and accessible names exist in `DataTableServer`, including row-specific names. Coverage is not universal. [S7–S8]

**Recommendations:** prefer Remix outline for new product icons, retain existing Bootstrap icons until deliberately consolidated, use `currentColor`, hide decorative glyphs from assistive technology, and give every icon-only control an accessible name. Do not force all icons to 24px: glyph size and interaction target size are separate concerns.

## 6. UI component catalog and states

### Buttons

| Variant/state | Existing behavior |
|---|---|
| Primary | Lavender `#A084F9` fill and border, `#2A2000` text |
| Primary hover | Primary RGB at 90% alpha; border remains solid; foreground stays on-primary |
| Primary active | Solid primary fill; visible change may be subtle |
| Keyboard focus | 2px `#0A58CA` outline, 2px offset; dark ring `#8AB4FF` |
| Secondary | `#B45AED` fill, white text; hover uses 90% alpha |
| Neutral | `.btn-light`, `#F5F7FA` fill, `#333333` text in light mode |
| Light/transparent | `.btn-primary-light`, `.btn-secondary-light`, semantic counterparts; tinted backgrounds and colored foregrounds |
| Outline | `.btn-outline-*` variants available; verify their own foreground/state rules rather than assuming primary foreground fixes apply |
| Destructive | `.btn-danger` or `.btn-danger-light`; red is not the primary action color |
| Disabled | Existing disabled semantics and opacity; primary specimen measured 0.6 |
| Loading | Individual forms disable submit and render a spinner/text; no single shared loading-button component |

| Size | Font | Block × inline padding | Radius | Approximate single-line outer height |
|---|---|---|---|---|
| Small | 12px / 300 | 4.16 × 8px | 8px | 28.32px |
| Default | 13.6px / 300 | 8 × 13.6px | 8px | 38.4px |
| Large | 15.2px / 300 | 10.4 × 16px | 13.6px | 45.6px |

Heights are derived from line-height + padding + 1px top/bottom borders, not fixed CSS height tokens. Icon-only variants have separate fixed sizes. [S7–S8]

**Recommendation:** one clearly emphasized action per local task group, neutral cancellation, named destructive actions, and a consistent pending treatment. “Exactly one gold button per screen” is a rule in the reference image, not an existing dashboard rule.

### Forms and selection

| Element/state | Existing specification |
|---|---|
| Text input | 14px / 300; line-height 1.8; padding 6px 12px; 1px `#E8E8E8` border; 13.6px radius |
| Large input | 16px; padding 8px 16px; same 13.6px radius |
| Small input | 12.8px; padding 4px 12.8px; 8px radius |
| Form label | 12.8px / 400, main text color |
| Native select | 13.96px / 400; 6px radius in specimen; RTL-aware padding and chevron |
| Focus | Control styling plus shared keyboard outline; react-select outlines its visible `.Select2__control--is-focused` wrapper |
| Invalid | `.is-invalid` + `.invalid-feedback`; specimen border `#DC3545` from Bootstrap, not semantic danger `#E74C3C` |
| Valid | Bootstrap `.is-valid` state exists; not a mandated success treatment for every form |
| Disabled | Light utility background, main text; native disabled behavior |
| Read-only | Native read-only semantics; no complete separate read-only visual standard found |
| Checkbox/radio | 1.1em control size in base theme; checked fill/border uses primary |
| Password visibility | Actual button with Arabic accessible name and pressed state in sign-in; positioned inside LTR password wrapper |
| React Select | `classNamePrefix="Select2"`; used by employee filters and pickers; searchable/clearable behavior set per caller |

The sign-in identifier and password are explicitly LTR inside the RTL page. Feedback is kept outside the password wrapper so the eye button remains aligned. For new forms, reuse this pattern instead of applying LTR to the whole form. Field error wording and required/optional conventions are not fully centralized. [S7, S9]

### Cards, panels and dialogs

- `.card.custom-card`: themed surface, 13.6px radius, no outer border, shadow `0 2px 4px rgba(0,0,0,.05)`, 24px bottom margin.
- Card header: 16px 20px padding, bottom border, wrap-capable flex layout, 4px gap. Header corner radius is 10px, different from the outer card's 13.6px.
- Card body: 16px padding. Footer: 16px 20px padding and top border.
- Profile sections: flat bordered sections inside the existing card, 10.4px radius and 20px separation; a tinted heading differentiates groups.
- Modal: themed surface, 1px default border, 13.6px radius; header/footer padding 16px 20px. Modal/backdrop z-index 105/104.
- Destructive confirmations: shared `confirmDestructive` uses SweetAlert2, record-specific wording, red confirm, neutral cancel and reversed button order. Discard confirmation has a separate helper. [S7–S10]

**Recommendation:** reuse custom cards for primary surfaces and flat profile sections for nested groups. Treat custom-card and modal radii as existing values, not an invitation to introduce 12/16/24px corners from the sample image.

### Navigation, tables and feedback

| Component | Existing pattern and states |
|---|---|
| App shell | Fixed header and vertical sidebar; fullwidth content; RTL default |
| Sidebar | Permission-aware items; route active state; expandable groups rendered as buttons; hover/active foreground uses primary-ink |
| Pageheader | h1, optional linked parent breadcrumb, non-link current crumb, trailing action group; wraps with 8px gap |
| Tabs | React Bootstrap tabs/nav variants; active styles vary by class, so there is no single approved tab appearance |
| Table | `.table-responsive`, striped/hover rows, free-text wrapping below lg, opt-in nowrap for dates/IDs/actions |
| Table sort | `SortableTh`, explicit sort button/state and server-owned sort value |
| Table actions | Row-specific labels when supplied; action clicks do not trigger row navigation; keyboard detail action available |
| Pagination | Summary + controls + circular 34px page links; active, hover and disabled states; disabled page opacity 0.38 |
| Loading | MutatingDots in `StatePanel`/tables; route loader; spinners in forms |
| Empty | Contextual empty message, typically in table/content area; no shared universal empty-state component |
| Error | StatePanel alert with optional retry; table error row; separate no-access/session/offline screens |
| Toast | RTL, bottom-right, Slide, limit 5, default 4 seconds, pause on hover; errors stay until dismissed |

The landing dashboard is a permission-aware module launcher, not an analytics dashboard. Its cards use `Col sm={6} xl={4}` and `g-3`; the design guide should not invent KPI widgets as existing components. [S4, S7, S10]

## 7. Spacing, layout and responsiveness

### Existing spacing scale

Bootstrap utilities `m`, `p`, `gap`, `g`, `gx`, `gy` use the following common scale. `ms/me`, `ps/pe` and logical properties are preferable for RTL-aware direction. [S11]

| Suffix | rem | px |
|---|---|---|
| `0` | 0 | 0 |
| `1` | .25 | 4 |
| `2` | .5 | 8 |
| `3` | 1 | 16 |
| `4` | 1.5 | 24 |
| `5` | 3 | 48 |

The implementation also uses 10, 12, 14, 20, 32px and fractional rem values in component rules. This is **not** a strict universal 4/8/12/16/24/32 scale. `p-4` means 24px; `p-5` means 48px, not 20px.

### Grid and shell

Bootstrap's flex grid has 12 columns; rows use 24px horizontal gutters by default. `g-3` changes gutters to 16px. Containers apply half-gutter padding on each side. The app uses `.container-fluid`; sign-in uses a bounded `.container`.

At desktop sizes the sidebar width is **256px / 16rem** and header height is **68px / 4.25rem**. Content has matching top/start offsets and `.main-content` adds 8px inline padding, with a further 12px per side from a default container (approximately 20px before row-specific compensation). RTL `inline-start` is the right side. [S8, S11–S12]

| Breakpoint | Minimum width | `.container` max width | Observed behavior |
|---|---|---|---|
| xs | 0 | Fluid | Stacked narrow layouts |
| sm | 576px | 540px | Dashboard becomes two columns |
| md | 768px | 720px | Sign-in col-md-6 |
| lg | 992px | 960px | Desktop sidebar layout; below this sidebar overlays and initially closes |
| xl | 1200px | 1140px | Dashboard three columns; pagination uses its wider arrangement |
| xxl | 1400px | 1320px | Sign-in col-xxl-4 |

Other observed thresholds: ≤1199.98px pagination wraps and page links move to a full row; ≤575.98px pagination summary/controls stack and profile headings compact; <992px table text wraps except explicit nowrap cells. These are source observations, not verified phone-screen behavior. [S12]

**Recommendations:** use the existing grid and logical alignment; test at 320, 390, 768, 991/992, 1200 and 1440px and at 200% zoom. Keep horizontally wide data tables in explicit scrollers. Do not hide overflow as a substitute for layout. Validate touch targets separately from icon dimensions.

## 8. Tokens: developer reference

The token tables in this document record the effective light/dark properties, observed component dimensions, logo samples and conflicts. They are an **audit reference**, not an installed token package. Existing CSS variable names are preserved; descriptive category names do not imply new application tokens.

### Existing token usage

```css
/* Examples for future implementation, not changes applied to this app. */
.example-surface {
  color: var(--default-text-color);
  background: var(--custom-white);
  border-color: var(--default-border);
}
.example-primary-action {
  color: var(--on-primary);
  background: var(--primary-color);
}
.example-primary-text { color: var(--primary-ink); }
.example-tint { background: var(--primary01); }
```

Prefer existing classes (`btn`, `form-control`, `card custom-card`, `gap-3`) rather than duplicating their declarations. RGB channel tokens work inside `rgba(var(--primary-rgb), .1)`; they are not complete CSS color values by themselves.

| Token category | Current source of truth / gap |
|---|---|
| Colors | CSS custom properties, with competing root declarations |
| Font | `--default-font-family`, `--default-font-size`, `--default-font-weight` |
| Focus | `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset` in compiled CSS |
| Spacing | Bootstrap utility declarations; no application `--space-*` family |
| Radius | `$default-radius: .85rem`, component literals, Bootstrap `--bs-border-radius-*` |
| Shadows | SCSS `$box-shadow`, component literals, Bootstrap shadow utilities |
| Motion | Component literals such as .05s, .15s, .2s and .3s; no common motion token set |
| Layering | Header/sidebar/modal/overlay rules; no documented semantic z-index scale |

Observed radii: 4px badge, 6px native select/Bootstrap default, 8px button, 10px card-header corner, 10.4px profile/pagination-select, 13.6px card/input/modal, 50% circular avatar/page control. Bootstrap also exposes 16/32px and pill radii. The variety is inventory, not an intentional approved scale.

Shadows: custom card `0 2px 4px rgba(0,0,0,.05)`; dark custom card white at 5%; profile sections normally use borders; active pagination `0 4px 12px var(--primary02)`; theme-toggle `0 1px 3px rgba(0,0,0,.08)`. Verify the component context instead of applying a generic shadow everywhere.

## 9. Status language and consistency

Business statuses should retain their existing labels; colors alone are not labels. The current components frequently display server-provided `status_label` and use numeric status values to choose a badge class. The supplied image's five-day-status vocabulary is not the complete dashboard vocabulary. [S13]

| Attendance day state | Existing visual mapping |
|---|---|
| Present, not checked out yet | Info transparent |
| Present | Success transparent |
| Missing checkout | Warning transparent |
| On leave | Primary transparent |
| Excused absence | Secondary transparent |
| Absent | Danger transparent |
| Holiday | Light + default text |
| Rejected record | Danger transparent |
| Not recorded yet | Light + muted text |

Leave register: pending → warning, approved → success, rejected → danger, canceled → secondary. Approval step: pending → warning, approved → success, rejected → danger, not requested → light/muted. A difference in meaning can justify a different color; however, these mappings are duplicated instead of represented by one reusable status component.

**Recommendation:** establish a semantic status registry and a shared badge component with label, optional icon, foreground and background tokens. Preserve contextual differences explicitly. Do not replace unrecorded/unknown data with an invented count or “absent” state.

## 10. Inconsistencies and missing standards

| Priority | Existing evidence | Why it matters | Recommendation |
|---|---|---|---|
| High | Two conflicting palette sources; later SCSS wins | Visual intent and code comments diverge; CSS regeneration risks regression | Choose authoritative tokens and reconcile compile path |
| High | Primary-ink is gold-brown while fill is lavender | Fill/text families are semantically mismatched | Approve coherent foreground/fill pairs for both themes |
| High | Secondary fill effectively reverts to `#B45AED` | White-on-secondary contrast is below 4.5:1 for normal text | Re-evaluate effective values, not compiled comments |
| High | Semantic badge text uses saturated foreground on 10% tint | Success/warning/info/danger normal-text pairings need contrast work | Add accessible on/tint-ink tokens and validate |
| Medium | Logo navy/gold, UI lavender/purple, compiled yellow | No single documented relationship between brand and interface | Define brand-vs-product roles before recoloring |
| Medium | `.fs-1…6` names collide with Bootstrap | Misleading sizes in code review and future component work | Document resolved utilities or rename custom scale deliberately |
| Medium | Buttons/cards/inputs/selects use differing radii | Similar elements lack a consistent shape hierarchy | Approve a role-based radius scale; preserve until approved |
| Medium | Danger `#E74C3C` vs validation `#DC3545` | “Error” has two color families | Align semantic and validation tokens in both themes |
| Medium | `data-theme-mode` vs `data-bs-theme` | Not all Bootstrap dark variables follow app mode | Verify component-specific theme compatibility |
| Medium | Small body/badge type, light 300 weight | Dense Arabic information can become difficult to read | Review real content at zoom and lower-resolution displays |
| Medium | Native forms, React Select, SweetAlert and Toastify each contribute styling | States and focus treatments can diverge | Define wrapper/component contracts and review all states |
| Medium | No formal logo clear-space/minimum-size rules | Inconsistent future brand placement | Obtain approved vector masters and brand constraints |
| Lower | Multiple imported font families, extensive template CSS | Unused choices obscure the intended system | Inventory actual usage before removing assets/styles |
| Lower | Local timing/animation literals | Motion behavior has no common policy | Define motion tokens and reduced-motion behavior |

The historical absence of focus rings is **not** reported as a current defect: a late focus-visible override now exists and the isolated specimen verified a visible 2px blue outline. Similarly, `Sidebar` currently selects `state.theme`; old findings are not carried forward as current evidence.

### Contrast scope

The following ratios were calculated from the observed light-theme colors. Transparent semantic badges are composited at 10% over white. This is not a whole-site or all-theme accessibility verdict.

| Pair | Foreground | Background | Contrast ratio | Normal-text result |
|---|---|---|---|---|
| Body text | `#333333` | `#FFFFFF` | 12.63:1 | Pass |
| Muted text | `#6C757E` | `#FFFFFF` | 4.68:1 | Pass |
| Primary button | `#2A2000` | `#A084F9` | 5.49:1 | Pass |
| Primary ink | `#8A6200` | `#FFFFFF` | 5.49:1 | Pass |
| Secondary button | `#FFFFFF` | `#B45AED` | 3.73:1 | Needs work |
| Success badge | `#2ECC71` | 10% success over white | 1.94:1 | Needs work |
| Warning badge | `#F39C12` | 10% warning over white | 2.03:1 | Needs work |
| Info badge | `#3498DB` | 10% info over white | 2.84:1 | Needs work |
| Danger badge | `#E74C3C` | 10% danger over white | 3.36:1 | Needs work |

Normal text generally requires at least 4.5:1; large text has a 3:1 threshold under [WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Interactive target minimums are 24 × 24 CSS px with specified exceptions; 44px is a useful larger-target recommendation, not the AA minimum. See [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 11. Rules for future development

### Preserve and reuse existing patterns

1. Use the current shared component before adding a page-specific version: Pageheader, DataTableServer, SortableTh, pagination, StatePanel, EmployeePicker, confirmation helpers.
2. Use themed CSS properties for surfaces/text, semantic classes for actions, and logical spacing properties for RTL.
3. Keep Arabic labels and headings RTL; isolate identifiers, email, passwords and machine-readable values as LTR where required.
4. Keep status labels visible and contextual; do not communicate an outcome only with color.
5. Preserve keyboard focus, native buttons/links, row-specific accessible names and the skip-to-content landmark.
6. Distinguish loading, empty, error, disabled, no permission and unrecorded data. Use retry only when retry is meaningful.
7. Preserve image aspect ratios and use the implemented light/dark wordmark mapping.
8. Use the Bootstrap grid and spacing suffixes according to their actual values; inspect computed styles when utilities collide.

### Proposed review gate — not currently enforced

Before approving new UI, check both themes; Arabic long text; keyboard and focus order; actual font loading; default/hover/active/focus/disabled/loading/invalid states; mobile and zoom; contrast; input labels; visible error feedback; meaningful empty states; and no unintended horizontal overflow outside data scrollers. For component changes, include screenshots and computed-token evidence from the same CSS build path used by the app.

**Decision order:** resolve cascade ownership → approve brand/UI roles → fix semantic contrast → consolidate role-based typography/radii/status components → document responsive and accessibility acceptance rules. No implementation changes were made during this audit.

## 12. Source map and evidence

Repository links are relative to this document for portability. Line anchors refer to the reviewed snapshot above and can move with future edits.

- **S1 — Entry and theme:** [src/index.scss](../src/index.scss#L1), [src/main.jsx](../src/main.jsx#L1).
- **S2 — SCSS variables:** [src/assets/scss/_variables.scss](../src/assets/scss/_variables.scss#L1).
- **S3 — Compiled root/dark tokens:** [src/assets/css/styles.css](../src/assets/css/styles.css#L1).
- **S4 — Actual title/module usage:** [Pageheader.jsx](../src/components/Pageheader.jsx#L1), [Dashboard.jsx](../src/sections/dashboard/Dashboard.jsx#L1).
- **S5 — Logo selection:** [Imagedata.jsx](../src/data/Imagedata.jsx#L1), [Sidebar.jsx](../src/components/Sidebar.jsx#L710), [Header.jsx](../src/components/Header.jsx#L296).
- **S6 — Icon imports:** [icons.css](../src/assets/css/icons.css#L1), [Remix stylesheet](../src/assets/icon-fonts/RemixIcons/fonts/remixicon.css#L1), [Bootstrap Icons stylesheet](../src/assets/icon-fonts/bootstrap-icons/icons/font/bootstrap-icons.css#L1).
- **S7 — Component styles:** [buttons](../src/assets/css/styles.css#L4281), [cards](../src/assets/css/styles.css#L6348), [forms](../src/assets/css/styles.css#L6939), [modals](../src/assets/css/styles.css#L7975), [typography utilities](../src/assets/css/styles.css#L27445).
- **S8 — Late overrides and logo sizing:** [styles.css](../src/assets/css/styles.css#L28062), [focus ring](../src/assets/css/styles.css#L28142), [DataTableServer.jsx](../src/components/DataTableServer.jsx#L1).
- **S9 — Form implementation:** [Signin.jsx](../src/pages/Signin.jsx#L1), [EmployeePicker.jsx](../src/components/EmployeePicker.jsx#L1).
- **S10 — Feedback and composition:** [App.jsx](../src/pages/App.jsx#L1), [StatePanel.jsx](../src/components/StatePanel.jsx#L1), [toast.js](../src/utils/toast.js#L1), [confirmDestructive.js](../src/utils/confirmDestructive.js#L1).
- **S11 — Bootstrap primitives:** [bootstrap.css](../src/assets/css/bootstrap.css#L770), [themeReducer.jsx](../src/redux/redurcers/themeReducer.jsx#L1).
- **S12 — Custom layout:** [vertical sidebar](../src/assets/scss/menu-styles/_vertical.scss#L1), [header](../src/assets/scss/custom/_header.scss#L1), [pagination](../src/assets/scss/custom/_table-pagination.scss#L1), [profile sections](../src/assets/scss/custom/_employee-profile.scss#L1).
- **S13 — Status mapping:** [EmployeeAttendance.jsx](../src/sections/attendance/EmployeeAttendance.jsx#L43), [ApprovalChain.jsx](../src/sections/approvals/ApprovalChain.jsx#L11), [LeaveRegister.jsx](../src/sections/leave/LeaveRegister.jsx#L48).

Verification used computed-style specimens from Vite's transformed entry stylesheet, Chrome rendered-font inspection, direct image inspection and calculated contrast ratios. The relevant results are recorded in this document. No production build, full application test suite or authenticated workflow test is claimed.
