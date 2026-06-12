# UI/UX Overhaul — Home, Upscale, Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, no subagents — user requested) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the visual layer and layout of the three app surfaces (Generate, Upscale, Gallery) of this personal KIE.ai image tool, giving it a real design identity, motion, and polished interaction states without changing any functionality, IA, or API contracts.

**Architecture:** Redesign in _overhaul_ mode. Introduce a locked design system (violet/indigo accent, Geist type, motion tokens), a small set of shared motion/layout primitives, then recompose each page on top of the existing data/state logic (SWR hooks, SSE progress, upload handlers stay untouched).

**Tech Stack:** Next.js 16 (App Router, React 19), Tailwind v4, shadcn/ui (`@base-ui/react`), `next-themes`, `swr`, `sonner`, `lucide-react`, **+ `motion` (new)** for UI animation. GSAP optional, only for the home hero aurora if desired.

---

## Context

**Why this change:** The app works but looks like an unstyled shadcn template. Concrete problems found in the audit:

- **No brand identity** — `globals.css` palette is pure grayscale OKLCH (no accent). Buttons, focus rings, badges are all neutral. Flat and generic.
- **`Inter` as default font** (`app/layout.tsx:8`) — a classic AI-template tell. `globals.css` already references `--font-sans` / `--font-geist-mono` tokens that nothing currently sets.
- **Motion is near-zero** — only spinners and a CSS `slide` keyframe. No reveal, no hover physics, no page transitions.
- **Generic page shells** — every page is `max-w-7xl` + a small icon-and-title row + a two-column grid. Empty states are dashed boxes. Gallery is a plain `grid`.
- **Copy/state polish gaps** — en-dash in UI copy (`15–60 seconds` in `GenerationProgress`), uneven density, hover affordances only partly designed.

**Design Read:** Redesign (overhaul mode) of a personal AI image-generation tool with three app surfaces, for a single power-user, with a focused dark-tech / studio language, leaning toward Tailwind v4 + Geist + a single locked violet-indigo accent + `motion`-driven micro-interactions.

**Dials:** `DESIGN_VARIANCE: 7` · `MOTION_INTENSITY: 7` · `VISUAL_DENSITY: 4`.

**Scope decisions (confirmed with user):** accent = **violet/indigo**; motion library = **yes, add `motion`** (size increase acceptable); change depth = **overhaul layout**.

**Out of scope / preserve (never change silently):** route slugs (`/`, `/upscale`, `/gallery`), nav labels, all API routes and request bodies (e.g. `modelId: 'recraft/crisp-upscale'` params shape), SWR keys (`/api/credits`, `/api/gallery`, `/api/uploads`), SSE stream wiring, drag/drop + upload logic, batch-select + delete logic, model config in `lib/models.ts`. This is visual + layout only.

---

## Design System (exact values — pin these)

### Tokens — replace the palette in `app/globals.css`

Keep the existing token _structure_ (`@theme inline` mapping is fine). Change the accent, ring, radius, and add brand/motion tokens. Neutrals stay near-grayscale so the single accent pops (Color Consistency Lock).

```css
:root {
  --background: oklch(0.99 0.004 285);
  --foreground: oklch(0.16 0.01 285);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.16 0.01 285);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.16 0.01 285);

  /* LOCKED ACCENT — violet/indigo, used on every surface */
  --primary: oklch(0.545 0.235 280);
  --primary-foreground: oklch(0.985 0.01 280);

  --secondary: oklch(0.968 0.005 285);
  --secondary-foreground: oklch(0.205 0.01 285);
  --muted: oklch(0.968 0.005 285);
  --muted-foreground: oklch(0.552 0.012 285);
  --accent: oklch(0.965 0.012 285);
  --accent-foreground: oklch(0.205 0.02 280);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.918 0.006 285);
  --input: oklch(0.918 0.006 285);
  --ring: oklch(0.545 0.235 280);

  --radius: 0.75rem;

  /* brand + motion additions */
  --brand-from: oklch(0.62 0.23 285);
  --brand-to: oklch(0.55 0.2 305);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms;
  --dur-normal: 280ms;
}

.dark {
  --background: oklch(0.155 0.012 285);
  --foreground: oklch(0.985 0.003 285);
  --card: oklch(0.205 0.014 285);
  --card-foreground: oklch(0.985 0.003 285);
  --popover: oklch(0.205 0.014 285);
  --popover-foreground: oklch(0.985 0.003 285);

  --primary: oklch(0.66 0.215 282);
  --primary-foreground: oklch(0.16 0.02 282);

  --secondary: oklch(0.262 0.012 285);
  --secondary-foreground: oklch(0.985 0.003 285);
  --muted: oklch(0.262 0.012 285);
  --muted-foreground: oklch(0.715 0.012 285);
  --accent: oklch(0.262 0.02 285);
  --accent-foreground: oklch(0.985 0.003 285);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 9%);
  --input: oklch(1 0 0 / 14%);
  --ring: oklch(0.66 0.215 282);

  --brand-from: oklch(0.7 0.21 285);
  --brand-to: oklch(0.62 0.19 305);
}
```

