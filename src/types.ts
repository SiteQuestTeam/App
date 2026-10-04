export type ScreenName = 'signin' | 'map' | 'initiatives' | 'rewards' | 'profile' | 'detail' | 'creator' | 'incident' | 'camera';

export type InitiativeStatus = 'collecting' | 'passed';
export type Fixer = 'Miasto' | 'Gildia' | 'Gracze';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface InitiativeBrief {
  title: string;
  category: string;
  problem: string;
  proposedAction: string;
  whyImportant: string;
  resources: {
    people: string;
    equipment: string;
    transport: string;
  };
  fixer: Fixer;
  place: string;
  photoUri?: string;
}

export interface Initiative {
  id: string;
  initiator: string;
  latitude: number;
  longitude: number;
  votes: number;
  threshold: number;
  status: InitiativeStatus;
  brief: InitiativeBrief;
  shortTitle: string;
  marker: string;
  color: string;
  distance?: string;
  hasVoted?: boolean;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  sponsor: string;
  icon: string;
}

export interface PlayerState {
  nickname: string;
  pointsBalance: number;
  totalPointsEarned: number;
  rank: string;
}

export interface MapHtmlOptions {
  center?: Coordinates;
  compact?: boolean;
}

export type MapBridgeMessage =
  | { type: 'ready' }
  | { type: 'initiative'; id: string }
  | { type: 'anchor'; active: boolean }
  | { type: 'position'; longitude: number; latitude: number };
