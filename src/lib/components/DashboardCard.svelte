<!-- src/lib/components/DashboardCard.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Trash2 } from 'lucide-svelte';
	import Chart from 'chart.js/auto';

	// 1. Props
	export let title: string;
	export let type: string;
	export let onDelete: () => void;
	export let data = null;
    
	// 2. Internal State
	let canvasInfo: HTMLCanvasElement;
	let chartInstance: any;
	
	// Date Range State
	let startDate = '';
	let endDate = '';
	
	// Store the original full data
	let originalData = null;

	const chartTypes: Record<string, string> = {
		'Bar Chart': 'bar',
		'Line Chart': 'line',
		'Pie Chart': 'pie',
		'Area Chart': 'line',
		'KPI Card': 'bar',
		'Heatmap': 'bar',
		'Attendee Leaderboard': 'bar'
	};

	// 4. Initialize Chart on Mount
	onMount(() => {
		if (!data) {
			console.log('No data provided to DashboardCard');
			return;
		}
		
		// 1. Save reference to the full data immediately
		originalData = JSON.parse(JSON.stringify(data));

		// 2. Initialize the Chart Instance FIRST (Empty initially)
		if (canvasInfo) {
			const configType = chartTypes[type] || 'line';
			
			chartInstance = new Chart(canvasInfo, {
				type: configType,
				data: {
					labels: [],
					datasets: []
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					interaction: {
						mode: 'index',
						intersect: false,
					},
					plugins: {
						legend: { 
							display: false,
							position: 'bottom'
						},
						title: {
							display: false
						}
					},
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								precision: 0
							}
						}
					}
				}
			});
		}

		// 3. Set Dates and Filter AFTER the chart instance is created
		if (originalData.labels.length > 0) {
			const today = new Date();
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(today.getDate() - 20);
			
			startDate = sevenDaysAgo.toISOString().split('T')[0];
			endDate = today.toISOString().split('T')[0];
			
			// This will now work because chartInstance exists
			filterChartData();
			filterChartData();
		}
	});

	// 5. Handle date change events
	function handleDateChange() {
		if (chartInstance && originalData && startDate && endDate) {
			filterChartData();
		}
	}

	// 6. Update chart when data prop changes (Reactivity fix)
	$: if (data) {
		// If new data comes in from parent after mount
		originalData = JSON.parse(JSON.stringify(data));
		if (chartInstance && startDate && endDate) {
			filterChartData();
		}
	}

	function filterChartData() {
		// Safety check
		if (!chartInstance || !originalData || !originalData.labels || !originalData.datasets) {
			// This log is now helpful for debugging, but shouldn't trigger on initial load anymore
			console.warn('Cannot filter - waiting for data or instance'); 
			return;
		}
		
		const startOfDay = new Date(startDate);
		startOfDay.setHours(0, 0, 0, 0);
		const startTs = startOfDay.getTime();
		
		const endOfDay = new Date(endDate);
		endOfDay.setHours(23, 59, 59, 999);
		const endTs = endOfDay.getTime();

		const validIndices = [];
		originalData.labels.forEach((dateStr, index) => {
			const dateTs = new Date(dateStr).getTime();
			if (dateTs >= startTs && dateTs <= endTs) {
				validIndices.push(index);
			}
		});

		const newLabels = validIndices.map(i => {
			const date = new Date(originalData.labels[i]);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		});

		const newDatasets = originalData.datasets.map(dataset => {
			return {
				...dataset,
				data: validIndices.map(i => dataset.data[i])
			};
		});

		chartInstance.data.labels = newLabels;
		chartInstance.data.datasets = newDatasets;
		
		if (chartInstance.options.scales && chartInstance.options.scales.y) {
			chartInstance.options.scales.y.min = undefined;
			chartInstance.options.scales.y.max = undefined;
		}
		
		chartInstance.update('resize');
	}

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
			<Trash2 size={16} />
		</button>
	</div>

	<!-- DATE RANGE CONTROLS -->
	<div class="date-controls">
		<label>
			<span>From:</span>
			<input type="date" bind:value={startDate} on:change={handleDateChange} />
		</label>
		<label>
			<span>To:</span>
			<input type="date" bind:value={endDate} on:change={handleDateChange} />
		</label>
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
		cursor: move;
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
		color: #ef4444;
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

	.date-controls {
		display: flex;
		gap: 12px;
		padding: 8px 12px;
		background: #f8f9fa;
		border-bottom: 1px solid #eee;
		font-size: 0.75rem;
	}

	.date-controls label {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #444;
	}

	.date-controls input[type="date"] {
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 4px 6px;
		font-family: inherit;
		font-size: 0.75rem;
		background: white;
	}

	.date-controls input[type="date"]:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.card-body {
		flex: 1;
		position: relative;
		padding: 10px;
		min-height: 0;
	}
</style>