import { Platform } from 'react-native';
import type { Coordinates, Initiative, KckIncidentDraft, PlayerState, Reward } from './types';

declare const process: { env: Record<string, string | undefined> };

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://api.site-quest.pl').replace(/\/+$/, '');

export type AiTopic = 'dzialanie' | 'zasoby';

export interface AiQuestion {
  topic: AiTopic;
  question: string;
  suggestions: string[];
}

export interface AiCost {
  model: string;
  input_tokens: number;
  cached_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  usd: number;
}

export interface AiStep1Response {
  wynik: {
    status: 'ok' | 'nowe_zdjecie' | 'niezrozumiale' | 'nie_widac_usterki' | 'opisz_zmiane';
    danger: string | null;
    danger_kind: 'energia' | 'inne' | null;
    faces_in_background: boolean;
    retake_reason: string | null;
    message: string | null;
    duplicate_of: string | null;
    type: 'usterka' | 'inicjatywa' | null;
    type_locked: boolean;
    type_reason: string | null;
    category: string | null;
    questions: AiQuestion[];
  };
  ostrzezenia: string[];
  koszt: AiCost;
}

export interface AiInitiativeBrief {
  title: string;
  category: string;
  problem: string;
  proposedAction: string;
  whyImportant: string;
  resources: { people: string; equipment: string; transport: string };
  fixer: 'Miasto' | 'Gracze';
}

export interface AiStep2Response {
  wynik: {
    status: 'brief' | 'niezrozumiale' | 'pytanie_zwrotne';
    unclear_topic: AiTopic | null;
    follow_up: string | null;
    brief: unknown | null;
  };
  ostrzezenia: string[];
  koszt: AiCost;
  brief_aplikacji: AiInitiativeBrief | null;
}

export type KckPrepareResponse =
  | { status: 'RETAKE'; reason: string; message: string }
  | {
      status: 'PREPARED';
      draftId: string;
      photoUrl: string;
      aiAvailable: boolean;
      addressAvailable: boolean;
      category: import('./types').KckCategory | null;
      serviceExternalId: number | null;
      summary: string | null;
      description: string | null;
      address: { streetName: string; buildingNumber: string; zipCode: string } | null;
      latitude: number;
      longitude: number;
      nearby: Array<{
        id: string;
        category: import('./types').KckCategory | null;
        summary: string | null;
        description: string | null;
        photoUrl: string;
        distanceM: number;
        reportedAt: string;
      }>;
    };

export interface KckSubmitResponse {
  status: 'SUBMITTED';
  incidentId: string | null;
  mock: boolean;
  photoUrl: string;
  pointsGranted: number;
  pointsGrantedAt: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const absoluteUrl = (value?: string) => {
  if (!value) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith('file:') || value.startsWith('blob:') || value.startsWith('data:')) return value;
  return `${API_BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    const raw = payload?.message;
    const message = Array.isArray(raw)
      ? raw.join('\n')
      : typeof raw === 'string'
        ? raw
        : `Błąd API (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function json<T>(path: string, method: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function appendImage(form: FormData, field: string, uri: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, 'photo.jpg');
    return;
  }

  form.append(field, {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as any);
}

async function photoBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nie udało się odczytać zdjęcia.'));
    reader.onloadend = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.readAsDataURL(blob);
  });
}

function normalizeInitiative(raw: any): Initiative {
  return {
    ...raw,
    color: raw.status === 'passed' ? '#24B47E' : '#2F6BFF',
    distance: Number.isFinite(raw.distanceM) ? `~${Math.round(raw.distanceM)} m` : undefined,
    brief: {
      ...raw.brief,
      photoUri: absoluteUrl(raw.brief?.photoUri),
    },
  };
}

export async function createSession(nickname: string): Promise<PlayerState> {
  return json<PlayerState>('/players/session', 'POST', { nickname });
}

export async function getPlayer(playerId: string): Promise<PlayerState> {
  return request<PlayerState>(`/players/${encodeURIComponent(playerId)}`);
}

