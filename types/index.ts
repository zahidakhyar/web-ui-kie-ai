export type TaskState = 'waiting' | 'success' | 'fail' | 'pending';

export interface GenerationTask {
  id: number;
  taskId: string;
  model: string;
  prompt: string;
  params: string; // JSON string
  status: TaskState;
  createdAt: number;
  completedAt: number | null;
  errorMsg: string | null;
}

export interface GeneratedImage {
  id: number;
  taskId: string;
  r2Url: string;
  originalUrl: string;
  width: number | null;
  height: number | null;
  createdAt: number;
}

export interface TaskWithImages extends GenerationTask {
  images: GeneratedImage[];
}

// kie.ai API types
export interface KieCreateTaskRequest {
  model: string;
  input: Record<string, unknown>;
  callBackUrl?: string;
}

export interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieTaskRecord {
  taskId: string;
  model: string;
  state: 'waiting' | 'success' | 'fail';
  param: string; // JSON string
  resultJson: string | null; // JSON string: { resultUrls: string[] }
  failCode: string | null;
  failMsg: string | null;
  costTime: number | null;
  completeTime: number | null;
  createTime: number;
}

export interface KieQueryResponse {
  code: number;
  msg: string;
  data: KieTaskRecord;
}

// Model parameter types
export type ParameterType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'boolean'
  | 'aspect-ratio'
  | 'image-upload';

export interface SelectOption {
  label: string;
  value: string;
}

export interface ModelParameter {
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  description?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
  /** For image-upload: maximum number of images allowed */
  maxFiles?: number;
}

export interface ModelConfig {
  id: string; // e.g., "seedream/4.5-text-to-image"
  name: string; // Display name
  description: string;
  provider: string;
  tags?: string[];
  parameters: ModelParameter[];
}
