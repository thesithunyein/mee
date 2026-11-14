// Minimal, dependency-free helpers: Web-Mercator projection to SVG paths, and an "inferno"-style colour ramp.

type Ring = number[][];
type Geom =
  | { type: "Polygon"; coordinates: Ring[] }
  | { type: "MultiPolygon"; coordinates: Ring[][] };

export interface Feature<P> {
  type: "Feature";
  properties: P;
  geometry: Geom | null;
}
export interface FeatureCollection<P> {
  type: "FeatureCollection";
  features: Feature<P>[];
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function polygons(g: Geom): Ring[][] {
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}

/** Returns a function that turns a feature into an SVG path string, fitted to width x height. */
export function fitProjection<P>(fc: FeatureCollection<P>, width: number, height: number, pad = 4) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    for (const poly of polygons(f.geometry))
      for (const ring of poly)
        for (const [lon, lat] of ring) {
          const y = mercY(lat);
          if (lon < minX) minX = lon;
          if (lon > maxX) maxX = lon;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
  }
  const sx = (width - 2 * pad) / ((maxX - minX) * (Math.PI / 180));
  const sy = (height - 2 * pad) / (maxY - minY);
  const s = Math.min(sx, sy);
  const offX = (width - s * (maxX - minX) * (Math.PI / 180)) / 2;
  const offY = (height - s * (maxY - minY)) / 2;
  const px = (lon: number) => offX + s * (lon - minX) * (Math.PI / 180);
  const py = (lat: number) => offY + s * (maxY - mercY(lat));

  return (f: Feature<P>): string => {
    if (!f.geometry) return "";
    let d = "";
    for (const poly of polygons(f.geometry))
      for (const ring of poly) {
        ring.forEach(([lon, lat], i) => {
          d += `${i ? "L" : "M"}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`;
        });
        d += "Z";
      }
    return d;
  };
}

// Inferno colour stops (t = 0..1)
const STOPS: [number, number, number][] = [
  [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85],
  [227, 89, 51], [249, 140, 10], [249, 201, 50], [252, 255, 164],
];

export function inferno(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [STOPS[i], STOPS[i + 1]];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
