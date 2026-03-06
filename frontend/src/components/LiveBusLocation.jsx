import React, { useEffect, useRef, useState } from 'react';

// Route 177: Kaduwela - Kollupitiya (Correct stops and coordinates)
const route177Stops = [
	{ id: 1, name: 'Kaduwela Bus Stand', lat: 6.9442, lng: 79.9866, order: 1, landmark: 'Start Terminal / Clock Tower' },
	{ id: 2, name: 'Kothalawala', lat: 6.9268, lng: 79.9701, order: 2, landmark: 'SLIIT University Area' },
	{ id: 3, name: 'Malabe Junction', lat: 6.9045, lng: 79.9548, order: 3, landmark: 'Malabe Clock Tower' },
	{ id: 4, name: 'Thalangama', lat: 6.9110, lng: 79.9324, order: 4, landmark: 'Near ITI / Sludge Treatment' },
	{ id: 5, name: 'Koswatta', lat: 6.9071, lng: 79.9214, order: 5, landmark: 'Thalangama Police Station' },
	{ id: 6, name: 'Battaramulla', lat: 6.8998, lng: 79.9134, order: 6, landmark: 'Suhurupaya (Immigration Office)' },
	{ id: 7, name: 'Rajagiriya', lat: 6.9092, lng: 79.8964, order: 7, landmark: 'Election Commission Office' },
	{ id: 8, name: 'Ayurveda Junction', lat: 6.9115, lng: 79.8863, order: 8, landmark: 'Ayurveda Hospital' },
	{ id: 9, name: 'Borella', lat: 6.9142, lng: 79.8778, order: 9, landmark: 'Senanayake Junction' },
	{ id: 10, name: 'Horton Place', lat: 6.9103, lng: 79.8692, order: 10, landmark: 'Near Nelum Pokuna' },
	{ id: 11, name: 'Liberty Plaza', lat: 6.9124, lng: 79.8516, order: 11, landmark: 'Liberty Junction' },
	{ id: 12, name: 'Kollupitiya', lat: 6.9114, lng: 79.8488, order: 12, landmark: 'Station Road / End Terminal' },
];

// Demo buses on Route 177 with realistic speeds
const demoBuses = [
	{ 
		id: 'BUS-177-01', 
		route: 'Route 177', 
		currentStop: 3, 
		status: 'Active',
		speed: 42,
		capacity: 45,
		passengers: 32,
		lastUpdate: new Date(),
	},
	{ 
		id: 'BUS-177-02', 
		route: 'Route 177', 
		currentStop: 7, 
		status: 'Active',
		speed: 35,
		capacity: 45,
		passengers: 28,
		lastUpdate: new Date(),
	},
	{ 
		id: 'BUS-177-03', 
		route: 'Route 177', 
		currentStop: 10, 
		status: 'Active',
		speed: 28,
		capacity: 45,
		passengers: 41,
		lastUpdate: new Date(),
	},
];

// Custom bus icon SVG
const createBusIcon = (color = '#FF6B35') => {
	return `data:image/svg+xml,${encodeURIComponent(`
		<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5">
			<rect x="3" y="4" width="18" height="14" rx="2" />
			<path d="M3 10h18M7 18v2M17 18v2M8 4v6M16 4v6" stroke-linecap="round"/>
			<circle cx="8" cy="16" r="1" fill="white"/>
			<circle cx="16" cy="16" r="1" fill="white"/>
		</svg>
	`)}`;
};

