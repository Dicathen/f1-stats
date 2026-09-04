<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	interface LapTimeData {
		driver: string;
		lapTimes: number[];
		color: string;
	}

	let { data }: { data: LapTimeData[] } = $props();

	/** Linear-interpolated quantile (the "R type 7" definition Excel/NumPy use). */
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
	 * Tukey box plot. Pit stops and safety-car laps are 20-40s off the pace; if
	 * the whiskers ran to the true min/max those few laps would compress every
	 * box into an unreadable sliver, so they are split out as outliers instead.
	 */
	function calculateBoxPlotStats(values: number[]) {
		const sorted = [...values].sort((a, b) => a - b);
		const q1 = quantile(sorted, 0.25);
		const median = quantile(sorted, 0.5);
		const q3 = quantile(sorted, 0.75);
		const iqr = q3 - q1;
		const lowerFence = q1 - 1.5 * iqr;
		const upperFence = q3 + 1.5 * iqr;

		const inliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
		const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

		return {
			q1,
			median,
			q3,
			// Whiskers stop at the most extreme lap still inside the fences.
			whiskerLow: inliers[0] ?? sorted[0],
			whiskerHigh: inliers[inliers.length - 1] ?? sorted[sorted.length - 1],
			outliers,
			fastest: sorted[0],
			mean: values.reduce((a, b) => a + b, 0) / values.length
		};
	}

	const driverStats = $derived(
		data.map((d) => ({
			driver: d.driver,
			color: d.color,
			stats: calculateBoxPlotStats(d.lapTimes)
		}))
	);

	// The axis spans the whiskers, not the outliers, so the boxes stay legible.
	const domainMin = $derived(Math.min(...driverStats.map((d) => d.stats.whiskerLow)));
	const domainMax = $derived(Math.max(...driverStats.map((d) => d.stats.whiskerHigh)));
	const domainPad = $derived((domainMax - domainMin) * 0.05 || 0.5);
	const lo = $derived(domainMin - domainPad);
	const hi = $derived(domainMax + domainPad);

	/** Percent position across the plot, clamped so outliers pin to the edges. */
	function scale(value: number) {
		const span = hi - lo;
		if (!Number.isFinite(span) || span <= 0) return 50;
		return Math.min(100, Math.max(0, ((value - lo) / span) * 100));
	}

	const totalOutliers = $derived(driverStats.reduce((sum, d) => sum + d.stats.outliers.length, 0));

	function formatTime(seconds: number) {
		if (!Number.isFinite(seconds)) return '—';
		const minutes = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(3);
		return `${minutes}:${secs.padStart(6, '0')}`;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Lap Time Distribution</CardTitle>
		<CardDescription>
			Box plot showing lap time statistics for podium drivers, excluding pit and safety-car laps
			from the whiskers
		</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="space-y-6">
			{#each driverStats as { driver, color, stats } (driver)}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="h-3 w-3 rounded-full" style="background-color: {color}"></div>
							<p class="text-sm font-medium">{driver}</p>
						</div>
						<p class="text-muted-foreground text-xs">
							Best: {formatTime(stats.fastest)} · Median: {formatTime(stats.median)}
						</p>
					</div>

					<!-- Box Plot -->
					<div class="bg-secondary/30 relative h-12 rounded">
						<!-- Whisker line -->
						<div
							class="bg-muted absolute top-1/2 h-0.5 -translate-y-1/2"
							style="left: {scale(stats.whiskerLow)}%; width: {scale(stats.whiskerHigh) -
								scale(stats.whiskerLow)}%"
						></div>

						<!-- Box (Q1 to Q3) -->
						<div
							class="absolute top-1/2 h-8 -translate-y-1/2 rounded border-2"
							style="left: {scale(stats.q1)}%; width: {scale(stats.q3) -
								scale(
									stats.q1
								)}%; background-color: color-mix(in srgb, {color} 40%, transparent); border-color: {color}"
						></div>

						<!-- Median line -->
						<div
							class="absolute top-0 bottom-0 w-0.5"
							style="left: {scale(stats.median)}%; background-color: {color}"
						></div>

						<!-- Whisker caps -->
						<div
							class="absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded"
							style="left: {scale(stats.whiskerLow)}%; background-color: {color}"
						></div>
						<div
							class="absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded"
							style="left: {scale(stats.whiskerHigh)}%; background-color: {color}"
						></div>

						<!-- Outliers (pit stops, safety cars, traffic) -->
						{#each stats.outliers as outlier, i (i)}
							<div
								class="border-muted-foreground/60 absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
								style="left: {scale(outlier)}%"
								title="Outlier lap: {formatTime(outlier)}"
							></div>
						{/each}
					</div>

					<!-- Stats labels -->
					<div class="text-muted-foreground flex items-center justify-between text-xs">
						<span>Low: {formatTime(stats.whiskerLow)}</span>
						<span>Q1: {formatTime(stats.q1)}</span>
						<span>Med: {formatTime(stats.median)}</span>
						<span>Q3: {formatTime(stats.q3)}</span>
						<span>High: {formatTime(stats.whiskerHigh)}</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="bg-muted/50 mt-6 rounded-lg p-4">
			<p class="mb-2 text-xs font-medium">How to read this chart:</p>
			<ul class="text-muted-foreground space-y-1 text-xs">
				<li>• The colored box shows the middle 50% of lap times (Q1 to Q3)</li>
				<li>• The line inside the box is the median lap time</li>
				<li>• Whiskers reach the fastest and slowest laps within 1.5×IQR of the box</li>
				<li>• Hollow dots are outliers — usually pit stops, safety cars or traffic</li>
				<li>• Narrower boxes indicate more consistent lap times</li>
			</ul>
			{#if totalOutliers > 0}
				<p class="text-muted-foreground mt-2 text-xs">
					{totalOutliers}
					{totalOutliers === 1 ? 'lap falls' : 'laps fall'} outside the whiskers and may sit at the plot
					edge.
				</p>
			{/if}
		</div>
	</CardContent>
</Card>
