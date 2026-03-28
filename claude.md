# CLAUDE.md — Portfolio Project Guide

> **Session rule:** Read this file at the start of every session before making any changes.

---

## Project Overview

A premium portfolio website for a graphic designer / UI-UX designer.
The site feels cinematic, minimal, high-fidelity, and presentation-grade.

**Actual stack:** Vanilla HTML + CSS + JavaScript — single file, no framework, no build step.

---

## Repository Layout

```
portfolio/
├── index.html                   # The entire application (HTML + CSS + JS, ~2154 lines)
├── CLAUDE.md                    # This file
├── Star_Hole_Transition.mp4     # Scroll-driven canvas animation video (4 MB)
├── Star_Static.mp4              # Background loop video — phase 1 (812 KB)
├── BlackHole_Static.mp4         # Background loop video — phase 3 (736 KB)
├── Star_Image.png               # Hero / loader background (688 KB)
├── images/                      # Static images (TiledBackground.png, client logos)
├── Icons/                       # Material Design 48 dp PNG icons (white fill)
└── .claude/
    └── settings.local.json      # Claude Code local permissions
```

---

## Architecture: `index.html` Anatomy

All code lives in three embedded blocks inside `index.html`:

| Block | Lines (approx) | Contents |
|-------|----------------|----------|
| `<style>` | 7 – 1155 | All CSS, organized with ASCII comment dividers |
| HTML body | 1156 – 1840 | Semantic sections |
| `<script>` | 1841 – 2154 | All JavaScript, wrapped in a single IIFE |

### HTML Section Map

| ID / Element | Purpose |
|---|---|
| `#loader` | Full-screen loading overlay with animated progress bar |
| `#nav` | Fixed navigation bar — transparent until scroll |
| `#bg` | Background layer system (3-phase: video → canvas frames → video) |
| `#hero` | Full-viewport hero with rotating role text |
| `#seq1` | Scroll-driven sequence (520 vh) — canvas-rendered video frames |
| `#testimonials` | Client testimonial cards |
| `#features` | Feature highlight banner |
| `#performance` | Animated performance metric bars |
| `#design-section` | Case studies display |
| `#about` | Biography, competencies, and facts |
| `<footer>` | Footer navigation and branding |

---

## CSS System

### Custom Properties (edit these to retheme — do not hardcode values elsewhere)

```css
:root {
  --bg:          #000000;
  --surface:     #0a0a0a;
  --card:        rgba(255,255,255,0.045);
  --card-border: rgba(255,255,255,0.09);
  --text-1:      #f5f5f7;   /* primary text */
  --text-2:      #86868b;   /* secondary text */
  --text-3:      #515154;   /* tertiary / muted */
  --accent:      #0071e3;
  --accent-h:    #0077ed;   /* hover state */
  --font-d:      'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  --font-t:      'SF Pro Text',    -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  --ease:        cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-out:    cubic-bezier(0, 0, 0.2, 1);
}
```

### Naming Conventions

- **CSS classes**: BEM-adjacent with semantic prefixes — `.hero-*`, `.nav-*`, `.card-*`, `.seq-*`, `.perf-*`, `.feat-*`, `.split-*`, `.btn-*`
- **CSS sections**: Delimited by `/* ─── SECTION NAME ─────── */` ASCII comment banners
- **Responsive breakpoints**: `960px` (tablet) and `640px` (mobile)
- **No external stylesheets** — all CSS is in the `<style>` block

---

## JavaScript Architecture

### Structure

All JS is wrapped in one IIFE for scope isolation:

```js
(function () {
  'use strict';
  // …all code here…
}());
```

No modules, no imports, no TypeScript. Global scope is clean.

### Boot Sequence

```
boot()
  └─ extractFrames() × 1   ← extracts Star_Hole_Transition.mp4 into ImageBitmap[]
       └─ startEngine()
            └─ scroll listener → onScroll()
                 ├─ tickNav(sy)
                 ├─ tickBackground(sy)
                 ├─ tickCallouts(sy)
                 ├─ tickDots(sy)
                 └─ tickSeqCallouts(seqEl, sy)
```

### Key Functions