export default function LiveBusLocation() {
	const mapRef = useRef(null);
	const googleMapRef = useRef(null);
	const markersRef = useRef([]);
	const busMarkersRef = useRef([]);
	const routePolylineRef = useRef(null);
	const [isMapLoaded, setIsMapLoaded] = useState(false);
	const [buses, setBuses] = useState(demoBuses);
	const [selectedBus, setSelectedBus] = useState(null);
	const mapInitializedRef = useRef(false);

	// Load Google Maps Script
	useEffect(() => {
		const loadGoogleMaps = () => {
			if (window.google?.maps) {
				setIsMapLoaded(true);
				return;
			}

			const existingScript = document.querySelector(
				`script[src*="maps.googleapis.com/maps/api"]`
			);

			if (existingScript) {
				// Wait for the script to actually load
				const checkGoogleMaps = setInterval(() => {
					if (window.google?.maps) {
						setIsMapLoaded(true);
						clearInterval(checkGoogleMaps);
					}
				}, 100);
				return;
			}

			const script = document.createElement('script');
			script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
			script.async = true;
			script.defer = true;
			script.onload = () => {
				// Extra check to ensure google.maps is available
				if (window.google?.maps) {
					setIsMapLoaded(true);
				}
			};
			script.onerror = () => {
				console.error('Failed to load Google Maps');
			};
			document.head.appendChild(script);
		};

		loadGoogleMaps();
	}, []);

	// Initialize map with Route 177
	useEffect(() => {
		if (!mapRef.current || !isMapLoaded || !window.google?.maps || mapInitializedRef.current) return;

		const initializeMap = () => {
			try {
				mapInitializedRef.current = true;

				// Initialize map centered on route
				googleMapRef.current = new window.google.maps.Map(mapRef.current, {
					center: { lat: 6.9115, lng: 79.9100 },
					zoom: 13,
					mapTypeControl: true,
					streetViewControl: true,
					fullscreenControl: true,
					mapTypeId: 'roadmap',
				});

				// Add bus stop markers (red pins)
				route177Stops.forEach((stop) => {
					const marker = new window.google.maps.Marker({
						position: { lat: stop.lat, lng: stop.lng },
						map: googleMapRef.current,
						title: stop.name,
						icon: {
							url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
							scaledSize: new window.google.maps.Size(32, 32),
						},
						label: {
							text: stop.order.toString(),
							color: 'white',
							fontSize: '12px',
							fontWeight: 'bold',
						},
					});

					const infoWindow = new window.google.maps.InfoWindow({
						content: `<div style="padding: 10px; max-width: 200px;">
							<strong style="color: #FF6B35; font-size: 14px;">${stop.name}</strong><br/>
							<span style="color: #666; font-size: 12px;">Stop #${stop.order} - Route 177</span><br/>
							<span style="color: #333; font-size: 11px; margin-top: 4px; display: block;">📍 ${stop.landmark}</span>
						</div>`,
					});

					marker.addListener('click', () => {
						infoWindow.open(googleMapRef.current, marker);
					});

					markersRef.current.push(marker);
				});

				// Draw route polyline in orange
				const routePath = route177Stops.map(stop => ({ lat: stop.lat, lng: stop.lng }));
				routePolylineRef.current = new window.google.maps.Polyline({
					path: routePath,
					geodesic: true,
					strokeColor: '#FF6B35',
					strokeOpacity: 0.9,
					strokeWeight: 5,
					map: googleMapRef.current,
				});

				// Add bus markers with custom bus icons
				buses.forEach((bus) => {
					const stopIndex = bus.currentStop - 1;
					const position = {
						lat: route177Stops[stopIndex].lat,
						lng: route177Stops[stopIndex].lng,
					};

					const busMarker = new window.google.maps.Marker({
						position: position,
						map: googleMapRef.current,
						title: bus.id,
						icon: {
							url: createBusIcon('#2563EB'),
							scaledSize: new window.google.maps.Size(40, 40),
							anchor: new window.google.maps.Point(20, 20),
						},
						animation: window.google.maps.Animation.DROP,
						zIndex: 1000,
					});

					const busInfoWindow = new window.google.maps.InfoWindow({
						content: `<div style="padding: 12px; min-width: 180px;">
							<strong style="color: #2563EB; font-size: 15px;">🚌 ${bus.id}</strong><br/>
							<span style="color: #666; font-size: 12px;">${bus.route}</span><br/>
							<hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"/>
							<div style="font-size: 12px; line-height: 1.6;">
								<span style="color: #333;">📍 Current: <strong>${route177Stops[stopIndex].name}</strong></span><br/>
								<span style="color: #333;">⚡ Speed: <strong>${bus.speed} km/h</strong></span><br/>
								<span style="color: #333;">👥 Passengers: <strong>${bus.passengers}/${bus.capacity}</strong></span><br/>
								<span style="color: ${bus.status === 'Active' ? '#10b981' : '#f59e0b'};">● Status: <strong>${bus.status}</strong></span>
							</div>
						</div>`,
					});

					busMarker.addListener('click', () => {
						busInfoWindow.open(googleMapRef.current, busMarker);
						setSelectedBus(bus.id);
					});

					busMarkersRef.current.push({ marker: busMarker, busId: bus.id, infoWindow: busInfoWindow });
				});

				// Simulate bus movement with varying speeds
				const interval = setInterval(() => {
					setBuses(prevBuses => 
						prevBuses.map(bus => {
							const nextStop = (bus.currentStop % route177Stops.length) + 1;
							const speedVariation = Math.floor(Math.random() * 10) - 5;
							const newSpeed = Math.max(20, Math.min(50, bus.speed + speedVariation));
							
							return {
								...bus,
								currentStop: nextStop,
								speed: newSpeed,
								lastUpdate: new Date(),
							};
						})
					);
				}, 8000); // Update every 8 seconds

				return () => clearInterval(interval);
			} catch (error) {
				console.error('Error initializing map:', error);
				mapInitializedRef.current = false;
			}
		};

		// Add small delay to ensure DOM is ready
		const timer = setTimeout(initializeMap, 100);
		return () => clearTimeout(timer);
	}, [isMapLoaded]);

	// Update bus positions when buses state changes
	useEffect(() => {
		if (!googleMapRef.current) return;

		buses.forEach((bus) => {
			const busMarkerObj = busMarkersRef.current.find(bm => bm.busId === bus.id);
			if (busMarkerObj) {
				const stopIndex = bus.currentStop - 1;
				const newPosition = {
					lat: route177Stops[stopIndex].lat,
					lng: route177Stops[stopIndex].lng,
				};
				
				// Smooth animation
				busMarkerObj.marker.setPosition(newPosition);
				busMarkerObj.marker.setAnimation(window.google.maps.Animation.BOUNCE);
				setTimeout(() => {
					busMarkerObj.marker.setAnimation(null);
				}, 1000);

				// Update info window content
				const currentStop = route177Stops[stopIndex];
				busMarkerObj.infoWindow.setContent(`<div style="padding: 12px; min-width: 180px;">
					<strong style="color: #2563EB; font-size: 15px;">🚌 ${bus.id}</strong><br/>
					<span style="color: #666; font-size: 12px;">${bus.route}</span><br/>
					<hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"/>
					<div style="font-size: 12px; line-height: 1.6;">
						<span style="color: #333;">📍 Current: <strong>${currentStop.name}</strong></span><br/>
						<span style="color: #333;">⚡ Speed: <strong>${bus.speed} km/h</strong></span><br/>
						<span style="color: #333;">👥 Passengers: <strong>${bus.passengers}/${bus.capacity}</strong></span><br/>
						<span style="color: ${bus.status === 'Active' ? '#10b981' : '#f59e0b'};">● Status: <strong>${bus.status}</strong></span>
					</div>
				</div>`);
			}
		});
	}, [buses]);

	return (
		<div className="space-y-4">
			{/* Map Container */}
			<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-hidden">
				<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between flex-wrap gap-2">
					<div>
						<h3 className="text-lg font-semibold text-[#2a1a15]">Live Bus Map - Route 177</h3>
						<p className="text-xs text-[#6b4b3d] mt-1">Kaduwela Bus Stand → Kollupitiya</p>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-green-600 font-medium">● {buses.length} buses tracking</span>
						<span className="text-xs text-[#6b4b3d]">Updates every 8s</span>
					</div>
				</div>
				<div 
					ref={mapRef}
					className="w-full h-[500px] bg-gray-100"
				>
					{!isMapLoaded && (
						<div className="flex items-center justify-center h-full">
							<p className="text-gray-500">Loading map...</p>
						</div>
					)}
				</div>
			</div>

			{/* Bus Status Table */}
			<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
				<div className="px-6 py-4 border-b border-[#f2d9cc]">
					<h3 className="text-lg font-semibold text-[#2a1a15]">Active Buses - Route 177</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-left">
						<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
							<tr>
								<th className="px-6 py-3">Bus ID</th>
								<th className="px-6 py-3">Current Location</th>
								<th className="px-6 py-3">Speed</th>
								<th className="px-6 py-3">Passengers</th>
								<th className="px-6 py-3">Status</th>
								<th className="px-6 py-3">Last Update</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
							{buses.map((bus) => {
								const currentStop = route177Stops.find(s => s.order === bus.currentStop);
								return (
									<tr 
										key={bus.id} 
										className={`hover:bg-[#fff4ec] cursor-pointer transition ${
											selectedBus === bus.id ? 'bg-[#fff4ec]' : ''
										}`}
										onClick={() => setSelectedBus(bus.id)}
									>
										<td className="px-6 py-3 font-medium text-blue-600">{bus.id}</td>
										<td className="px-6 py-3">
											<div>
												<p className="font-medium">{currentStop?.name || 'Unknown'}</p>
												<p className="text-xs text-[#6b4b3d]">{currentStop?.landmark}</p>
											</div>
										</td>
										<td className="px-6 py-3">
											<span className="font-semibold">{bus.speed}</span> km/h
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2">
												<span>{bus.passengers}/{bus.capacity}</span>
												<div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
													<div 
														className="h-full bg-[#FF6B35] transition-all"
														style={{ width: `${(bus.passengers / bus.capacity) * 100}%` }}
													/>
												</div>
											</div>
										</td>
										<td className="px-6 py-3">
											<span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#10b981]/10 text-[#0f5132]">
												{bus.status}
											</span>
										</td>
										<td className="px-6 py-3 text-xs">
											{new Date(bus.lastUpdate).toLocaleTimeString()}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* Route Stops */}
			<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
				<div className="px-6 py-4 border-b border-[#f2d9cc]">
					<h3 className="text-lg font-semibold text-[#2a1a15]">Route 177 - All Stops ({route177Stops.length})</h3>
				</div>
				<div className="px-6 py-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{route177Stops.map((stop) => (
							<div 
								key={stop.id} 
								className="p-4 rounded-lg border border-[#f2d9cc] hover:bg-[#fff4ec] hover:border-[#FF6B35] transition cursor-pointer"
							>
								<div className="flex items-start gap-3">
									<span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ff6b35] text-white text-sm font-bold flex-shrink-0">
										{stop.order}
									</span>
									<div className="flex-1 min-w-0">
										<p className="font-semibold text-[#2a1a15] truncate">{stop.name}</p>
										<p className="text-xs text-[#6b4b3d] mt-1">{stop.landmark}</p>
										<p className="text-xs text-gray-400 mt-1">
											{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
