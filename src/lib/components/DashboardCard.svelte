<!-- src/lib/components/DashboardCard.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Trash2 } from 'lucide-svelte';
	import Chart from 'chart.js/auto';

	// 1. Props passed from the parent (+page.svelte)
	export let title: string;
	export let type: string;
	export let onDelete: () => void;
	export let data = null;
    
	console.log("DashboardCard received data:", data);
	
	// 2. Internal State
	let canvasInfo: HTMLCanvasElement;
	let chartInstance: any;
	
	// Date Range State
	let startDate = '';
	let endDate = '';
	
	// Store the original full data
	let originalData = null;

	// 3. Mapping user selection to Chart.js internal types
	const chartTypes: Record<string, string> = {
		'Bar Chart': 'bar',
		'Line Chart': 'line',
		'Pie Chart': 'pie',
		'Area Chart': 'line',
		'KPI Card': 'bar',
		'Heatmap': 'bar',
		'Attendee Leaderboard': 'bar'
	};

	const parseDate = (str) => new Date(str).getTime();

	// 4. Initialize Chart on Mount
	onMount(() => {
		if (!data) {
			console.log('No data provided to DashboardCard');
			return;
		}
		
		console.log('Initializing chart with data:', data);
		
		// Save reference to the full data
		originalData = JSON.parse(JSON.stringify(data));

		if (originalData.labels.length > 0) {
			// Set default to last 7 days
			const today = new Date();
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(today.getDate() - 7);
			
			// Format to YYYY-MM-DD for input fields
			startDate = sevenDaysAgo.toISOString().split('T')[0];
			endDate = today.toISOString().split('T')[0];
			
			// Apply initial filter
			filterChartData();
		}

		if (canvasInfo) {
			const configType = chartTypes[type] || 'line';
			
			// Start with empty chart - will be populated by filterChartData
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
	});

	// 5. Handle date change events
	function handleDateChange() {
		if (chartInstance && originalData && startDate && endDate) {
			filterChartData();
		}
	}

	// 6. Update chart when data prop changes
	$: if (chartInstance && data && !originalData) {
		chartInstance.data = data;
		chartInstance.update();
	}

	function filterChartData() {
		if (!chartInstance || !originalData || !originalData.labels || !originalData.datasets) {
			console.log('Cannot filter - missing data:', { chartInstance, originalData });
			return;
		}
		
		// Create new Date objects to avoid mutation issues
		const startOfDay = new Date(startDate);
		startOfDay.setHours(0, 0, 0, 0);
		const startTs = startOfDay.getTime();
		
		const endOfDay = new Date(endDate);
		endOfDay.setHours(23, 59, 59, 999);
		const endTs = endOfDay.getTime();

		console.log('Filtering from', startDate, 'to', endDate);
		console.log('Start timestamp:', startTs, 'End timestamp:', endTs);

		// Find indices of labels that fall within the range
		const validIndices = [];
		originalData.labels.forEach((dateStr, index) => {
			const dateTs = new Date(dateStr).getTime();
			console.log('Checking date:', dateStr, 'timestamp:', dateTs);
			if (dateTs >= startTs && dateTs <= endTs) {
				validIndices.push(index);
			}
		});

		console.log('Valid indices:', validIndices);

		// Filter Labels and convert to DD/MM/YYYY format
		const newLabels = validIndices.map(i => {
			const date = new Date(originalData.labels[i]);
			const day = String(date.getDate()).padStart(2, '0');
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const year = date.getFullYear();
			return `${day}/${month}/${year}`;
		});

		// Filter Data within each Dataset
		const newDatasets = originalData.datasets.map(dataset => {
			return {
				...dataset,
				data: validIndices.map(i => dataset.data[i])
			};
		});

		console.log('New labels:', newLabels);
		console.log('New datasets:', newDatasets);

		// Update Chart with new data
		chartInstance.data.labels = newLabels;
		chartInstance.data.datasets = newDatasets;
		
		// Force recalculation of scales
		if (chartInstance.options.scales && chartInstance.options.scales.y) {
			chartInstance.options.scales.y.min = undefined;
			chartInstance.options.scales.y.max = undefined;
		}
		
		// Update with animation mode 'resize' to recalculate scales
		chartInstance.update('resize');
	}

	// 7. Cleanup to prevent memory leaks
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