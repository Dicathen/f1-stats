<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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

	export let data: LapTimeData[];

	let canvas: HTMLCanvasElement;
	let chart: Chart;

	onMount(() => {
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: data[0]?.lapTimes.map((_, i) => `Lap ${i + 1}`),
				datasets: data.map((driver) => ({
					label: driver.driver,
					data: driver.lapTimes,
					borderColor: driver.color,
					backgroundColor: driver.color,
					tension: 0.3,
					pointRadius: 2,
					pointHoverRadius: 5
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				scales: {
					y: {
						title: {
							display: true,
							text: 'Lap Time (s)'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Lap'
						}
					}
				}
			}
		});
	});

	onDestroy(() => {
		chart?.destroy();
	});
</script>

<Card class="mt-6">
	<CardHeader>
		<CardTitle>Lap Times per Driver</CardTitle>
		<CardDescription>Line chart showing lap times for each driver</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="relative h-80">
			<canvas bind:this={canvas}></canvas>
		</div>
	</CardContent>
</Card>
