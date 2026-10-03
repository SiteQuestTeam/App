export type Role = 'player' | 'ngo';
export type AccountId = 'player-demo' | 'ngo-demo';
export type ScreenName = 'map' | 'discover' | 'team' | 'profile' | 'detail' | 'creator' | 'camera' | 'landing';
export type InitiativeType = 'Misja' | 'Rajd' | 'Szare miejsce' | 'Misja NGO';

export interface Coordinates { latitude: number; longitude: number; }

export interface Initiative {
  id: string; type: InitiativeType; marker: string; color: string; title: string; shortTitle: string;
  distance: string; address: string; district: string; latitude: number; longitude: number; date: string;
  people: number; capacity: number; points: number; organizer: string; description: string; needs: string[]; status: string;
}

export interface MapHtmlOptions { center?: Coordinates; compact?: boolean; }

export type MapBridgeMessage =
  | { type: 'ready' }
  | { type: 'initiative'; id: string }
  | { type: 'position'; longitude: number; latitude: number };
