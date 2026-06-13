import { useState, useEffect } from 'react';
import { DEFAULT_MODEL_ID, getModelById } from '@/lib/models';
import {
  buildDefaultValues,
  carryOverValues,
  validateDraft,
} from '@/lib/generator-draft';

const LOCAL_STORAGE_KEY = 'kie:generator:draft';

export function useGeneratorForm() {
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [values, setValues] = useState<Record<string, any>>({});
  const [carriedKeys, setCarriedKeys] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Initial load / hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validated = validateDraft(parsed);
        if (validated) {
          setModelId(validated.modelId);
          setValues(validated.values);
          setHydrated(true);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load draft from localStorage', e);
    }

    // Fallback to defaults
    const defaultModel = getModelById(DEFAULT_MODEL_ID)!;
    setValues(buildDefaultValues(defaultModel.parameters));
    setHydrated(true);
  }, []);

  // Save changes to localStorage (debounced)
  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ modelId, values }),
      );
    }, 500);
    return () => clearTimeout(timeout);
  }, [modelId, values, hydrated]);

  function setModel(id: string) {
    const prevModel = getModelById(modelId);
    const nextModel = getModelById(id);
    if (!prevModel || !nextModel) return;

    const carried: string[] = [];
    const nextValues = carryOverValues(prevModel, nextModel, values);

    // Find what was carried over
    const prevImageParam = prevModel.parameters.find(
      (p) => p.type === 'image-upload',
    );
    const nextImageParam = nextModel.parameters.find(
      (p) => p.type === 'image-upload',
    );

    for (const param of nextModel.parameters) {
      if (param.type === 'image-upload' && prevImageParam) {
        const prevImages = values[prevImageParam.key] || [];
        if (prevImages.length > 0) {
          carried.push(param.label);
        }
        continue;
      }

      const prevParam = prevModel.parameters.find((p) => p.key === param.key);
      if (prevParam && prevParam.type === param.type) {
        const val = values[param.key];
        if (val !== undefined && val !== '' && val !== false) {
          carried.push(param.label);
        }
      }
    }

    setModelId(id);
    setValues(nextValues);
    setCarriedKeys(carried);
  }

  function setValue(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    const model = getModelById(modelId);
    if (model) {
      setValues(buildDefaultValues(model.parameters));
      setCarriedKeys([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  return {
    modelId,
    values,
    setModel,
    setValue,
    reset,
    carriedKeys,
    setCarriedKeys, // Allow clearing indicator manually
    hydrated,
  };
}
