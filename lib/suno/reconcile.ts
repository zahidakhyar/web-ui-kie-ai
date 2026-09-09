import type { SunoRecord, SunoStatus, SunoTrack } from './types';

export type ReconcileOutcome =
  | { kind: 'pending' }
  | { kind: 'failed'; errorMsg: string }
  | { kind: 'succeeded'; tracks: SunoTrack[] };

const IN_FLIGHT: SunoStatus[] = ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'];

export function reconcile(record: SunoRecord): ReconcileOutcome {
  if (IN_FLIGHT.includes(record.status)) return { kind: 'pending' };

  if (record.status === 'SUCCESS') {
    const tracks = record.response?.sunoData ?? [];
    if (tracks.length === 0) {
      return { kind: 'failed', errorMsg: 'Suno reported SUCCESS but returned no tracks.' };
    }
    return { kind: 'succeeded', tracks };
  }

  return { kind: 'failed', errorMsg: record.errorMessage ?? record.status };
}
