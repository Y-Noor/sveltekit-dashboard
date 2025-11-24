<!-- src/lib/components/DashboardCard.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Trash2 } from 'lucide-svelte';
	import Chart from 'chart.js/auto'; // "auto" registers all chart types automatically

	// 1. Props passed from the parent (+page.svelte)
	export let title: string;
	export let type: string; // e.g., 'Bar Chart', 'Line Chart'
	export let onDelete: () => void;

	// 2. Internal State
	let canvasInfo: HTMLCanvasElement;
	let chartInstance: any;

	// 3. Mapping user selection to Chart.js internal types
	const chartTypes: Record<string, string> = {
		'Bar Chart': 'bar',
		'Line Chart': 'line',
		'Pie Chart': 'pie',
		'Area Chart': 'line', // Area is a line chart with 'fill: true'
		'KPI Card': 'bar',     // Fallback
        'Heatmap': 'bar'       // Fallback
	};

	// 4. Initialize Chart on Mount
	onMount(() => {
		if (canvasInfo) {
			const configType = chartTypes[type] || 'bar';
			
            // Generate random dummy data
            const randomData = Array.from({ length: 6 }, () => Math.floor(Math.random() * 100));

			chartInstance = new Chart(canvasInfo, {
				type: configType as any,
				data: {
					labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
					datasets: [{
						label: 'Sales', // Label for the legend
						data: randomData,
						backgroundColor: [
							'rgba(54, 162, 235, 0.6)',
							'rgba(255, 99, 132, 0.6)',
							'rgba(255, 206, 86, 0.6)',
							'rgba(75, 192, 192, 0.6)',
							'rgba(153, 102, 255, 0.6)',
							'rgba(255, 159, 64, 0.6)'
						],
						borderColor: 'rgba(54, 162, 235, 1)',
						borderWidth: 1,
						fill: type === 'Area Chart', // Special logic for Area Chart
                        tension: 0.3 // Smooth curves for lines
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false, // Fits the container
					plugins: {
						legend: { 
                            display: configType === 'pie', // Only show legend for Pie charts
                            position: 'bottom'
                        },
                        title: {
                            display: false // We use our own HTML header for the title
                        }
					}
				}
			});
		}
	});

	// 5. Cleanup to prevent memory leaks
	onDestroy(() => {
		if (chartInstance) {
			chartInstance.destroy();
		}
	});
</script>

<div class="card-wrapper">
	<!-- HEADER: This is the drag handle -->
	<div class="card-header">
		<span class="card-title">{title}</span>
		
		<!-- Delete Button -->
		<button class="delete-btn" on:click={onDelete} title="Remove Widget">
			<!-- Start dragging logic prevents clicking, so we stopPropagation if needed, 
                 but usually simple click works fine here -->
			<Trash2 size={16} />
		</button>
	</div>

	<!-- BODY: The Chart Canvas -->
	<div class="card-body">
		<canvas bind:this={canvasInfo}></canvas>
	</div>
</div>

<style>
	.card-wrapper {
		background: white;
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		border-radius: 8px;
		/* Nice soft shadow */
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		overflow: hidden; 
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 12px;
		background: #f8f9fa;
		border-bottom: 1px solid #eee;
		cursor: move; /* Indicates draggable */
		user-select: none;
	}

	.card-title {
		font-weight: 600;
		font-size: 0.85rem;
		color: #444;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: #ef4444; /* Red */
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.delete-btn:hover {
		background: #fee2e2;
	}

	.card-body {
		flex: 1; /* Takes up remaining height */
		position: relative;
		padding: 10px;
		min-height: 0; /* Critical flexbox fix for charts */
	}
</style>