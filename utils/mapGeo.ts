import ngeohash from 'ngeohash';

export type Provider = {
  id: string;
  name?: string;
  rating?: number;
  geohash?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  location?: string;
  [key: string]: any;
};

export type LngLat = [number, number];
export type Bounds = { north: number; south: number; east: number; west: number };

// Highest geohash length stored on provider docs. Lower it if yours are shorter.
const MAX_PRECISION = 6;
const MAX_CELLS = 30;

// [latDegrees, lngDegrees] per geohash precision
const CELL_SIZE: Record<number, [number, number]> = {
  3: [1.40625, 1.40625],
  4: [0.17578125, 0.3515625],
  5: [0.0439453125, 0.0439453125],
  6: [0.0054931640625, 0.010986328125],
};

export function providerLngLat(p: Provider): LngLat | null {
  if (typeof p.latitude === 'number' && typeof p.longitude === 'number') {
    return [p.longitude, p.latitude];
  }
  if (!p.geohash) return null;
  const { latitude, longitude } = ngeohash.decode(p.geohash);
  return [longitude, latitude];
}

function precisionFor(b: Bounds): number {
  for (let p = MAX_PRECISION; p >= 3; p--) {
    const [dLat, dLng] = CELL_SIZE[p];
    const rows = Math.ceil((b.north - b.south) / dLat) + 1;
    const cols = Math.ceil((b.east - b.west) / dLng) + 1;
    if (rows * cols <= MAX_CELLS) return p;
  }
  return 3;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function steps(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v < to; v += step) out.push(v);
  out.push(to);
  return out;
}

/** Every geohash cell the viewport touches. */
export function cellsFor(b: Bounds): string[] {
  const p = precisionFor(b);
  const [dLat, dLng] = CELL_SIZE[p];
  const south = clamp(b.south, -90, 90);
  const north = clamp(b.north, -90, 90);
  const west = clamp(b.west, -180, 180);
  const east = clamp(b.east, -180, 180);

  const cells = new Set<string>();
  for (const lat of steps(south, north, dLat)) {
    for (const lng of steps(west, east, dLng)) {
      cells.add(ngeohash.encode(lat, lng, p)); // note: lat first
    }
  }
  return [...cells];
}

export function inBounds([lng, lat]: LngLat, b: Bounds): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export function distanceMeters(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// ---- pixel-space helpers (web mercator, MapLibre 512px tiles) ----

/** [lng, lat] to world pixels. The world is 512 * 2^zoom pixels wide. */
function project([lng, lat]: LngLat, zoom: number) {
  const size = 512 * 2 ** zoom;
  const x = ((lng + 180) / 360) * size;
  const s = Math.sin((clamp(lat, -85.05, 85.05) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size;
  return { x, y };
}

/** Inverse of project(): world pixels back to [lng, lat]. */
function unproject(x: number, y: number, zoom: number): LngLat {
  const size = 512 * 2 ** zoom;
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return [lng, lat];
}

type Rect = { l: number; t: number; r: number; b: number };
const overlaps = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/**
 * Where each provider is drawn. Providers whose dots would overlap are fanned out
 * around the best-rated one, which stays on its true spot. Recomputed per zoom, so
 * genuinely different locations separate on their own as you zoom in.
 */
export function spreadPositions(
  providers: Provider[],
  zoom: number,
  gapPx = 16, // dots closer than this overlap
  stepPx = 16, // spacing between fanned-out dots
): Map<string, LngLat> {
  type Item = { id: string; ll: LngLat; x: number; y: number; rating: number };
  const items: Item[] = [];
  for (const p of providers) {
    const ll = providerLngLat(p);
    if (!ll) continue;
    const { x, y } = project(ll, zoom);
    items.push({ id: p.id, ll, x, y, rating: p.rating ?? 0 });
  }
  // stable order (rating, then id) so the layout never reshuffles between renders
  items.sort((a, b) => b.rating - a.rating || (a.id < b.id ? -1 : 1));

  const out = new Map<string, LngLat>();
  const used = new Set<string>();

  for (const lead of items) {
    if (used.has(lead.id)) continue;
    const group = items.filter(
      (o) => !used.has(o.id) && Math.hypot(o.x - lead.x, o.y - lead.y) < gapPx,
    );
    group.forEach((g) => used.add(g.id));
    out.set(lead.id, lead.ll);

    const rest = group.filter((g) => g.id !== lead.id);
    const n = rest.length;
    if (n === 0) continue;

    // up to 8: lower half-circle (the pill sits above the point); more: full circle
    const half = n <= 8;
    const radius = Math.max(
      24,
      half ? (stepPx * (n - 1)) / Math.PI : (stepPx * n) / (2 * Math.PI),
    );
    rest.forEach((m, i) => {
      const theta = half
        ? n === 1
          ? Math.PI / 2
          : (i * Math.PI) / (n - 1)
        : Math.PI / 2 + (i * 2 * Math.PI) / n;
      out.set(
        m.id,
        unproject(lead.x + radius * Math.cos(theta), lead.y + radius * Math.sin(theta), zoom),
      );
    });
  }
  return out;
}

/** Providers that get a rating pill (they fit on screen); the rest stay dots. */
export function computePillIds(
  providers: Provider[],
  selectedId: string | null,
  zoom: number,
  positions?: Map<string, LngLat>,
  maxPills = 60,
): Set<string> {
  // falls back to the true coordinates if positions were not passed
  const pos =
    positions ??
    new Map(
      providers.flatMap((p) => {
        const ll = providerLngLat(p);
        return ll ? [[p.id, ll] as [string, LngLat]] : [];
      }),
    );

  const ordered = [...providers].sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  const taken: Rect[] = [];
  const ids = new Set<string>();

  for (const p of ordered) {
    const ll = pos.get(p.id);
    if (!ll) continue;
    const { x, y } = project(ll, zoom);
    // pill (about 64 wide) + tail (about 38 tall), with breathing room; tail tip sits on the point
    const rect: Rect = { l: x - 36, t: y - 42, r: x + 36, b: y };
    const selected = p.id === selectedId;
    if (selected || (ids.size < maxPills && !taken.some((r) => overlaps(r, rect)))) {
      taken.push(rect);
      ids.add(p.id);
    }
  }
  return ids;
}