<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	
	let { children } = $props();
	
	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/drivers', label: 'Drivers' },
		{ href: '/races', label: 'Races' }
	];
</script>

<div class="min-h-screen bg-background">
	<header class="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
		<nav class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="flex items-center gap-2 text-2xl font-bold">
					<div class="w-8 h-8 bg-primary rounded flex items-center justify-center">
						<span class="text-primary-foreground font-mono">F1</span>
					</div>
					<span class="text-foreground">Stats</span>
				</a>
				
				<ul class="flex items-center gap-6">
					{#each navLinks as link}
						<li>
							<a 
								href={link.href}
								class="text-sm font-medium transition-colors hover:text-primary {$page.url.pathname === link.href ? 'text-primary' : 'text-muted-foreground'}"
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		</nav>
	</header>
	
	<main class="container mx-auto px-4 py-8">
		{@render children()}
	</main>
	
	<footer class="border-t border-border mt-16 py-8">
		<div class="container mx-auto px-4 text-center text-sm text-muted-foreground">
			<p>F1 Stats - Formula 1 statistics and data</p>
		</div>
	</footer>
</div>
