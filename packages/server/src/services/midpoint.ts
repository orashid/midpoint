import { Participant, Restaurant, ParticipantDistance } from '@midpoint/shared';
import { computeCentroid, computeSearchRadius } from '../utils/geo';
import { distanceMatrix } from './google-maps';

export function calculateMidpoint(participants: Participant[]) {
  const centroid = computeCentroid(participants);
  const radius = computeSearchRadius(participants);
  return { centroid, radius };
}

export async function scoreRestaurants(
  participants: Participant[],
  candidates: Array<{ placeId: string; name: string; lat: number; lng: number; rating: number; priceLevel: number; photoUrl: string | null; phone: string | null; address: string; types: string[] }>
): Promise<Restaurant[]> {
  if (candidates.length === 0) return [];

  const origins = participants.map((p) => ({ lat: p.lat, lng: p.lng }));
  const destinations = candidates.map((c) => ({ lat: c.lat, lng: c.lng }));

  const rows = await distanceMatrix(origins, destinations);

  const scored: Array<{ restaurant: Restaurant; score: number }> = [];

  for (let j = 0; j < candidates.length; j++) {
    const distances: ParticipantDistance[] = [];
    let valid = true;

    for (let i = 0; i < participants.length; i++) {
      const element = rows[i]?.elements?.[j];
      if (!element || element.status !== 'OK') {
        valid = false;
        break;
      }
      distances.push({
        participantName: participants[i].name,
        distanceText: element.distance.text,
        durationText: element.duration.text,
        durationMinutes: element.duration.value / 60,
      });
    }

    if (!valid) continue;

    const durations = distances.map((d) => d.durationMinutes);
    if (durations.length === 0) continue;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const fairness = maxDuration - minDuration;

    const rating = candidates[j].rating || 3;
    const score = fairness * 2 + avgDuration * 0.5 - rating * 3;

    scored.push({
      restaurant: {
        ...candidates[j],
        distancesFromParticipants: distances,
      },
      score,
    });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.restaurant);
}
