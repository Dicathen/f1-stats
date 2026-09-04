<script lang="ts">
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip,
		Legend
	} from 'chart.js';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Tooltip,
		Legend
	);

	interface LapTimeData {
		driver: string;
		lapTimes: number[];
		color: string;
	}

	let { data }: { data: LapTimeData[] } = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	function quantile(sorted: number[], p: number): number {
		if (sorted.length === 0) return NaN;
		if (sorted.length === 1) return sorted[0];
		const pos = (sorted.length - 1) * p;
		const lower = Math.floor(pos);
		const upper = Math.ceil(pos);
		if (lower === upper) return sorted[lower];
		return sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower]);
	}

	/**
	 * A handful of pit and safety-car laps are tens of seconds off the pace and
	 * would flatten every green-flag lap into a straight line, so the axis stops
	 * at the upper Tukey fence and those laps are reported separately.
	 */
	const axisMax = $derived.by(() => {
		const all = data.flatMap((d) => d.lapTimes).sort((a, b) => a - b);
		if (all.length === 0) return undefined;
		const q1 = quantile(all, 0.25);
		const q3 = quantile(all, 0.75);
		return q3 + 1.5 * (q3 - q1);
	});

	const clippedLaps = $derived(
		axisMax === undefined
			? 0
			: data.reduce((sum, d) => sum + d.lapTimes.filter((t) => t > axisMax).length, 0)
	);

	// The longest stint decides the axis; taking driver 0 truncated everyone
	// else whenever the leader retired early.
	const lapCount = $derived(Math.max(0, ...data.map((d) => d.lapTimes.length)));

	$effect(() => {
		if (!canvas) return;

		const chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: Array.from({ length: lapCount }, (_, i) => `Lap ${i + 1}`),
				datasets: data.map((driver) => ({
					label: driver.driver,
					data: [...driver.lapTimes],
					borderColor: driver.color,
					backgroundColor: driver.color,
					tension: 0.3,
					pointRadius: 2,
					pointHoverRadius: 5,
					spanGaps: true
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				scales: {
					y: {
						suggestedMax: axisMax,
						title: { display: true, text: 'Lap Time (s)' }
					},
					x: {
						title: { display: true, text: 'Lap' }
					}
				}
			}
		});

		return () => chart.destroy();
	});
</script>

<Card class="mt-6">
	<CardHeader>
		<CardTitle>Lap Times per Driver</CardTitle>
		<CardDescription>
			Line chart showing lap times for each driver{clippedLaps > 0
				? ` — ${clippedLaps} pit or safety-car ${clippedLaps === 1 ? 'lap sits' : 'laps sit'} above the visible range`
				: ''}
		</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="relative h-80">
			<canvas bind:this={canvas}></canvas>
		</div>
	</CardContent>
</Card>
