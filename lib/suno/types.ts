export type SunoModel = 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5';

export type SunoStatus =
  | 'PENDING'
  | 'TEXT_SUCCESS'
  | 'FIRST_SUCCESS'
  | 'SUCCESS'
  | 'CREATE_TASK_FAILED'
  | 'GENERATE_AUDIO_FAILED';

/** kie.ai always replies HTTP 200; `code` carries the real status. */
export interface SunoEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export interface SunoTaskRef {
  taskId: string;
}

export interface SunoTrack {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  imageUrl: string | null;
  modelName: string;
}

export interface SunoRecord {
  taskId: string;
  status: SunoStatus;
  errorCode: number | null;
  errorMessage: string | null;
  response: { sunoData: SunoTrack[] | null } | null;
}

export interface GenerateSoundsInput {
  prompt: string;
  model: 'V5' | 'V5_5';
  soundLoop?: boolean;
  soundTempo?: number;
  soundKey?: string;
}

export interface GenerateMusicInput {
  prompt: string;
  model: SunoModel;
  customMode: boolean;
  instrumental: boolean;
  style?: string;
  title?: string;
  duration?: number;
}
