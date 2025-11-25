<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Trash2, RotateCcw, Layers, Plus } from 'lucide-svelte'; // Added icons
	
	// 1. IMPORT STYLES
	import 'gridstack/dist/gridstack.min.css';
	
	// 2. IMPORT COMPONENT
	import DashboardCard from '$lib/components/DashboardCard.svelte';

	// ------------------------------------------
	// 3. DATA CONFIGURATION
	// ------------------------------------------
	type DashboardConfig = Record<string, Record<string, string[]>>;

	type ChartData = Record<string, Record<string, string[]>>; // Define according to your API response structure

	let chartData: ChartData = {}; // State variable to hold fetched chart data

	const dashboardData: DashboardConfig = {
		'Tarbiyyat': {
			'Namaaz': ['Line Chart', 'Bar Chart', 'KPI Card'],
			'Canvassing': ['Table', 'Pie Chart']
		},
		'Users': {
			'Signups': ['Area Chart', 'Line Chart'],
			'Active Now': ['Gauge', 'Big Number']
		},
		'Server': {
			'Uptime': ['Status Indicator'],
			'Errors': ['Log Table', 'Heatmap']
		}
	};

	// 2. STATE VARIABLES
	let selectedOffice = '';
	let selectedMetric = '';
	let selectedViz = '';

	// 3. REACTIVITY & DERIVED STATE

	// Level 2 Options: Get keys of the selected category object
	// We use "?." (optional chaining) just in case selectedOffice is empty
	$: availableMetrics = selectedOffice 
		? Object.keys(dashboardData[selectedOffice] || {}) 
		: [];

	// Level 3 Options: Get the array based on Category AND Metric
	$: availableViz = (selectedOffice && selectedMetric)
		? dashboardData[selectedOffice][selectedMetric] || []
		: [];

	// 4. RESET LOGIC (The Cascade Effect)
	
	// If Category changes -> Reset Metric AND Viz
	// We iterate on 'selectedOffice' variable change
	function handleCategoryChange() {
		selectedMetric = '';
		selectedViz = '';
	}

	// If Metric changes -> Reset Viz only
	function handleMetricChange() {
		selectedViz = '';
	}

	async function handleFilter() {
		if (!selectedOffice || !selectedMetric) {
			alert("Please select a Category, Metric, and Chart Type first.");
			return;
		}

		// 2. Fetch data ONLY for the specified (selected) one
		const apiData = await fetchChartData(selectedOffice, selectedMetric);
		console.log(selectedOffice, selectedMetric, apiData);
	}

    // REACTIVE BUTTON TEXT
    // This logic runs automatically whenever selectedOffice or selectedMetric changes.
    $: buttonText = (() => {
        // Case 1: Nothing selected yet
        if (!selectedOffice) return 'Sync';
        
        // Case 2: Only Category selected (e.g. "Sync Sales")
        if (!selectedMetric) return `Sync ${selectedOffice}`;
        
        // Case 3: Both selected (e.g. "Sync Sales - Revenue")
        // This covers the "Category and the next dropdown" requirement
        return `Sync ${selectedOffice} - ${selectedMetric}`;
    })();
    
	// ------------------------------------------
	// 4. GRIDSTACK LOGIC
	// ------------------------------------------
	let grid: any; 
	let widgets: any[] = []; 

	onMount(async () => {
		// Dynamic Import to fix "window is not defined" error
		const module = await import('gridstack');
		const GridStack = module.GridStack;

		grid = GridStack.init({
			column: 12,
			margin: 10,
			cellHeight: 100,
			minRow: 1,
			float: true,
			draggable: { handle: '.card-header' }
		});
	});

	// --- ACTION: ADD SINGLE WIDGET ---
	async function addWidget() {
		if (!selectedViz) return;

		// --- STEP 1: GET DATA ---
		// Try to get data from the global cache first
		let rawData = chartData[selectedOffice]?.[selectedMetric];

		// If cache is empty, fetch it now
		if (!rawData) {
			console.log("Cache miss, fetching...");
			
			// Save to cache so we don't fetch again
			if (rawData) {
				if (!chartData[selectedOffice]) chartData[selectedOffice] = {};
				chartData[selectedOffice][selectedMetric] = rawData;
			}
		}

		// --- STEP 2: PROCESS DATA ---
		// Convert raw API data into Chart.js format
		let finalData = null;
		console.log("Processing data for:", rawData);
		if (selectedViz === 'Line Chart') {
			finalData = processForLineChart(rawData);
		} else {
			// Fallback for other future charts
			finalData = rawData; 
		}

		console.log("Final processed data:", finalData);

		// --- STEP 3: CREATE WIDGET ---
		const newWidget = {
			id: `widget-${Date.now()}-${Math.random()}`,
			title: `${selectedMetric} (${selectedOffice})`,
			type: selectedViz,
			// I changed w/h to 6 because 3 is usually too small for a line chart
			x: 0, y: 0, w: 4, h: 4, minH: 3, 
			
			// !!! THIS IS THE MISSING PIECE !!!
			data: finalData 
		};
		console.log("Adding widget with data:", newWidget);

		// 4. Update State
		widgets = [...widgets, newWidget];
		
		// 5. Wait for DOM
		await tick();
		
		// 6. Register with GridStack
		const el = document.getElementById(newWidget.id);
		if (el) grid.makeWidget(el);
	}

	// --- ACTION: SYNC ALL (Generates a Dashboard) ---
	async function syncAll() {
        // 1. Prepare list of requests
        // We loop through categories and pick the FIRST metric for each
        const tasks = Object.keys(dashboardData).map(async (office) => {
            
            const metric = Object.keys(dashboardData[office])[0]; // Get 1st metric
            const viz = dashboardData[office][metric][0];         // Get 1st chart type

            // Fetch data for this specific combination
            const apiData = await fetchChartData(office, metric);
			console.log(office, metric, apiData);
            return {
                id: `widget-${Date.now()}-${Math.random()}`,
                title: `${metric} (${office})`,
                type: viz,
                x: 0, y: 0, w: 6, h: 6, minH: 3,
                chartData: apiData
            };
        });

	}

	// --- ACTION: CLEAR GRID ---
	function clearGrid() {
		grid.removeAll(); // Clears GridStack
		widgets = [];     // Clears Svelte State
	}

	// --- ACTION: REMOVE SINGLE ---
	function removeWidget(id: string) {
		const el = document.getElementById(id);
		if (el) grid.removeWidget(el, false);
		widgets = widgets.filter(w => w.id !== id);
	}

 async function fetchChartData(office: string, metric: string) {
        try {
            const response = await fetch('/api/syncData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ office, metric })
            });
            
            const result = await response.json();

			console.log('Fetched data:', result.data);

			if (!chartData[office]) {
				chartData[office] = {};
			}

			chartData[office][metric] = result.data; // Store fetched data in state variable
			console.log('Updated chartData:', chartData);
            
            if (result.success) {
                return result.data;
            } else {
                console.warn(`Failed to fetch for ${office}/${metric}`);
                return null; // Handle empty data gracefully
            }
        } catch (e) {
            console.error(e);
            return null;
        }
    }

	// Helper to generate distinct colors for the lines