Also add to `globals.css` base layer: smooth focus ring, custom thin scrollbar (violet thumb), `::selection` violet tint, and a reusable aurora/grid background utility plus reduced-motion guard:

```css
@layer base {
  ::selection {
    background: color-mix(in oklch, var(--primary) 28%, transparent);
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklch, var(--primary) 35%, transparent)
      transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}

.bg-grid {
  background-image:
    linear-gradient(
      to right,
      color-mix(in oklch, var(--foreground) 6%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in oklch, var(--foreground) 6%, transparent) 1px,
      transparent 1px
    );
  background-size: 40px 40px;
  mask-image: radial-gradient(
    ellipse 80% 60% at 50% 0%,
    #000 40%,
    transparent 100%
  );
}
```

### Typography — Geist (replaces Inter)

In `app/layout.tsx` swap `Inter` for Geist + Geist Mono via `next/font/google`, expose CSS variables that the existing `@theme inline` tokens already point at (`--font-sans`, `--font-geist-mono`).

```tsx
import { Geist, Geist_Mono } from 'next/font/google';
const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});
// <html className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
```

Display headings: `text-2xl sm:text-3xl font-semibold tracking-tight`. Numbers/IDs: `font-mono`. Emphasis = bold/italic of the **same** family (no second font).

### Shape & motion locks

- One radius scale (`--radius: 0.75rem`); cards `rounded-2xl`, controls `rounded-xl`, pills `rounded-full`. Apply consistently.
- Single accent everywhere. No second accent color introduced anywhere.
- Every animation honors `prefers-reduced-motion` via `motion`'s `useReducedMotion()` or the CSS guard above.
- Animate only `transform` / `opacity` / `filter`.

---

## New shared files

```
components/motion/
  Reveal.tsx          # whileInView fade+rise, reduced-motion aware (client leaf)
  MotionConfig.tsx    # wraps app in motion config (optional, for reduced motion)
components/layout/
  PageHeader.tsx      # reusable page hero: eyebrow(optional)+title+subtitle+slot, gradient accent
  AuroraBackground.tsx# fixed, pointer-events-none violet aurora blobs + bg-grid (reduced-motion safe)
```

These are the only _new_ components. Everything else is an in-place edit of an existing file.

---

## Tasks

> Verification is screenshot-driven (this is visual work): run `npm run dev`, drive with the Playwright MCP (`mcp__plugin_playwright_playwright__*`) at widths 375 / 768 / 1440 in **both** light and dark, plus `npx tsc --noEmit` and `npm run lint`. Unit tests are not added for presentational components; correctness = typecheck + lint + build + visual check. Commit after each task.

### Task 1: Install motion + foundation tokens & fonts

**Files:**

- Modify: `package.json` (via install)
- Modify: `app/globals.css` (palette, base layer, `.bg-grid`, reduced-motion)
- Modify: `app/layout.tsx` (Geist fonts, AuroraBackground mount)

- [ ] **Step 1: Install motion**

```bash
npm install motion
```

- [ ] **Step 2: Apply the token + base-layer changes** to `app/globals.css` exactly as in the Design System section above (accent, dark block, radius `0.75rem`, `::selection`, scrollbar, reduced-motion guard, `.bg-grid`).

- [ ] **Step 3: Swap Inter → Geist** in `app/layout.tsx` per the Typography snippet. Set `<html className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. `npm run dev`, open `/` — buttons/focus rings now violet, font is Geist, no visual regressions in layout.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx package.json package-lock.json
git commit -m "feat(ui): violet accent design tokens + Geist fonts + motion dep"
```

### Task 2: Shared motion + layout primitives

**Files:**

- Create: `components/motion/Reveal.tsx`
- Create: `components/layout/AuroraBackground.tsx`
- Create: `components/layout/PageHeader.tsx`
- Modify: `app/layout.tsx` (render `<AuroraBackground />` behind `<main>`)

