import { test } from 'node:test';
import assert from 'node:assert';
import {
  buildDefaultValues,
  carryOverValues,
  validateDraft,
} from './generator-draft';
import { MODELS } from './models';

test('buildDefaultValues builds correct defaults for SeeDream text-to-image', () => {
  const model = MODELS.find((m) => m.id === 'seedream/4.5-text-to-image')!;
  const defaults = buildDefaultValues(model.parameters);
  assert.strictEqual(defaults.prompt, '');
  assert.strictEqual(defaults.aspect_ratio, '1:1');
  assert.strictEqual(defaults.nsfw_checker, false);
});

test('carryOverValues retains identical keys and maps images', () => {
  const prevModel = MODELS.find((m) => m.id === 'seedream/4.5-edit')!;
  const nextModel = MODELS.find((m) => m.id === 'wan/2-7-image')!;
  const prevValues = {
    image_urls: ['https://example.com/img1.png'],
    prompt: 'A beautiful scenery',
    aspect_ratio: '16:9',
    quality: 'high',
    nsfw_checker: true,
  };

  const nextValues = carryOverValues(prevModel, nextModel, prevValues);

  // Prompt and aspect ratio match keys
  assert.strictEqual(nextValues.prompt, 'A beautiful scenery');
  assert.strictEqual(nextValues.aspect_ratio, '16:9');
  // image_urls (5 files) maps to input_urls (5 files)
  assert.deepEqual(nextValues.input_urls, ['https://example.com/img1.png']);
  // quality is discarded (not in Wan)
  assert.strictEqual(nextValues.quality, undefined);
  // seed falls back to default 0
  assert.strictEqual(nextValues.seed, 0);
});

test('carryOverValues validates aspect ratio options', () => {
  const prevModel = MODELS.find((m) => m.id === 'wan/2-7-image')!;
  const nextModel = MODELS.find((m) => m.id === 'seedream/4.5-text-to-image')!;
  const prevValues = {
    prompt: 'A beautiful scenery',
    aspect_ratio: '8:1', // Option exists in Wan but not in SeeDream
  };

  const nextValues = carryOverValues(prevModel, nextModel, prevValues);

  assert.strictEqual(nextValues.prompt, 'A beautiful scenery');
  assert.strictEqual(nextValues.aspect_ratio, '1:1'); // Default value for SeeDream
});

test('validateDraft rejects corrupt drafts and sanitizes inputs', () => {
  assert.strictEqual(validateDraft(null), null);
  assert.strictEqual(validateDraft({}), null);
  assert.strictEqual(validateDraft({ modelId: 'nonexistent-model', values: {} }), null);

  const rawDraft = {
    modelId: 'seedream/4.5-text-to-image',
    values: {
      prompt: 12345, // invalid type, should be kept as-is or sanitized
      aspect_ratio: 'invalid-ratio', // should fallback to default
      nsfw_checker: 'yes', // should fallback to default
      unknown_key: 'will-be-dropped',
    },
  };

  const validated = validateDraft(rawDraft);
  assert.ok(validated);
  assert.strictEqual(validated.modelId, 'seedream/4.5-text-to-image');
  assert.strictEqual(validated.values.aspect_ratio, '1:1'); // fell back to default
  assert.strictEqual(validated.values.nsfw_checker, false); // fell back to default
  assert.strictEqual(validated.values.unknown_key, undefined); // dropped
});