const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

function processForLineChart(inputData) {
    console.group("--- Processing Line Chart Data ---");
    
    // 1. SAFEGUARD: Handle "undefined" or "null" inputs
    if (!inputData) {
        console.error("❌ Input data is undefined or null");
        console.groupEnd();
        return null;
    }

    // 2. UNWRAP: If data is inside an object like { data: [...] }, extract it
    let rawData = inputData;
    if (!Array.isArray(inputData) && Array.isArray(inputData.data)) {
        console.log("⚠️ Data was wrapped in an object. Unwrapping now...");
        rawData = inputData.data;
    }

    // 3. VALIDATE: Final check if it is an array
    if (!Array.isArray(rawData)) {
        console.error("❌ CRITICAL: Data is not an array even after unwrapping.", rawData);
        console.groupEnd();
        return null; // <--- THIS IS WHY YOUR DATA WAS NULL
    }

    console.log(`✅ Valid Array Found. Length: ${rawData.length}`);

    // Define Colors
    const colors = ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    // Helper to format date strings
    const toDateLabel = (dateVal) => {
        if (!dateVal) return null;
        try { return new Date(dateVal).toLocaleDateString(); } 
        catch (e) { return null; }
    };

    // 4. EXTRACT DATES (X-AXIS)
    const rawDates = rawData
        .map(row => row.Column_1 || row.Column_5)
        .filter(d => d);
    
    // Sort and Unique
    const uniqueLabels = [...new Set(rawDates.map(d => toDateLabel(d)))];
    uniqueLabels.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // 5. GROUP DATA (Y-AXIS LINES)
    const groupedByCategory = {};
    rawData.forEach(row => {
        const category = row.Column_2 || 'Unknown';
        if (!groupedByCategory[category]) groupedByCategory[category] = [];
        groupedByCategory[category].push(row);
    });

    // 6. BUILD DATASETS
    const datasets = Object.keys(groupedByCategory).map((category, index) => {
        const dataPoints = uniqueLabels.map(targetDate => {
            const record = groupedByCategory[category].find(row => 
                toDateLabel(row.Column_1 || row.Column_5) === targetDate
            );

            if (record) {
                // If 'Presence' is an array, count the people. Else use the number.
                if (Array.isArray(record.Presence)) return record.Presence.length;
                return Number(record.Number_of_Present) || 0;
            }
            return 0;
        });

        return {
            label: category,
            data: dataPoints,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            tension: 0.3,
            fill: false
        };
    });

    const result = { labels: uniqueLabels, datasets };
    console.log("✅ Final Processed Data:", result);
    console.groupEnd();
    
    return result;
}