- [ ] **Step 1: `Reveal.tsx`** — client leaf, `whileInView` fade + 16px rise, `viewport={{ once: true, amount: 0.2 }}`, `transition` ease `[0.16,1,0.3,1]`, optional `delay` prop; returns children static when `useReducedMotion()` is true. Accept `as` tag + `className`.

- [ ] **Step 2: `AuroraBackground.tsx`** — `fixed inset-0 -z-10 pointer-events-none overflow-hidden`. Two or three blurred violet radial blobs (`bg-[radial-gradient(...)]` using `--brand-from`/`--brand-to`, `blur-3xl`, low opacity ~0.18 light / 0.22 dark) with a slow `motion` float (`animate={{ y, x }}` 18-24s loop), plus a `<div className="absolute inset-0 bg-grid" />`. Collapses to static under reduced motion.

- [ ] **Step 3: `PageHeader.tsx`** — props `{ icon?, eyebrow?, title, subtitle?, children? }`. Layout: small gradient-bordered icon chip (uses `--brand-from→--brand-to`), `h1` display style, muted subtitle, optional right-aligned `children` slot for actions. Left-aligned (anti-center bias). Reuse on all three pages so headers are consistent. **Eyebrow used at most once per page** (respect eyebrow-count rule).

- [ ] **Step 4: Mount aurora** in `app/layout.tsx`: render `<AuroraBackground />` as first child inside `<body>` (before `ThemeProvider`'s content or inside it before `<main>`).

- [ ] **Step 5: Verify** `npx tsc --noEmit && npm run lint`; dev server shows subtle aurora + grid behind content in both themes, motion stops under OS reduced-motion.

- [ ] **Step 6: Commit**

```bash
git add components/motion components/layout/AuroraBackground.tsx components/layout/PageHeader.tsx app/layout.tsx
git commit -m "feat(ui): aurora background, Reveal primitive, PageHeader"
```

### Task 3: Header redesign

**Files:**

- Modify: `components/layout/Header.tsx`

- [ ] **Step 1: Recompose** keeping the same `NAV`, `usePathname`, theme toggle, and `/api/credits` SWR (do not touch the fetch). Changes:
  - Logo: gradient brand chip (`--brand-from→--brand-to`) + wordmark; wordmark `font-semibold tracking-tight`.
  - Nav: active item gets a `motion` shared `layoutId="nav-pill"` highlight (violet `bg-primary/10 text-primary`) that slides between items; inactive `text-muted-foreground hover:text-foreground`. Single line at desktop (already is), height stays 56px (`h-14`).
  - Credits pill: violet-tinted (`border-primary/20 bg-primary/5`), coin icon in `text-primary` (drop the yellow), keep `font-mono` number.
  - Header bg: `bg-background/70 backdrop-blur-xl border-border/60`.

- [ ] **Step 2: Verify** `npx tsc --noEmit && npm run lint`; nav pill animates on route change, credits readable in both themes (WCAG AA), single line at 1024px and a tidy condensed state at 375px (icons keep labels or collapse gracefully).

- [ ] **Step 3: Commit**

```bash
git add components/layout/Header.tsx
git commit -m "feat(ui): redesign header with animated nav pill + brand mark"
```

### Task 4: Home (Generate) overhaul

**Files:**

- Modify: `app/page.tsx`
- Modify: `components/generator/GenerationProgress.tsx`

- [ ] **Step 1: Page shell** — wrap content; add `<PageHeader icon={Wand2} eyebrow="Studio" title="Generate" subtitle="Describe it, pick a model, and watch it render." />` above the grid. Keep the `lg:grid-cols-[380px_1fr]` split but: form card → `rounded-2xl border-border/60 bg-card/60 backdrop-blur-sm shadow-sm shadow-primary/5`; sticky offset `lg:top-20`.

- [ ] **Step 2: Empty state** — replace dashed box with a centered composition: gradient icon halo (violet glow via `blur`), heading "Your canvas is empty", helper line, and 2-3 example prompt chips (static strings, click fills nothing — purely decorative is banned, so make chips call the form? Keep simple: omit fake chips, just the halo + copy + a subtle arrow pointing to the form on desktop). Animate in with `Reveal`.

- [ ] **Step 3: Results list** — wrap each `GenerationProgress` in `Reveal` (stagger via index `delay`). Keep `activeTasks` state + handlers unchanged. The "N tasks / Clear completed" row → sticky sub-toolbar with `font-mono` count.

- [ ] **Step 4: `GenerationProgress` polish** — keep all SSE logic, `StatusIcon`, `statusLabel`, bars. Visual only: card `rounded-2xl`; success border `border-primary/30` (was emerald — keep emerald only for the status _icon_, border uses accent for brand consistency, or keep emerald icon + neutral border); result image grid hover scale already exists, add rounded-xl + ring on hover; **fix copy `15–60 seconds` → `15-60 seconds`** (en-dash ban). Download button on hover gets violet `variant`.

- [ ] **Step 5: Verify** at 375/768/1440 both themes; generate flow still works end-to-end (form submit → SSE progress → images). `npx tsc --noEmit && npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx components/generator/GenerationProgress.tsx
git commit -m "feat(ui): overhaul generate page layout, empty state, progress cards"
```

### Task 5: Generator form + controls polish

**Files:**

- Modify: `components/generator/GeneratorForm.tsx`
- Modify: `components/generator/ModelSelector.tsx`
- Modify: `components/generator/ParameterField.tsx`
- Modify: `components/generator/ImageUploadField.tsx`

- [ ] **Step 1:** Tighten spacing rhythm (`space-y-5`), label style `text-xs font-medium text-muted-foreground`, inputs `rounded-xl` focus `ring-2 ring-primary/30`. Submit/generate button: full-width `h-11`, gradient or solid violet, `:active` `scale-[0.98]`, loading spinner state preserved.
- [ ] **Step 2: ModelSelector** — selected model row shows a violet active ring/check; description text `leading-relaxed`. Keep `getModelById` logic + `onValueChange`.
- [ ] **Step 3: ParameterField / ImageUploadField** — consistent control radii, dropzone hover `border-primary/50 bg-primary/5`, keep all upload + value-change handlers untouched.
- [ ] **Step 4: Verify** form submits, model switch re-renders params, image upload field still uploads. `npx tsc --noEmit && npm run lint`.
- [ ] **Step 5: Commit**

```bash
git add components/generator/GeneratorForm.tsx components/generator/ModelSelector.tsx components/generator/ParameterField.tsx components/generator/ImageUploadField.tsx
git commit -m "feat(ui): polish generator form controls and states"
```

### Task 6: Upscale overhaul

**Files:**

- Modify: `app/upscale/page.tsx`
- Modify: `components/upscale/ImageCompare.tsx`
- Modify: `components/upscale/UpscaleProgress.tsx`
- Modify: `components/upscale/GalleryPicker.tsx`

- [ ] **Step 1: Page shell** — replace the hand-rolled title row with `<PageHeader icon={Maximize2} title="Crisp Upscale" subtitle="Enhance resolution and detail in one click." />` (no eyebrow here — keep eyebrow count low). Keep the `lg:grid-cols-[380px_1fr]` split + sticky control panel; card style matches Task 4.

- [ ] **Step 2: Dropzone** — keep all drag/drop + `handleFileUpload` logic. Visual: larger violet-tinted dashed zone, animated upload icon, on `dragover` add `border-primary bg-primary/5` (track a `isDragging` state — pure visual, derived from existing `handleDragOver`/`handleDrop`; add `onDragLeave`). Preview state gets `rounded-2xl` + hover remove button (exists).

- [ ] **Step 3: ImageCompare** — polish the before/after slider: violet handle with grip, larger hit area, labels "Before / After" as small pills, smooth drag. Keep the comparison logic.

- [ ] **Step 4: UpscaleProgress** — same visual language as `GenerationProgress` (rounded-2xl, brand-consistent borders, mono task id). Keep state machine + `ImageCompare` usage.

- [ ] **Step 5: GalleryPicker** — dialog grid hover `ring-primary`, selected check in violet. Keep dialog + select logic.

- [ ] **Step 6: Verify** upload an image (or pick from gallery) → upscale → before/after renders; both themes, 3 widths. `npx tsc --noEmit && npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add app/upscale/page.tsx components/upscale/ImageCompare.tsx components/upscale/UpscaleProgress.tsx components/upscale/GalleryPicker.tsx
git commit -m "feat(ui): overhaul upscale page, dropzone, before/after compare"
```

### Task 7: Gallery overhaul

**Files:**

- Modify: `app/gallery/page.tsx`
- Modify: `components/gallery/GalleryGrid.tsx`
- Modify: `components/gallery/ImageCard.tsx`
- Modify: `components/gallery/UploadsGrid.tsx`

- [ ] **Step 1: Page shell** — `<PageHeader icon={Images} title="Gallery" subtitle="Everything you've generated and uploaded." />`. Tabs (`Generated` / `Uploads`) restyled as a segmented control: `rounded-full bg-muted/60 p-1`, active trigger `bg-card shadow-sm text-foreground`, keep `defaultValue` + values. Keep `metadata` export (server component — Tabs/grids stay client).

- [ ] **Step 2: Grid** — keep SWR infinite (`useSWRInfinite`, `/api/gallery`), `selectionMode`, batch delete, `Load more`. Visual: switch to a CSS masonry feel via `columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3` with `break-inside-avoid` cards, OR keep the responsive square grid but add `Reveal` stagger. Choose masonry for editorial feel; verify infinite-scroll + selection still align. Skeletons match the chosen layout.

- [ ] **Step 3: ImageCard** — `rounded-2xl overflow-hidden`, hover lifts (`-translate-y-0.5`) + violet ring + gradient scrim revealing actions (download / zoom / delete). Selection check in violet. Keep `Dialog` lightbox + all handlers. Lightbox: darker backdrop, image `rounded-xl`, metadata row mono.

- [ ] **Step 4: UploadsGrid** — same card language + masonry; keep upload fetch + single/batch delete logic. Floating batch-delete bar → violet-accented, `motion` slide-up entrance.

- [ ] **Step 5: Empty states** — both grids get the halo + copy composition (consistent with home).

- [ ] **Step 6: Verify** both tabs load, infinite scroll, select + batch delete, lightbox open/close; 3 widths both themes. `npx tsc --noEmit && npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add app/gallery/page.tsx components/gallery/GalleryGrid.tsx components/gallery/ImageCard.tsx components/gallery/UploadsGrid.tsx
git commit -m "feat(ui): overhaul gallery layout, cards, lightbox, empty states"
```

### Task 8: Final pre-flight, copy audit, build

**Files:** any touched above (small fixes only)

- [ ] **Step 1: Copy self-audit** — grep the app for em/en dashes in visible strings and replace with `-`:

```bash
grep -rn $'—\|–' app components | grep -v node_modules
```

Fix every hit (e.g. `GenerationProgress` `15–60`). No `—`/`–` anywhere in UI text.

- [ ] **Step 2: Design-taste pre-flight pass** — verify: one accent across all pages; one radius scale; every CTA passes contrast; reduced-motion collapses all motion; both themes intentional; no fake decorative chips/labels; eyebrow count ≤ 1 per page; nav single-line; no `window.addEventListener('scroll')` used (motion `whileInView`/`useScroll` only).

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: build succeeds, no type errors.

- [ ] **Step 4: Screenshot sweep** — Playwright MCP: `/`, `/upscale`, `/gallery` at 375 / 768 / 1440, light + dark (18 shots). Eyeball for overflow, contrast, alignment.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(ui): copy audit, pre-flight fixes, build verification"
```

---

## Verification (end-to-end)

1. `npm run dev`, log in if required (auth via signed-cookie proxy).
2. **Generate:** fill form, submit, confirm SSE progress → images render, credits refresh.
3. **Upscale:** upload a file and pick from gallery, run upscale, confirm before/after slider.
4. **Gallery:** both tabs load, infinite `Load more`, enter selection mode + batch delete, open lightbox.
5. Toggle theme on every page — both modes intentional, AA contrast.
6. OS reduced-motion ON — all animation collapses to static, nothing breaks.
7. `npx tsc --noEmit`, `npm run lint`, `npm run build` all green.
8. Playwright screenshot sweep at 375 / 768 / 1440, both themes.

## Risks

- **Masonry vs grid in Gallery:** masonry (`columns-*`) can fight with batch-select hit areas and infinite scroll. If alignment breaks, fall back to the existing responsive square grid + `Reveal` stagger (Task 7 Step 2 allows either).
- **`motion` bundle size:** acceptable per user. Keep motion components as `'use client'` leaves; do not wrap large server trees.
- **Next.js 16 specifics:** read `node_modules/next/dist/docs/` before any App Router/font edge cases (per AGENTS.md — this is a modified Next.js).
- **Geist via `next/font/google`:** if the installed Next version lacks Geist in google fonts, self-host `geist` npm package instead (`npm i geist`, import from `geist/font`).
