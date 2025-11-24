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
	let selectedCategory = '';
	let selectedMetric = '';
	let selectedViz = '';

	// 3. REACTIVITY & DERIVED STATE

	// Level 2 Options: Get keys of the selected category object
	// We use "?." (optional chaining) just in case selectedCategory is empty
	$: availableMetrics = selectedCategory 
		? Object.keys(dashboardData[selectedCategory] || {}) 
		: [];

	// Level 3 Options: Get the array based on Category AND Metric
	$: availableViz = (selectedCategory && selectedMetric)
		? dashboardData[selectedCategory][selectedMetric] || []
		: [];

	// 4. RESET LOGIC (The Cascade Effect)
	
	// If Category changes -> Reset Metric AND Viz
	// We iterate on 'selectedCategory' variable change
	function handleCategoryChange() {
		selectedMetric = '';
		selectedViz = '';
	}

	// If Metric changes -> Reset Viz only
	function handleMetricChange() {
		selectedViz = '';
	}

	function handleFilter() {
		alert(`Rendering: ${selectedCategory} > ${selectedMetric} > ${selectedViz}`);
	}

    // REACTIVE BUTTON TEXT
    // This logic runs automatically whenever selectedCategory or selectedMetric changes.
    $: buttonText = (() => {
        // Case 1: Nothing selected yet
        if (!selectedCategory) return 'Sync';
        
        // Case 2: Only Category selected (e.g. "Sync Sales")
        if (!selectedMetric) return `Sync ${selectedCategory}`;
        
        // Case 3: Both selected (e.g. "Sync Sales - Revenue")
        // This covers the "Category and the next dropdown" requirement
        return `Sync ${selectedCategory} - ${selectedMetric}`;
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

		const newWidget = {
			id: `widget-${Date.now()}-${Math.random()}`,
			title: `${selectedMetric} (${selectedCategory})`,
			type: selectedViz,
			x: 0, y: 0, w: 3, h: 3
		};

		// 1. Update State
		widgets = [...widgets, newWidget];
		
		// 2. Wait for DOM
		await tick();
		
		// 3. Register with GridStack
		const el = document.getElementById(newWidget.id);
		if (el) grid.makeWidget(el);
	}

	// --- ACTION: SYNC ALL (Generates a Dashboard) ---
	async function syncAll() {
		const newWidgets: any[] = [];
		
		// Loop through every Category and pick the first Metric + Chart
		for (const category of Object.keys(dashboardData)) {
			const firstMetric = Object.keys(dashboardData[category])[0];
			const firstViz = dashboardData[category][firstMetric][0];

			newWidgets.push({
				id: `widget-${Date.now()}-${Math.random()}`,
				title: `${firstMetric} (${category})`,
				type: firstViz,
				x: 0, y: 0, w: 3, h: 3 
			});
		}

		// Add all at once
		widgets = [...widgets, ...newWidgets];
		await tick();

		// Register all new widgets
		newWidgets.forEach(w => {
			const el = document.getElementById(w.id);
			if (el) grid.makeWidget(el);
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
</script>

<main>
	<div class="dashboard-controls">
		
		<!-- ROW 1: SELECTION INPUTS -->
		<div class="controls-row input-group">
			<select bind:value={selectedCategory} on:change={handleCategoryChange}>
				<option value="" disabled selected>Select Category</option>
				{#each Object.keys(dashboardData) as cat}
					<option value={cat}>{cat}</option>
				{/each}
			</select>

			<select bind:value={selectedMetric} on:change={handleMetricChange} disabled={!availableMetrics.length}>
				<option value="" disabled selected>
					{selectedCategory ? 'Select Metric' : '...'}
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
		<button on:click={handleFilter} disabled={"" === selectedCategory}>
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
						title={widget.title}
						type={widget.type}
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