export async function listInitiatives(
  playerId: string,
  coordinates?: Coordinates | null,
): Promise<Initiative[]> {
  const params = new URLSearchParams();
  if (playerId) params.set('playerId', playerId);
  if (coordinates) {
    params.set('latitude', String(coordinates.latitude));
    params.set('longitude', String(coordinates.longitude));
  }
  const query = params.toString();
  const result = await request<any[]>(`/initiatives${query ? `?${query}` : ''}`);
  return result.map(normalizeInitiative);
}

export async function voteInitiative(
  initiativeId: string,
  playerId: string,
  coordinates: Coordinates,
) {
  const result = await json<any>(`/initiatives/${encodeURIComponent(initiativeId)}/votes`, 'POST', {
    playerId,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  return {
    ...result,
    initiative: normalizeInitiative(result.initiative),
    player: result.player as PlayerState,
  };
}

export async function listRewards(): Promise<Reward[]> {
  return request<Reward[]>('/rewards');
}

export async function redeemReward(rewardId: string, playerId: string) {
  return json<{ reward: Reward; player: PlayerState }>(
    `/rewards/${encodeURIComponent(rewardId)}/redeem`,
    'POST',
    { playerId },
  );
}

export async function uploadInitiativePhoto(uri: string): Promise<string> {
  const form = new FormData();
  await appendImage(form, 'file', uri);
  const result = await request<{ photoUri: string }>('/photos', {
    method: 'POST',
    body: form,
  });
  return result.photoUri;
}

export async function createInitiative(input: {
  playerId: string;
  latitude: number;
  longitude: number;
  title: string;
  shortTitle?: string;
  category: string;
  problem: string;
  proposedAction: string;
  whyImportant: string;
  resources: { people: string; equipment: string; transport: string };
  fixer: string;
  place: string;
  photoUri?: string;
}) {
  const result = await json<any>('/initiatives', 'POST', input);
  return {
    initiative: normalizeInitiative(result.initiative),
    player: result.player as PlayerState,
  };
}

export async function aiStep1(
  uri: string,
  data: {
    linia_gracza: string;
    adres: string;
    dzielnica: string;
    zgloszenia_w_poblizu: unknown[];
    ostatnie_briefy_gracza: unknown[];
  },
): Promise<AiStep1Response> {
  return json<AiStep1Response>('/ai/krok-1', 'POST', {
    zdjecie: await photoBase64(uri),
    dane: data,
  });
}

export async function aiStep2(
  uri: string,
  data: {
    kategoria: string | null;
    linia_gracza: string;
    odpowiedzi: Array<{ temat: 'dzialanie' | 'zasoby'; pytanie: string; odpowiedz: string }>;
    pytanie_zwrotne_juz_zadane: boolean;
    odpowiedz_na_pytanie_zwrotne: string;
    adres: string;
    dzielnica: string;
  },
): Promise<AiStep2Response> {
  return json<AiStep2Response>('/ai/krok-2', 'POST', {
    zdjecie: await photoBase64(uri),
    dane: data,
  });
}

export async function prepareKck(
  photoUri: string,
  playerId: string,
  coordinates: Coordinates,
): Promise<KckPrepareResponse> {
  const form = new FormData();
  await appendImage(form, 'file', photoUri);
  form.append('latitude', String(coordinates.latitude));
  form.append('longitude', String(coordinates.longitude));
  form.append('playerId', playerId);
  return request<KckPrepareResponse>('/kck/prepare', { method: 'POST', body: form });
}

export async function submitKck(draftId: string, draft: KckIncidentDraft): Promise<KckSubmitResponse> {
  const submissionId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return json<KckSubmitResponse>('/kck/submit', 'POST', {
    draftId,
    submissionId,
    category: draft.category,
    summary: draft.summary,
    description: draft.description,
    streetName: draft.streetName,
    buildingNumber: draft.buildingNumber,
    zipCode: draft.zipCode,
  });
}
