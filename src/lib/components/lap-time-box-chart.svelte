<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	
	interface LapTimeData {
		driver: string;
		lapTimes: number[];
		color: string;
	}
	
	let { data }: { data: LapTimeData[] } = $props();
	
	// Calculate statistics for box plot
	function calculateBoxPlotStats(values: number[]) {
		const sorted = [...values].sort((a, b) => a - b);
		const min = sorted[0];
		const max = sorted[sorted.length - 1];
		const median = sorted[Math.floor(sorted.length / 2)];
		const q1 = sorted[Math.floor(sorted.length * 0.25)];
		const q3 = sorted[Math.floor(sorted.length * 0.75)];
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		
		return { min, q1, median, q3, max, mean };
	}
	
	// Calculate stats for all drivers
	const driverStats = $derived(data.map(d => ({
		driver: d.driver,
		color: d.color,
		stats: calculateBoxPlotStats(d.lapTimes)
	})));
	
	// Find global min and max for scaling
	const globalMin = $derived(Math.min(...driverStats.map(d => d.stats.min)));
	const globalMax = $derived(Math.max(...driverStats.map(d => d.stats.max)));
	const range = $derived(globalMax - globalMin);
	
	// Scale function
	function scale(value: number) {
		return ((value - globalMin) / range) * 100;
	}
	
	// Format time in seconds to mm:ss.ms
	function formatTime(seconds: number) {
		const minutes = Math.floor(seconds / 60);
		const secs = (seconds % 60).toFixed(3);
		return `${minutes}:${secs.padStart(6, '0')}`;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Lap Time Distribution</CardTitle>
		<CardDescription>Box plot showing lap time statistics for podium drivers</CardDescription>
	</CardHeader>
	<CardContent>
		<div class="space-y-6">
			{#each driverStats as { driver, color, stats }}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="w-3 h-3 rounded-full" style="background-color: {color}"></div>
							<p class="font-medium text-sm">{driver}</p>
						</div>
						<p class="text-xs text-muted-foreground">Avg: {formatTime(stats.mean)}</p>
					</div>
					
					<!-- Box Plot -->
					<div class="relative h-12 bg-secondary/30 rounded">
						<!-- Min to Max line -->
						<div 
							class="absolute top-1/2 -translate-y-1/2 h-0.5 bg-muted"
							style="left: {scale(stats.min)}%; width: {scale(stats.max) - scale(stats.min)}%"
						></div>
						
						<!-- Box (Q1 to Q3) -->
						<div 
							class="absolute top-1/2 -translate-y-1/2 h-8 rounded border-2"
							style="left: {scale(stats.q1)}%; width: {scale(stats.q3) - scale(stats.q1)}%; background-color: color-mix(in srgb, {color} 40%, transparent); border-color: {color}"
						></div>
						
						<!-- Median line -->
						<div 
							class="absolute top-0 bottom-0 w-0.5"
							style="left: {scale(stats.median)}%; background-color: {color}"
						></div>
						
						<!-- Min marker -->
						<div 
							class="absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded"
							style="left: {scale(stats.min)}%; background-color: {color}"
						></div>
						
						<!-- Max marker -->
						<div 
							class="absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded"
							style="left: {scale(stats.max)}%; background-color: {color}"
						></div>
					</div>
					
					<!-- Stats labels -->
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Min: {formatTime(stats.min)}</span>
						<span>Q1: {formatTime(stats.q1)}</span>
						<span>Med: {formatTime(stats.median)}</span>
						<span>Q3: {formatTime(stats.q3)}</span>
						<span>Max: {formatTime(stats.max)}</span>
					</div>
				</div>
			{/each}
		</div>
		
		<!-- Legend -->
		<div class="mt-6 p-4 bg-muted/50 rounded-lg">
			<p class="text-xs font-medium mb-2">How to read this chart:</p>
			<ul class="text-xs text-muted-foreground space-y-1">
				<li>• The colored box shows the middle 50% of lap times (Q1 to Q3)</li>
				<li>• The line inside the box is the median lap time</li>
				<li>• The whiskers extend to the minimum and maximum lap times</li>
				<li>• Narrower boxes indicate more consistent lap times</li>
			</ul>
		</div>
	</CardContent>
</Card>