| Function | What it does |
|---|---|
| `extractFrames(src, label, pStart, pSpan)` | Seeks through MP4, draws each frame to offscreen canvas, stores as `ImageBitmap[]` |
| `resizeCanvas()` | Sizes `#bg-canvas` to viewport; redraws current frame |
| `sectionProgress(el, sy)` | Returns `0→1` float for how far through a section the scroll is |
| `tickBackground(sy)` | Swaps bg layers (video → canvas → video) based on scroll phase |
| `tickCallouts(sy)` | Shows/hides floating callout cards during scroll sequence |
| `tickDots(sy)` | Updates progress dot indicators |
| `initReveal()` | `IntersectionObserver` fade-in-up for all `[data-reveal]` elements |
| `initPerfBars()` | Animates performance bars using `--target` CSS custom property |

### State

Minimal — only two explicit state variables:

```js
let frames1  = [];   // Extracted ImageBitmap frames for seq1
let lastIdx1 = -1;   // Currently displayed frame index
```

All other state is managed through DOM class toggling (`.classList.add/remove('on')`) and inline style updates.

### Performance Patterns

- Scroll listener uses `{ passive: true }`
- `IntersectionObserver` for lazy reveal animations
- Canvas rendering via `ImageBitmap` (pre-extracted, GPU-friendly)
- CSS transitions/animations are GPU-accelerated (transform, opacity)

---

## Development Workflow

### Local Development

No build step required. Open the file directly or serve locally:

```bash
# Option 1 — direct file open
open index.html

# Option 2 — local HTTP server (needed for video loading)
python3 -m http.server 8000
# Then open http://localhost:8000
```

Videos require HTTP (not `file://`) due to browser security restrictions.

### Making Changes

- **Edit CSS**: Find the relevant `/* ─── SECTION ─── */` block inside `<style>`, edit in place
- **Edit JS**: Find the relevant comment block inside `<script>`, edit in place
- **Add HTML sections**: Insert before `<footer>`, follow existing section markup patterns
- **Add assets**: Drop in root or `images/`, reference by relative path

### Linting / Testing

No automated tests or linters. Manually verify:
1. Loading overlay completes and fades
2. Scroll sequence plays smoothly
3. Cards appear/disappear at correct scroll positions
4. Layout holds at 960 px and 640 px breakpoints
5. No console errors

---

## Design Philosophy

### Goals

- Dark-mode-first
- Modern, elegant, and polished
- Clear case studies with strong storytelling
- Responsive, accessible, and fast
- Visually refined, never generic

### Aesthetic Direction

Aim for the feeling of a **luxury tech presentation**: precise, stylish, and confident.

Use:
- Sleek dark surfaces
- Strong typography with generous spacing
- Clean grid layouts
- Subtle glow, depth, and gradients
- Calm, premium motion

Avoid:
- Clutter
- Loud neon palettes
- Overdone glassmorphism
- Gimmicky animation
- Template-like design

### UX Rules

- Clarity first — simple navigation, strong hierarchy
- Curated sections, never crowded
- Motion should guide attention, not distract
- Mobile experience must stay elegant and readable

### Visual Rules

- Dark theme by default (all colors via CSS variables)
- Single restrained accent color (`--accent`)
- Premium sans-serif typography (SF Pro stack)
- Large hero sections, polished case study layouts
- No emoji, no inline styles, no generic gradients

---

## Copy Style

Write in a tone that is: **concise, calm, modern, confident, tasteful.**
Avoid buzzwords and generic marketing fluff.
Do not invent fake metrics, clients, or testimonials.

---

## Case Studies

Each case study should show:
- Overview
- Role
- Challenge
- Process
- Final UI
- Outcome

---

## Conventions for AI Assistants

1. **Single-file discipline**: Do not create separate `.css` or `.js` files. All edits go into `index.html`.
2. **Preserve section structure**: Keep the `/* ─── SECTION ─── */` ASCII comment banners intact.
3. **Use CSS variables**: Never hardcode colors, fonts, or easing values — reference `--var` tokens.
4. **Match naming conventions**: camelCase for JS identifiers, kebab-case for CSS classes.
5. **No frameworks**: Do not introduce npm, React, Vue, or any external library.
6. **Self-review checklist** before marking done:
   - [ ] Visually premium and on-brand
   - [ ] Responsive at 960 px and 640 px
   - [ ] No console errors
   - [ ] Scroll interactions work correctly
   - [ ] Accessible (semantic HTML, sufficient contrast)

---

## "Done" Definition

A task is complete only when the result is:
**premium-looking · responsive · accessible · maintainable · visually cohesive · portfolio-worthy**
