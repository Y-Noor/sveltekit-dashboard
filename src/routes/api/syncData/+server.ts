import { json } from '@sveltejs/kit';
import { PRIVATE_API_URL } from '$env/static/private';

export async function POST({ request }) {
    try {
        // 1. Get parameters from frontend
        const { office, metric } = await request.json();

        // 2. Construct the dynamic URL
        // Example: http://127.0.0.1:8000/Sales/Revenue
        // EncodeURI ensures spaces in "Form responses 1" don't break the URL
        const dynamicUrl = `${PRIVATE_API_URL}/${encodeURIComponent(office.toLowerCase())}/${encodeURIComponent(metric.toLowerCase())}`;
        
        console.log(`Fetching from Backend: ${dynamicUrl}`);

        // 3. Call the Python API
        const res = await fetch(dynamicUrl, {
            method: 'POST', // or GET, depending on your API
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: "Form responses 1" }) // Your payload
        });

        if (!res.ok) {
            // Return null data on error so the frontend knows something went wrong
            return json({ success: false, status: res.status });
        }

        const data = await res.json();
        return json({ success: true, data });

    } catch (error) {
        console.error('Proxy Error:', error);
        return json({ success: false, error: 'Server error' }, { status: 500 });
    }
}