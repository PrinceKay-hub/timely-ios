// utils/geohash.ts
//
// Direct TypeScript port of the Dart geohash util used on the Flutter
// side. Same algorithm (standard base32 geohash spec), verified to
// produce identical output for the same lat/lon — so it stays
// consistent with whatever generated the `geohash` field already on
// your Firestore docs.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/** Encodes a lat/lon into a geohash string of the given length. */
export function encodeGeohash(
  latitude: number,
  longitude: number,
  precision = 9
): string {
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude > mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude > mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

export interface GeohashBbox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/** Decodes a geohash into its bounding box. */
export function decodeGeohashBbox(geohash: string): GeohashBbox {
  let latMin = -90,
    latMax = 90;
  let lonMin = -180,
    lonMax = 180;
  let isEven = true;

  for (const c of geohash) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) continue;
    for (let n = 4; n >= 0; n--) {
      const bitN = (idx >> n) & 1;
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (bitN === 1) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitN === 1) latMin = mid;
        else latMax = mid;
      }
      isEven = !isEven;
    }
  }
  return { latMin, latMax, lonMin, lonMax };
}

/**
 * Returns the geohash prefixes for the center cell plus its 8
 * neighbors (a 3x3 grid) around (latitude, longitude) at the given
 * precision. Deduplicated.
 */
export function geohashNeighborsAndSelf(
  latitude: number,
  longitude: number,
  precision: number
): Set<string> {
  const center = encodeGeohash(latitude, longitude, precision);
  const bbox = decodeGeohashBbox(center);
  const latSpan = bbox.latMax - bbox.latMin;
  const lonSpan = bbox.lonMax - bbox.lonMin;

  const hashes = new Set<string>();
  for (const dLat of [-1, 0, 1]) {
    for (const dLon of [-1, 0, 1]) {
      const lat = Math.max(-90, Math.min(90, latitude + dLat * latSpan));
      let lon = longitude + dLon * lonSpan;
      if (lon > 180) lon -= 360;
      if (lon < -180) lon += 360;
      hashes.add(encodeGeohash(lat, lon, precision));
    }
  }
  return hashes;
}

/**
 * Rough geohash precision for a search radius, chosen generously
 * (larger cells than strictly needed) since results are always
 * re-filtered by exact Haversine distance afterward.
 */
export function geohashPrecisionForRadiusKm(radiusKm: number): number {
  if (radiusKm > 630) return 2;
  if (radiusKm > 78) return 3;
  if (radiusKm > 20) return 4;
  if (radiusKm > 2.4) return 5;
  if (radiusKm > 0.61) return 6;
  return 7;
}

/** Great-circle distance in km between two lat/lon points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}