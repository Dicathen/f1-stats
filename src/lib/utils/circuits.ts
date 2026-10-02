import data from '$lib/data/circuits.json';

export interface TrackOutline {
	/** SVG path data, drawn inside `viewBox`. */
	path: string;
	viewBox: string;
	/** Circuit length in metres, or null where the source has none. */
	length: number | null;
}

const circuits: Record<string, { path: string; length: number | null }> = data.circuits;

/**
 * Track outline for an Ergast/jolpica circuitId, or null when there is none.
 *
 * Only circuits in the source dataset are covered: every current venue, but
 * around half of the defunct ones, so callers must handle null.
 */
export function getTrackOutline(circuitId: string | undefined): TrackOutline | null {
	if (!circuitId) return null;
	const circuit = circuits[circuitId];
	if (!circuit) return null;

	return { path: circuit.path, viewBox: data.viewBox, length: circuit.length };
}
