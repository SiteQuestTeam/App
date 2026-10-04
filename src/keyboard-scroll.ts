const FOCUSED_FIELD_TOP_GAP = 24;

export function focusedFieldScrollOffset(fieldY: number): number {
  return Math.max(0, fieldY - FOCUSED_FIELD_TOP_GAP);
}