</script>


<main>
	<div class="dashboard-controls">
		
		<!-- ROW 1: SELECTION INPUTS -->
		<div class="controls-row input-group">
			<select bind:value={selectedOffice} on:change={handleCategoryChange}>
				<option value="" disabled selected>Select Office</option>
				{#each Object.keys(dashboardData) as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<select bind:value={selectedMetric} on:change={handleMetricChange} disabled={!availableMetrics.length}>
				<option value="" disabled selected>
					{selectedOffice ? 'Select Metric' : '...'}
				</option>
				{#each availableMetrics as m}
					<option value={m}>{m}</option>
				{/each}
			</select>

			<select bind:value={selectedViz} disabled={!availableViz.length}>
				<option value="" disabled selected>
					{selectedMetric ? 'Select Chart' : '...'}
				</option>
				{#each availableViz as v}
					<option value={v}>{v}</option>
				{/each}
			</select>
		</div>

		<!-- ROW 2: ACTION BUTTONS -->
		<div class="controls-row button-group">
			
			<!-- BUTTON 1: BUILD SELECTED -->
			<button class="btn-primary" on:click={addWidget} disabled={!selectedViz}>
				<Plus size={18} />
				Build Selected
			</button>

            <!-- SYNC SPECIFIC BUTTON -->
		<button on:click={handleFilter} disabled={"" === selectedOffice}>
    {buttonText}
</button>

			<!-- BUTTON 2: SYNC ALL -->
			<button class="btn-secondary" on:click={syncAll}>
				<Layers size={18} />
				Sync All
			</button>

			<!-- BUTTON 3: CLEAR -->
			<button class="btn-danger" on:click={clearGrid} disabled={widgets.length === 0}>
				<Trash2 size={18} />
				Clear
			</button>

		</div>
	</div>

	<!-- THE GRID -->
	<div class="grid-stack">
		{#each widgets as widget (widget.id)}
			<div 
				class="grid-stack-item" 
				id={widget.id}
				data-gs-x={widget.x} data-gs-y={widget.y}
				gs-w={widget.w} gs-h={widget.h} 
			>
				<div class="grid-stack-item-content">
					<DashboardCard 
						id={widget.id} 
						title={widget.title} 
						type={widget.type} 

						data={widget.data}
						onDelete={() => removeWidget(widget.id)}
					/>
				</div>
			</div>
		{/each}
	</div>
</main>

<style>
	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Segoe UI', sans-serif;
	}

	.dashboard-controls {
		background: white;
		padding: 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.05);
		margin-bottom: 2rem;
		text-align: center;
	}

	h1 { margin-top: 0; color: #333; }

	/* FLEX LAYOUTS */
	.controls-row {
		display: flex;
		gap: 10px;
		justify-content: center;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	/* INPUT STYLING */
	select {
		padding: 0 1rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		height: 45px;
		font-size: 1rem;
		background: #fdfdfd;
		min-width: 150px;
	}

	/* BUTTON STYLING */
	button {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 1.5rem;
		height: 45px;
		font-size: 0.95rem;
		font-weight: 600;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: transform 0.1s, opacity 0.2s;
	}

	button:active { transform: scale(0.98); }

	.btn-primary {
		background: #2563eb;
		color: white;
	}
	.btn-primary:hover { background: #1d4ed8; }
	
	.btn-secondary {
		background: #4f46e5;
		color: white;
	}
	.btn-secondary:hover { background: #4338ca; }

	.btn-danger {
		background: #fee2e2;
		color: #dc2626;
	}
	.btn-danger:hover { background: #fecaca; }

	/* Disabled States */
	button:disabled, select:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	/* GRID STYLING */
	.grid-stack {
		background: #f1f5f9;
		border-radius: 12px;
		border: 2px dashed #cbd5e1;
		min-height: 500px;
	}
	
	.grid-stack-item-content {
		height: 100%;
		width: 100%;
	}
</style>