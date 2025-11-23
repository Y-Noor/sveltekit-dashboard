<script lang="ts">
	// 1. TYPE DEFINITION (Best Practice)
	// This defines a "Dictionary of Dictionaries of String Arrays"
	// Level 1 (String): Category
	// Level 2 (Record): The Metric Object containing arrays
	// Level 3 (String[]): The list of Charts
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
</script>

<!-- 2. HTML STRUCTURE -->
<div class="dashboard-header">
	<h1>Dashboard Builder</h1>
	
	<div class="controls-row">
		
		<!-- 1. CATEGORY -->
		<select bind:value={selectedCategory} on:change={handleCategoryChange}>
			<option value="" disabled selected>Office</option>
			{#each Object.keys(dashboardData) as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>

		<!-- 2. METRIC (Depends on Category) -->
		<select 
			bind:value={selectedMetric} 
			on:change={handleMetricChange}
			disabled={availableMetrics.length === 0}
		>
			<option value="" disabled selected>
				{selectedCategory ? 'Select Metric' : 'Activity'}
			</option>
			{#each availableMetrics as metric}
				<option value={metric}>{metric}</option>
			{/each}
		</select>

		<!-- 3. VISUALIZATION (Depends on Category + Metric) -->
		<select 
			bind:value={selectedViz}
			disabled={availableViz.length === 0}
		>
			<option value="" disabled selected>
				{selectedMetric ? 'Select Chart' : 'Visualization type'}
			</option>
			{#each availableViz as viz}
				<option value={viz}>{viz}</option>
			{/each}
		</select>

		<!-- BUTTON -->
		<button on:click={handleFilter} disabled={!selectedViz}>
			Build
		</button>

        <!-- SYNC SPECIFIC BUTTON -->
		<button on:click={handleFilter} disabled={"" === selectedCategory}>
    {buttonText}
</button>

        <!-- SYNC ALL BUTTON -->
		<button on:click={handleFilter}>
			Sync All
		</button>
		
	</div>
</div>

<!-- 3. STYLING (Scoped automatically to this component) -->
<style>
	/* This is the magic wrapper */
	.controls-row {
		display: flex;       /* Enables flexbox */
		gap: 1rem;          /* Adds space between items (16px) */
		align-items: center; /* Centers items vertically */
	}

	/* Basic styling to make it look decent without Tailwind */
	select, button {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}

	button {
		background-color: #007acc;
		color: white;
		cursor: pointer;
		border: none;
	}

	button:hover {
		background-color: #005fa3;
	}

    button:disabled {
    background-color: #e5e5e5; /* Grey background */
    color: #999;               /* Grey text */
    cursor: not-allowed;       /* 'No entry' mouse cursor */
    opacity: 0.7;              /* Optional: makes it look faded */
}
</style>