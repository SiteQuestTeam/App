import type { Initiative, Reward } from './types';

export const KRAKOW_CENTER = { latitude: 50.06747, longitude: 19.99169 };

export const initiatives: Initiative[] = [
  {
    id: 'tea',
    initiator: 'Maja',
    latitude: 50.06798,
    longitude: 19.99154,
    votes: 9,
    threshold: 10,
    status: 'collecting',
    shortTitle: 'Gorąca herbata na HackYeah',
    marker: '9',
    color: '#2F6BFF',
    distance: '90 m',
    brief: {
      title: 'Stoisko z gorącą herbatą na HackYeah 2026',
      category: 'Społeczeństwo',
      problem: 'Uczestnicy wydarzenia spędzają wiele godzin na miejscu i brakuje prostego, bezpłatnego punktu z ciepłym napojem.',
      proposedAction: 'Uruchomić małe stoisko z gorącą herbatą przy TAURON Arenie podczas HackYeah 2026.',
      whyImportant: 'To prosta inicjatywa, która poprawia komfort uczestników i tworzy naturalny punkt spotkań.',
      resources: { people: '2 osoby na zmianę', equipment: 'termosy, kubki, stół', transport: 'dowóz termosów i wody' },
      fixer: 'Gracze',
      place: 'TAURON Arena Kraków, ul. Stanisława Lema 7',
    },
  },
  {
    id: 'rack',
    initiator: 'Kuba',
    latitude: 50.06662,
    longitude: 19.98872,
    votes: 6,
    threshold: 10,
    status: 'collecting',
    shortTitle: 'Stojak rowerowy przy parku',
    marker: '6',
    color: '#7657FF',
    distance: '260 m',
    brief: {
      title: 'Stojak rowerowy przy wejściu do Parku Lotników',
      category: 'Rowery',
      problem: 'Przy wejściu do parku brakuje miejsca, gdzie można bezpiecznie przypiąć rower.',
      proposedAction: 'Ustawić prosty stojak rowerowy przy głównym wejściu od strony al. Pokoju.',
      whyImportant: 'Ułatwi to mieszkańcom dojazd rowerem i ograniczy przypinanie rowerów do ogrodzeń.',
      resources: { people: 'ekipa montażowa', equipment: 'stojak i kotwy', transport: 'dostawa stojaka' },
      fixer: 'Miasto',
      place: 'Park Lotników Polskich, wejście od al. Pokoju',
    },
  },
  {
    id: 'bench',
    initiator: 'Ola',
    latitude: 50.06912,
    longitude: 19.99425,
    votes: 10,
    threshold: 10,
    status: 'passed',
    shortTitle: 'Ławka przy alejce',
    marker: '✓',
    color: '#24B47E',
    distance: '310 m',
    brief: {
      title: 'Dodatkowa ławka przy alejce spacerowej',
      category: 'Infrastruktura',
      problem: 'Na dłuższym fragmencie alejki nie ma miejsca do odpoczynku.',
      proposedAction: 'Ustawić jedną ławkę przy najbardziej uczęszczanym fragmencie alejki.',
      whyImportant: 'Pomoże seniorom, rodzicom i osobom o ograniczonej mobilności.',
      resources: { people: '2 osoby montażowe', equipment: 'ławka i mocowania', transport: 'transport ławki' },
      fixer: 'Miasto',
      place: 'Czyżyny, alejka spacerowa przy TAURON Arenie',
    },
  },
];

export const rewards: Reward[] = [
  { id: 'coffee', title: 'Kawa dla aktywnych', description: 'Jedna kawa w lokalnej kawiarni.', points: 250, sponsor: 'Kawiarnia Sąsiedzka', icon: 'cafe' },
  { id: 'cinema', title: 'Bilet do kina', description: 'Wejściówka na wybrany seans.', points: 700, sponsor: 'Kino Podgórskie', icon: 'film' },
  { id: 'transport', title: '24h komunikacji', description: 'Demonstracyjna nagroda: dobowy bilet komunikacji.', points: 1000, sponsor: 'Rowerowy Zakątek', icon: 'bus' },
];

export const mockAiQuestions = [
  'Kto najbardziej skorzysta na tej inicjatywie?',
  'Czy do realizacji potrzebna jest zgoda lub infrastruktura miasta?',
  'Jakich ludzi, sprzętu albo transportu potrzeba?',
];
