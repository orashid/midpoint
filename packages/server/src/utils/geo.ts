const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeCentroid(points: Array<{ lat: number; lng: number }>) {
  const n = points.length;
  const lat = points.reduce((sum, p) => sum + p.lat, 0) / n;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / n;
  return { lat, lng };
}

export function computeSearchRadius(points: Array<{ lat: number; lng: number }>): number {
  let maxDist = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = haversineDistance(points[i].lat, points[i].lng, points[j].lat, points[j].lng);
      if (d > maxDist) maxDist = d;
    }
  }
  const radiusMeters = maxDist * 1000 * 0.3;
  return Math.max(3000, Math.min(25000, radiusMeters));
}
