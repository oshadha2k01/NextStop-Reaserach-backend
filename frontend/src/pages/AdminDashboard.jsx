import React, { useMemo, useState } from 'react';
import {
	BusFront,
	MapPin,
	UserSquare,
	Megaphone,
	MessageSquare,
	ShieldCheck,
} from 'lucide-react';

const navItems = [
	{ key: 'registeredBuses', label: 'Registered Buses', icon: BusFront },
	{ key: 'busLocation', label: 'Bus Location', icon: MapPin },
	{ key: 'driverDetails', label: 'Driver Details', icon: UserSquare },
	{ key: 'complaints', label: 'Complaints', icon: Megaphone },
	{ key: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
];

export default function AdminDashboard() {
	const [active, setActive] = useState('registeredBuses');

	const data = useMemo(
		() => ({
			registeredBuses: {
				stats: [
					{ label: 'Total Buses', value: 128 },
					{ label: 'Active Today', value: 94 },
					{ label: 'In Maintenance', value: 6 },
				],
				rows: [
					{ id: 'BUS-102', route: 'Route 5', status: 'Active', capacity: 42 },
					{ id: 'BUS-221', route: 'Route 12', status: 'Active', capacity: 38 },
					{ id: 'BUS-087', route: 'Route 2', status: 'Maintenance', capacity: 40 },
				],
			},
			busLocation: {
				rows: [
					{ id: 'BUS-102', lastSeen: '2 mins ago', location: 'Main St & 3rd', eta: '08:12', lat: 40.7128, lng: -74.0060 },
					{ id: 'BUS-221', lastSeen: '5 mins ago', location: 'Airport Rd', eta: '08:25', lat: 40.7580, lng: -73.9855 },
					{ id: 'BUS-087', lastSeen: 'Offline', location: 'Depot', eta: '—', lat: 40.7489, lng: -73.9680 },
				],
			},
			driverDetails: {
				rows: [
					{ name: 'Anita Rao', bus: 'BUS-102', shift: 'Morning', rating: 4.8 },
					{ name: 'Michael Chen', bus: 'BUS-221', shift: 'Evening', rating: 4.6 },
					{ name: 'David Singh', bus: 'BUS-087', shift: 'Maintenance', rating: 4.7 },
				],
			},
			complaints: {
				rows: [
					{ id: '#C-1042', route: 'Route 5', status: 'Open', summary: 'AC not working' },
					{ id: '#C-1043', route: 'Route 12', status: 'In Review', summary: 'Delay at stop' },
					{ id: '#C-1044', route: 'Route 2', status: 'Resolved', summary: 'Overcrowding' },
				],
			},
			feedbacks: {
				rows: [
					{ id: '#F-2091', rider: 'Sam P.', sentiment: 'Positive', note: 'Clean bus, on time' },
					{ id: '#F-2092', rider: 'Leah K.', sentiment: 'Neutral', note: 'More evening buses please' },
					{ id: '#F-2093', rider: 'Imran S.', sentiment: 'Positive', note: 'Driver was helpful' },
				],
			},
		}),
		[]
	);

	const renderSection = () => {
		if (active === 'registeredBuses') {
			return (
				<div className="space-y-6">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						{data.registeredBuses.stats.map((item) => (
							<div
								key={item.label}
								className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4 flex items-center justify-between"
							>
								<div>
									<p className="text-sm text-[#6b4b3d]">{item.label}</p>
									<p className="text-2xl font-semibold text-[#2a1a15]">{item.value}</p>
								</div>
								<ShieldCheck className="h-8 w-8 text-[#ff6b35]" />
							</div>
						))}
					</div>

					<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
						<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Fleet Overview</h3>
							<span className="text-sm text-[#6b4b3d]">Sample data</span>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Bus ID</th>
										<th className="px-6 py-3">Route</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Capacity</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{data.registeredBuses.rows.map((row) => (
										<tr key={row.id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3 font-medium">{row.id}</td>
											<td className="px-6 py-3">{row.route}</td>
											<td className="px-6 py-3">
												<span
													className={`px-3 py-1 rounded-full text-xs font-semibold ${
														row.status === 'Active'
															? 'bg-[#ff6b35]/10 text-[#ff6b35]'
															: 'bg-[#f59e0b]/10 text-[#b45309]'
													}`}
												>
													{row.status}
												</span>
											</td>
											<td className="px-6 py-3">{row.capacity}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			);
		}

		if (active === 'busLocation') {
			return (
			<div className="space-y-4">
				{/* Map Container */}
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-hidden">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Live Bus Map</h3>
						<span className="text-sm text-[#6b4b3d]">Real-time tracking</span>
					</div>
					<div className="w-full h-96 bg-gray-100 relative">
						<iframe
							width="100%"
							height="100%"
							frameBorder="0"
							style={{ border: 0 }}
							referrerPolicy="no-referrer-when-downgrade"
						src={`https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=40.7489,-73.9680&zoom=12`}
							allowFullScreen
						></iframe>
					</div>
				</div>

				{/* Bus Location Table */}
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Bus Details</h3>
						<span className="text-sm text-[#6b4b3d]">Sample data</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Bus ID</th>
									<th className="px-6 py-3">Last Seen</th>
									<th className="px-6 py-3">Location</th>
									<th className="px-6 py-3">ETA</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{data.busLocation.rows.map((row) => (
									<tr key={row.id} className="hover:bg-[#fff4ec]">
										<td className="px-6 py-3 font-medium">{row.id}</td>
										<td className="px-6 py-3">{row.lastSeen}</td>
										<td className="px-6 py-3">{row.location}</td>
										<td className="px-6 py-3">{row.eta}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>		);
	}
		if (active === 'driverDetails') {
			return (
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Driver Details</h3>
						<span className="text-sm text-[#6b4b3d]">Sample data</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Driver</th>
									<th className="px-6 py-3">Assigned Bus</th>
									<th className="px-6 py-3">Shift</th>
									<th className="px-6 py-3">Rating</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{data.driverDetails.rows.map((row) => (
									<tr key={row.name} className="hover:bg-[#fff4ec]">
										<td className="px-6 py-3 font-medium">{row.name}</td>
										<td className="px-6 py-3">{row.bus}</td>
										<td className="px-6 py-3">{row.shift}</td>
										<td className="px-6 py-3">{row.rating}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			);
		}

		if (active === 'complaints') {
			return (
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Complaints</h3>
						<span className="text-sm text-[#6b4b3d]">Sample data</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Ticket</th>
									<th className="px-6 py-3">Route</th>
									<th className="px-6 py-3">Status</th>
									<th className="px-6 py-3">Summary</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{data.complaints.rows.map((row) => (
									<tr key={row.id} className="hover:bg-[#fff4ec]">
										<td className="px-6 py-3 font-medium">{row.id}</td>
										<td className="px-6 py-3">{row.route}</td>
										<td className="px-6 py-3">
											<span
												className={`px-3 py-1 rounded-full text-xs font-semibold ${
													row.status === 'Resolved'
														? 'bg-[#10b981]/10 text-[#0f5132]'
														: row.status === 'Open'
														? 'bg-[#ef4444]/10 text-[#991b1b]'
														: 'bg-[#f59e0b]/10 text-[#b45309]'
												}`}
											>
												{row.status}
											</span>
										</td>
										<td className="px-6 py-3">{row.summary}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			);
		}

		return (
			<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
				<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
					<h3 className="text-lg font-semibold text-[#2a1a15]">Feedbacks</h3>
					<span className="text-sm text-[#6b4b3d]">Sample data</span>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full text-left">
						<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
							<tr>
								<th className="px-6 py-3">Ticket</th>
								<th className="px-6 py-3">Rider</th>
								<th className="px-6 py-3">Sentiment</th>
								<th className="px-6 py-3">Note</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
							{data.feedbacks.rows.map((row) => (
								<tr key={row.id} className="hover:bg-[#fff4ec]">
									<td className="px-6 py-3 font-medium">{row.id}</td>
									<td className="px-6 py-3">{row.rider}</td>
									<td className="px-6 py-3">
										<span
											className={`px-3 py-1 rounded-full text-xs font-semibold ${
												row.sentiment === 'Positive'
													? 'bg-[#10b981]/10 text-[#0f5132]'
													: row.sentiment === 'Neutral'
													? 'bg-[#f59e0b]/10 text-[#b45309]'
													: 'bg-[#ef4444]/10 text-[#991b1b]'
											}`}
										>
											{row.sentiment}
										</span>
									</td>
									<td className="px-6 py-3">{row.note}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-[#fff4ec] text-[#2a1a15]">
			<div className="flex min-h-screen">
				<aside className="w-64 bg-[#ff6b35] text-white flex flex-col">
					<div className="px-6 py-5 border-b border-white/20">
						<h1 className="text-xl font-bold">Admin Dashboard</h1>
						<p className="text-sm text-white/80">Nextstop Control Panel</p>
					</div>
					<nav className="flex-1 py-4 space-y-1">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive = active === item.key;
							return (
								<button
									key={item.key}
									onClick={() => setActive(item.key)}
									className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${
										isActive
											? 'bg-white text-[#ff6b35] shadow-sm'
											: 'text-white/80 hover:bg-white/10'
									}`}
								>
									<Icon className={`h-5 w-5 ${isActive ? 'text-[#ff6b35]' : 'text-white'}`} />
									<span className="font-medium">{item.label}</span>
								</button>
							);
						})}
					</nav>
				</aside>

				<main className="flex-1 p-6 sm:p-10 space-y-6">
					<div className="flex items-center justify-between flex-wrap gap-3">
						<div>
							<p className="text-sm text-[#6b4b3d]">Control Center</p>
							<h2 className="text-2xl font-semibold capitalize">{active.replace(/([A-Z])/g, ' $1')}</h2>
						</div>
						<div className="flex items-center gap-3">
							<button className="px-4 py-2 rounded-lg bg-white border border-[#f2d9cc] text-[#2a1a15] shadow-sm">Export</button>
							<button className="px-4 py-2 rounded-lg bg-[#ff6b35] text-white shadow-sm">Add New</button>
						</div>
					</div>

					{renderSection()}
				</main>
			</div>
		</div>
	);
}
