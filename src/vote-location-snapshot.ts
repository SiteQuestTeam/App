export const MAX_VOTE_LOCATION_AGE_MS = 5_000;

type LocationLike = { timestamp: number; coords: unknown };

export function captureVoteLocation<T extends LocationLike>(
  location: T | null | undefined,
  now = Date.now(),
): T | null {
  if (!location || now - location.timestamp > MAX_VOTE_LOCATION_AGE_MS) return null;
  return location;
}
