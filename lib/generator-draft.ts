import { ModelConfig, ModelParameter } from '@/types';
import { MODELS } from './models';

export function buildDefaultValues(
  params: ModelParameter[],
): Record<string, string | number | boolean | string[]> {
  return Object.fromEntries(
    params.map((p) => [
      p.key,
      p.type === 'image-upload'
        ? []
        : (p.default ?? (p.type === 'boolean' ? false : '')),
    ]),
  );
}

export function carryOverValues(
  prevModel: ModelConfig,
  nextModel: ModelConfig,
  prevValues: Record<string, any>,
): Record<string, any> {
  const nextValues: Record<string, any> = {};

  // Find image upload keys
  const prevImageParam = prevModel.parameters.find(
    (p) => p.type === 'image-upload',
  );
  const nextImageParam = nextModel.parameters.find(
    (p) => p.type === 'image-upload',
  );

  const prevImageUrls = prevImageParam
    ? prevValues[prevImageParam.key] || []
    : [];

  for (const param of nextModel.parameters) {
    if (param.type === 'image-upload') {
      nextValues[param.key] = prevImageUrls;
      continue;
    }

    const prevParam = prevModel.parameters.find((p) => p.key === param.key);
    if (prevParam && prevParam.type === param.type) {
      const val = prevValues[param.key];
      // Select & aspect-ratio need to check options validity
      if (
        (param.type === 'select' || param.type === 'aspect-ratio') &&
        param.options
      ) {
        const optionExists = param.options.some((o) => o.value === val);
        nextValues[param.key] = optionExists ? val : (param.default ?? '');
      } else {
        nextValues[param.key] = val;
      }
    } else {
      nextValues[param.key] =
        param.default ?? (param.type === 'boolean' ? false : '');
    }
  }

  return nextValues;
}

export function validateDraft(raw: any): {
  modelId: string;
  values: Record<string, any>;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const { modelId, values } = raw;
  if (typeof modelId !== 'string' || !values || typeof values !== 'object')
    return null;

  const model = MODELS.find((m) => m.id === modelId);
  if (!model) return null;

  const validatedValues: Record<string, any> = {};
  for (const param of model.parameters) {
    const val = values[param.key];
    if (val === undefined) {
      validatedValues[param.key] =
        param.type === 'image-upload'
          ? []
          : (param.default ?? (param.type === 'boolean' ? false : ''));
      continue;
    }

    // Basic type validation
    if (param.type === 'boolean' && typeof val !== 'boolean') {
      validatedValues[param.key] = param.default ?? false;
    } else if (param.type === 'number' && typeof val !== 'number') {
      validatedValues[param.key] = param.default ?? 0;
    } else if (param.type === 'image-upload' && !Array.isArray(val)) {
      validatedValues[param.key] = [];
    } else if (
      (param.type === 'select' || param.type === 'aspect-ratio') &&
      param.options
    ) {
      const optionExists = param.options.some((o) => o.value === val);
      validatedValues[param.key] = optionExists ? val : (param.default ?? '');
    } else {
      validatedValues[param.key] = val;
    }
  }

  return { modelId, values: validatedValues };
}
