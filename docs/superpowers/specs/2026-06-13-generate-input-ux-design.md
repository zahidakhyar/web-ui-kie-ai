# Generate Page — Input UX Improvement

**Date:** 2026-06-13
**Status:** Approved (design)
**Scope:** Input panel of the Generate page (`app/page.tsx` → `components/generator/*`)

## Problem

Switching models on the Generate page wipes the form. Users re-enter the same
inputs (prompt, aspect ratio, uploaded images) even though the new model exposes
the same fields. Root cause: `handleModelChange` in
`components/generator/GeneratorForm.tsx` always calls `buildDefaultValues(...)`,
resetting every value on switch.

Two complications:

1. Image fields use different keys across models (`image_urls`, `input_urls`,
   `image_input`, `image`), so naive key-matching would not carry uploads.
2. `ImageUploadField` keeps its own internal `items` state separate from the
   form `value`, so external resets/changes desync the displayed images.

## Goals

- Preserve compatible input values when switching models.
- Persist the draft (and last selected model) across page reloads.
- Targeted UX polish of the input panel — no full layout redesign.

## Non-Goals

- Redesigning the overall page layout (two-column layout stays).
- Wizard/stepper flow.
- Per-model separate drafts (single shared draft only).
- Adopting react-hook-form / zod / zustand.

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Carry-over scope on model switch | Key-match + smart image-slot mapping + prompt always |
| 2 | Durability | Persist to `localStorage` (values + last model) + Reset button |
| 3 | Visual scope | Behavior fix + targeted UX upgrades (no layout redesign) |

## Architecture

### `hooks/useGeneratorForm.ts` (new)

Single source of truth for `{ modelId, values }`, replacing the scattered
`useState` in `GeneratorForm`. Responsibilities:

- Expose `modelId`, `values`, `setModel(id)`, `setValue(key, value)`, `reset()`,
  and `carriedKeys` (which keys survived the last switch, for the indicator).
- On `setModel`: run carry-over (see below), record carried keys.
- Persist to `localStorage` debounced; hydrate on mount inside `useEffect`
  (avoids SSR hydration mismatch).

Pure logic lives in `lib/generator-draft.ts` so it can be unit-tested without
React.

### `lib/generator-draft.ts` (new, pure)

- `carryOverValues(prevModel, nextModel, prevValues) -> nextValues`
- `buildDefaultValues(params)` (moved from `GeneratorForm`)
- `loadDraft() -> { modelId, values } | null` (parse + validate localStorage)
- `saveDraft(draft)` / `clearDraft()`
- `validateDraft(raw) -> { modelId, values } | null` (drop unknown keys,
  validate option values, confirm model exists)

## Carry-over algorithm (Decision 1)

For each param in `nextModel.parameters`, compute its value:

1. **image-upload** → take images from the (single) image-upload field of
   `prevModel`, regardless of key name. Each model has at most one image slot.
2. **same key + compatible type** in `prevModel` → keep previous value.
   (Naturally handles `prompt`, `nsfw_checker`, etc.)
3. **select / aspect-ratio** → keep previous value only if it still exists in the
   next param's `options`; otherwise fall back to default.
4. **otherwise** → default.

## Persistence (Decision 2)

- Key: `kie:generator:draft`, value `{ modelId, values }`, debounced save.
- On mount: `loadDraft()` → validate (model exists? keys valid? option values
  valid?). Corrupt/invalid → fall back to defaults. Wrapped in try/catch.
- **Reset** button clears the draft and restores defaults for the current model.
- Images are persisted as already-uploaded URLs (output of `/api/upload`).

## Image field fix (Decision, bug)

Refactor `ImageUploadField` to be controlled:

- `value` (array of URLs) is the source of truth for committed images.
- Internal state holds only transient upload progress/previews.
- External `value` changes (model switch, hydrate, reset) reflect immediately.

This makes image carry-over and Reset actually work.

## UX upgrades (Decision 3)

- **Model picker** → searchable combobox (shadcn `command` + `popover`, `cmdk`).
  Keep the description + tags card below it.
- **Required vs advanced params**: non-required params (boolean toggles like
  `nsfw_checker` / `watermark` / `thinking_mode`, `seed`, secondary selects) move
  into a collapsible **"Advanced settings"** (shadcn `collapsible`). Add an
  optional `advanced?: boolean` flag to `ModelParameter`; when absent, classify
  via heuristic: primary = required params + `prompt` + image-upload +
  aspect-ratio; everything else = advanced.
- **Carry-over indicator**: a small one-time note on switch, e.g. "Prompt,
  aspect ratio, gambar dipertahankan."
- **Polish**: hover/focus states; Generate button sticky at the panel bottom
  (outside the scroll region).

## Packages

- `cmdk` + shadcn `command`, `popover` — model combobox.
- `@radix-ui/react-collapsible` (shadcn `collapsible`) — Advanced settings.
- No react-hook-form / zod / zustand.

## Files

**New:** `hooks/useGeneratorForm.ts`, `lib/generator-draft.ts`,
`components/ui/command.tsx`, `components/ui/popover.tsx`,
`components/ui/collapsible.tsx`, tests for `lib/generator-draft.ts`.

**Changed:** `components/generator/GeneratorForm.tsx`,
`components/generator/ModelSelector.tsx`,
`components/generator/ImageUploadField.tsx`,
`components/generator/ParameterField.tsx`, `lib/models.ts`, `types/index.ts`.

## Edge cases

- SSR hydration mismatch → hydrate in `useEffect`.
- Corrupt localStorage → try/catch → defaults.
- Saved model no longer in config → fall back to `DEFAULT_MODEL_ID`.
- Saved select/aspect-ratio value no longer valid → default.
- `disabled` (while generating) state preserved across all controls.

## Testing

Unit tests for `lib/generator-draft.ts`:

- carry-over key-match keeps shared keys
- image-slot mapping carries images across differing keys
- invalid select/aspect-ratio value falls back to default
- `validateDraft` rejects corrupt / unknown-model / invalid-option drafts
- `buildDefaultValues` produces correct empty/default shape
