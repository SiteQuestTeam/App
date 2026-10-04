export function preparationCopy(hasCoordinates: boolean) {
  return hasCoordinates
    ? {
        title: 'Analizuję zdjęcie…',
        description: 'AI przygotowuje kategorię i opis, a serwer sprawdza adres oraz podobne Usterki.',
      }
    : {
        title: 'Ustalam lokalizację…',
        description: 'GPS jest potrzebny, aby przygotować szkic zgłoszenia KCK.',
      };
}
