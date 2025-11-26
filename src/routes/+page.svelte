<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Trash2, RotateCcw, Layers, Plus } from 'lucide-svelte';
	
	// 1. IMPORT STYLES
	import 'gridstack/dist/gridstack.min.css';
	
	// 2. IMPORT COMPONENT
	import DashboardCard from '$lib/components/DashboardCard.svelte';

	// ------------------------------------------
	// 3. DATA CONFIGURATION
	// ------------------------------------------
	type DashboardConfig = Record<string, Record<string, string[]>>;
	type ChartData = Record<string, Record<string, any[]>>; 

	let chartData: ChartData = {}; 
	
	// State variable to hold the sorted leaderboard
	// This is now populated correctly in handleFilter
	let leaderboard_namaaz: any[] = []; 

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
	$: availableMetrics = selectedOffice 
		? Object.keys(dashboardData[selectedOffice] || {}) 
		: [];

	// Level 3 Options: Get the array based on Category AND Metric
	$: availableViz = (selectedOffice && selectedMetric)
		? dashboardData[selectedOffice][selectedMetric] || []
		: [];

    // Reactive Button Text
    $: buttonText = (() => {
        if (!selectedOffice) return 'Sync';
        if (!selectedMetric) return `Sync ${selectedOffice}`;
        return `Sync ${selectedOffice} - ${selectedMetric}`;
    })();

	// 4. HANDLERS
	function handleCategoryChange() {
		selectedMetric = '';
		selectedViz = '';
	}

	function handleMetricChange() {
		selectedViz = '';
	}

	async function handleFilter() {
		if (!selectedOffice || !selectedMetric) {
			alert("Please select a Category, Metric, and Chart Type first.");
			return;
		}

		// 1. Fetch data (Logic updated to unwrap the response)
		const apiResponse = await fetchChartData(selectedOffice, selectedMetric);
		
		console.group("--- Processing Leaderboard ---");
        // 2. Populate Leaderboard
        // We access .stats directly because fetchChartData now unwraps it
		if (apiResponse && apiResponse.stats) {
			leaderboard_namaaz = Object.entries(apiResponse.stats)
				.map(([name, details]: [string, any]) => ({ name, ...details })) 
				.sort((a, b) => (b.total || 0) - (a.total || 0)); // Sort by Total Descending
			
            console.log("🏆 Leaderboard updated:", leaderboard_namaaz);
		} else {
            console.warn("⚠️ Stats missing in response. Leaderboard cleared.");
			leaderboard_namaaz = [];
		}
        console.groupEnd();
	}

	// ------------------------------------------
	// 5. GRIDSTACK LOGIC
	// ------------------------------------------
	let grid: any; 
	let widgets: any[] = []; 

	onMount(async () => {
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

		// Try to get data from cache
		let rawData = chartData[selectedOffice]?.[selectedMetric];

		// If cache is empty, fetch it now
		if (!rawData) {
			console.log("Cache miss, fetching...");
			const response = await fetchChartData(selectedOffice, selectedMetric);
            // We only need the array part for the chart
			rawData = response && response.data ? response.data : [];
		}

		// --- PROCESS DATA ---
		let finalData = null;
		
        if (selectedViz === 'Line Chart') {
			finalData = processForLineChart(rawData);
		} 
		else if (selectedViz === 'Bar Chart') {
			finalData = processForBarChart(rawData);
		} else {
			finalData = rawData; 
		}

		const newWidget = {
			id: `widget-${Date.now()}-${Math.random()}`,
			title: `${selectedMetric} (${selectedOffice})`,
			type: selectedViz,
			x: 0, y: 0, w: 5, h: 4, minH: 3, 
			data: finalData 
		};

		widgets = [...widgets, newWidget];
		
		await tick();
		
		const el = document.getElementById(newWidget.id);
		if (el) grid.makeWidget(el);
	}

	// --- ACTION: SYNC ALL ---
	async function syncAll() {
        const tasks = Object.keys(dashboardData).map(async (office) => {
            const metric = Object.keys(dashboardData[office])[0];
            const viz = dashboardData[office][metric][0];

            const response = await fetchChartData(office, metric);
            const rawData = response && response.data ? response.data : [];
            
            // Process data based on viz type
            const finalData = (viz === 'Bar Chart') ? processForBarChart(rawData) : processForLineChart(rawData);

            return {
                id: `widget-${Date.now()}-${Math.random()}`,
                title: `${metric} (${office})`,
                type: viz,
                x: 0, y: 0, w: 6, h: 6, minH: 3,
                data: finalData
            };
        });

        const newWidgets = await Promise.all(tasks);
        
        widgets = [...widgets, ...newWidgets];

        await tick();
        newWidgets.forEach(w => {
            const el = document.getElementById(w.id);
            if(el) grid.makeWidget(el);
        });
	}

	function clearGrid() {
		grid.removeAll();
		widgets = [];
	}

	function removeWidget(id: string) {
		const el = document.getElementById(id);
		if (el) grid.removeWidget(el, false);
		widgets = widgets.filter(w => w.id !== id);
	}

    // ------------------------------------------
    // 6. DATA FETCHING (FIXED)
    // ------------------------------------------
    async function fetchChartData(office: string, metric: string) {
        try {
            const response = await fetch('/api/syncData', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ office, metric })
            });
            
            const rawResult = await response.json();
            
            // --- FIX: UNWRAP LOGIC ---
            // If the structure is { data: { stats: ..., data: ... } }, we unwrap it.
            const payload = (rawResult.data && rawResult.data.stats) ? rawResult.data : rawResult;

            // Update Cache (Store only the Array part for charts to use)
			if (!chartData[office]) {
				chartData[office] = {};
			}
			chartData[office][metric] = Array.isArray(payload.data) ? payload.data : [];
            
            // Return the full payload so handleFilter can access .stats
            return payload; 

        } catch (e) {
            console.error("Fetch error:", e);
            return null;
        }
    }

    // ------------------------------------------
    // 7. CHART PROCESSORS
    // ------------------------------------------

    const getColors = () => ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    
    const toDateLabel = (dateVal) => {
        if (!dateVal) return null;
        try { return new Date(dateVal).toLocaleDateString(); } 
        catch (e) { return null; }
    };

    function processForBarChart(inputData) {
        // Validation
        if (!inputData) return null;
        let rawData = inputData;
        if (!Array.isArray(inputData) && inputData.data && Array.isArray(inputData.data)) {
            rawData = inputData.data;
        }
        if (!Array.isArray(rawData)) return null;

        // Logic: Count occurrences per date
        const labels = [...new Set(rawData.map(row => toDateLabel(row.Date || row.Column_5)))].sort();
        
        const dataPoints = labels.map(date => {
            const matchingRows = rawData.filter(row => toDateLabel(row.Date || row.Column_5) === date);
            return matchingRows.reduce((sum, row) => {
                if (Array.isArray(row.Presence)) return sum + row.Presence.length;
                return sum + (Number(row.Number_of_Present) || 0);
            }, 0);
        });

        return {
            labels,
            datasets: [{
                label: 'Total Attendance',
                data: dataPoints,
                backgroundColor: getColors(),
                borderWidth: 1
            }]
        };
    }

    function processForLineChart(inputData) {
        // Validation
        if (!inputData) return null;
        let rawData = inputData;
        if (!Array.isArray(inputData) && inputData.data && Array.isArray(inputData.data)) {
            rawData = inputData.data;
        }
        if (!Array.isArray(rawData)) return null;

        const colors = getColors();

        // 1. Extract Dates
        const rawDates = rawData
            .map(row => row.Date || row.Column_5)
            .filter(d => d);
        
        const uniqueLabels = [...new Set(rawDates.map(d => toDateLabel(d)))];
        uniqueLabels.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        // 2. Group by Category
        const groupedByCategory = {};
        rawData.forEach(row => {
            const category = row.Namaaz || 'Unknown';
            if (!groupedByCategory[category]) groupedByCategory[category] = [];
            groupedByCategory[category].push(row);
        });

        // 3. Build Datasets
        const datasets = Object.keys(groupedByCategory).map((category, index) => {
            const dataPoints = uniqueLabels.map(targetDate => {
                const record = groupedByCategory[category].find(row => 
                    toDateLabel(row.Date || row.Column_5) === targetDate
                );

                if (record) {
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

        return { labels: uniqueLabels, datasets };
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