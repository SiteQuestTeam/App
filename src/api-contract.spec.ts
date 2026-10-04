import type {
  AiStep1Response,
  AiStep2Response,
  KckPreparationInput,
  KckPrepareResponse,
  KckInterestResponse,
  KckSubmitResponse,
} from './api';

// Compile-time contract fixtures mirroring the supported backend responses.
const step1: AiStep1Response = {
  wynik: {
    status: 'ok', danger: null, danger_kind: null, faces_in_background: false,
    retake_reason: null, message: null, duplicate_of: null, type: 'inicjatywa',
    type_locked: false, type_reason: null, category: 'zielen',
    questions: [{ topic: 'dzialanie', question: 'Co chcesz zrobić?', suggestions: ['Posprzątać'] }],
  },
  ostrzezenia: [],
  koszt: { model: 'gpt-6.1-sol', input_tokens: 1, cached_tokens: 0, output_tokens: 1, reasoning_tokens: 0, usd: 0 },
};

const step2: AiStep2Response = {
  wynik: { status: 'brief', unclear_topic: null, follow_up: null, brief: null },
  ostrzezenia: [],
  koszt: { model: 'gpt-6.1-sol', input_tokens: 1, cached_tokens: 0, output_tokens: 1, reasoning_tokens: 0, usd: 0 },
  brief_aplikacji: {
    title: 'Zieleń', category: 'zielen', problem: 'Problem', proposedAction: 'Działanie',
    whyImportant: 'Ważne', resources: { people: '2 osoby', equipment: '', transport: '' }, fixer: 'Gracze',
  },
};

const prepareInput: KckPreparationInput = {
  photoUri: 'file:///photo.jpg', playerId: 'player-1', latitude: 50, longitude: 19,
  line: 'Uszkodzony chodnik', categoryHint: 'DAMAGE',
};

const prepared: KckPrepareResponse = {
  status: 'PREPARED', draftId: 'draft-1', photoUrl: '/kck/incidents/draft-1/photo',
  aiAvailable: true, addressAvailable: true, category: 'DAMAGE', serviceExternalId: '30492-uszkodzenia',
  summary: 'Uszkodzony chodnik', description: 'Opis', address: { streetName: 'Testowa', buildingNumber: '1', zipCode: '30-001' },
  latitude: 50, longitude: 19, nearby: [],
};

const submitted: KckSubmitResponse = {
  status: 'SUBMITTED', incidentId: 'KCK-1', photoUrl: '/kck/incidents/draft-1/photo', pointsGranted: 30, pointsGrantedAt: '2026-10-04T00:00:00.000Z',
};

const interested: KckInterestResponse = {
  status: 'INTEREST', incidentId: 'KCK-1', pointsGranted: 5,
};

void [step1, step2, prepareInput, prepared, submitted, interested];
