/**
 * Regenerates src/lib/data/circuits.json — the track outlines drawn on race
 * pages. Run with `npm run build:circuits` after a new circuit joins the
 * calendar; the output is committed, so nothing fetches at build or run time.
 *
 * Outlines come from bacinger/f1-circuits (MIT). That dataset uses its own
 * circuit ids, so each outline is matched to an Ergast/jolpica circuitId by
 * position — every current circuit matches within about a kilometre.
 */
import { writeFile, mkdir } from 'node:fs/promises';

const GEOJSON = 'https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson';
const CIRCUITS = 'https://api.jolpi.ca/ergast/f1/circuits.json?limit=100';
const SOURCE_URL = 'https://github.com/bacinger/f1-circuits';

/** Reproduced verbatim; THIRD-PARTY-NOTICES.md carries the licence in full. */
const NOTICE = [
	'Circuit outlines derived from bacinger/f1-circuits.',
	'Copyright (c) 2019-2025 Tomislav Bacinger. Licensed under the MIT License.',
	'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:',
	'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
	'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'
];
const OUT = new URL('../src/lib/data/circuits.json', import.meta.url);

/** Max distance between a circuit's coordinates and an outline's centre. */
const MATCH_KM = 12;
/** Simplification tolerance, in units of the 1000-wide output box. */
const TOLERANCE = 0.8;
const BOX = 1000;
const PAD = 24;

const rad = (deg) => (deg * Math.PI) / 180;

function haversineKm([lon1, lat1], [lon2, lat2]) {
	const R = 6371;
	const a =
		Math.sin(rad(lat2 - lat1) / 2) ** 2 +
		Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

const centre = (coords) => [
	coords.reduce((s, p) => s + p[0], 0) / coords.length,
	coords.reduce((s, p) => s + p[1], 0) / coords.length
];

/**
 * Longitude degrees shrink towards the poles, so scale them by cos(latitude)
 * or the track comes out stretched sideways. Y is negated because SVG's axis
 * points down.
 */
function project(coords) {
	const k = Math.cos(rad(centre(coords)[1]));
	const points = coords.map(([lon, lat]) => [lon * k, -lat]);

	const xs = points.map((p) => p[0]);
	const ys = points.map((p) => p[1]);
	const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
	const [w, h] = [Math.max(...xs) - minX, Math.max(...ys) - minY];
	const scale = (BOX - 2 * PAD) / Math.max(w, h);

	// Centre the shorter axis so every circuit sits in the same square box.
	return points.map(([x, y]) => [
		(x - minX) * scale + PAD + (BOX - 2 * PAD - w * scale) / 2,
		(y - minY) * scale + PAD + (BOX - 2 * PAD - h * scale) / 2
	]);
}

/** Perpendicular distance from `p` to the segment `a`-`b`. */
function segmentDistance(p, a, b) {
	const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
	const lengthSq = dx * dx + dy * dy;
	const t =
		lengthSq === 0
			? 0
			: Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq));
	return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer-Douglas-Peucker: drops points that do not change the shape. */
function simplify(points, tolerance) {
	if (points.length < 3) return points;

	let index = 0;
	let furthest = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const d = segmentDistance(points[i], points[0], points[points.length - 1]);
		if (d > furthest) [furthest, index] = [d, i];
	}

	if (furthest <= tolerance) return [points[0], points[points.length - 1]];
	return [
		...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
		...simplify(points.slice(index), tolerance)
	];
}

const toPath = (points) =>
	`M${points.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join('L')}Z`;

async function getJson(url) {
	const response = await fetch(url, { headers: { 'User-Agent': 'f1-stats build script' } });
	if (!response.ok) throw new Error(`${response.status} from ${url}`);
	return response.json();
}

const [geo, circuitData] = await Promise.all([getJson(GEOJSON), getJson(CIRCUITS)]);

const outlines = geo.features.map((f) => ({
	name: f.properties.Name,
	length: f.properties.length,
	centre: centre(f.geometry.coordinates),
	coords: f.geometry.coordinates
}));

const circuits = circuitData.MRData.CircuitTable.Circuits;
const result = {};
const unmatched = [];

for (const circuit of circuits) {
	const point = [Number(circuit.Location.long), Number(circuit.Location.lat)];
	let best = null;
	for (const outline of outlines) {
		const km = haversineKm(point, outline.centre);
		if (!best || km < best.km) best = { km, outline };
	}

	if (!best || best.km > MATCH_KM) {
		unmatched.push(circuit.circuitId);
		continue;
	}

	const projected = project(best.outline.coords);
	const simplified = simplify(projected, TOLERANCE);
	result[circuit.circuitId] = {
		path: toPath(simplified),
		// Metres, from the source dataset; `null` where it has none.
		length: best.outline.length ?? null
	};
}

const sorted = Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
await mkdir(new URL('.', OUT), { recursive: true });
await writeFile(
	OUT,
	JSON.stringify(
		{
			// The MIT licence requires its copyright and permission notice to travel
			// with copies and substantial portions. This file is a derivative of the
			// upstream geometry and is served to browsers, so the notice is embedded
			// here rather than living only in the repository.
			_generatedBy: 'scripts/build-circuits.mjs -- do not edit by hand',
			_source: SOURCE_URL,
			_notice: NOTICE,
			viewBox: `0 0 ${BOX} ${BOX}`,
			circuits: sorted
		},
		null,
		'\t'
	) + '\n'
);

const points = (id) => result[id].path.split('L').length;
console.log(`matched   ${Object.keys(result).length}/${circuits.length} circuits`);
console.log(`unmatched ${unmatched.length}: ${unmatched.join(', ')}`);
console.log(
	`points    ${Math.min(...Object.keys(result).map(points))}-${Math.max(...Object.keys(result).map(points))} per circuit`
);
