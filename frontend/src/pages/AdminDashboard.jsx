import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	BusFront,
	MapPin,
	UserSquare,
	Megaphone,
	MessageSquare,
	ShieldCheck,
} from 'lucide-react';
import LiveBusLocation from '../components/LiveBusLocation';

const API_BASE_URL = 'http://localhost:3000/api';

const navItems = [
	{ key: 'registeredBuses', label: 'Registered Buses', icon: BusFront },
	{ key: 'busLocation', label: 'Bus Location', icon: MapPin },
	{ key: 'driverDetails', label: 'Driver Details', icon: UserSquare },
	{ key: 'complaints', label: 'Complaints', icon: Megaphone },
	{ key: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
];

export default function AdminDashboard() {
	const [active, setActive] = useState('registeredBuses');
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [buses, setBuses] = useState([]);
	const [drivers, setDrivers] = useState([]);
	const [complaints, setComplaints] = useState([]);
	const [feedbacks, setFeedbacks] = useState([]);
	const [stats, setStats] = useState({
		totalBuses: 0,
		approvedBuses: 0,
		activeToday: 0,
		inMaintenance: 0,
	});

	useEffect(() => {
		fetchData();
	}, [active]);

	const fetchData = async () => {
		setLoading(true);
		try {
			// Fetch bus stats
			const statsRes = await fetch(`${API_BASE_URL}/buses/stats`);
			if (statsRes.ok) {
				const statsData = await statsRes.json();
				setStats(statsData);
			}

			// Fetch buses
			const busesRes = await fetch(`${API_BASE_URL}/buses`);
			if (busesRes.ok) {
				const busesData = await busesRes.json();
				setBuses(busesData);
			}

			// Fetch drivers
			const driversRes = await fetch(`${API_BASE_URL}/drivers`);
			if (driversRes.ok) {
				const driversData = await driversRes.json();
				setDrivers(driversData);
			}

			// Fetch complaints
			const complaintsRes = await fetch(`${API_BASE_URL}/complaints`);
			if (complaintsRes.ok) {
				const complaintsData = await complaintsRes.json();
				setComplaints(complaintsData);
			}

			// Fetch feedbacks
			const feedbacksRes = await fetch(`${API_BASE_URL}/feedbacks`);
			if (feedbacksRes.ok) {
				const feedbacksData = await feedbacksRes.json();
				setFeedbacks(feedbacksData);
			}
		} catch (error) {
			console.error('Error fetching data:', error);
		} finally {
			setLoading(false);
		}
	};

	const renderSection = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center p-12">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
						<p className="text-[#6b4b3d]">Loading data...</p>
					</div>
				</div>
			);
		}

		if (active === 'registeredBuses') {
			const statsData = [
				{ label: 'Total Buses', value: stats.totalBuses || 0 },
				{ label: 'Active Today', value: stats.activeToday || 0 },
				{ label: 'In Maintenance', value: stats.inMaintenance || 0 },
			];

			return (
				<div className="space-y-6">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						{statsData.map((item) => (
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
							<span className="text-sm text-[#6b4b3d]">{buses.length} buses</span>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Image</th>
										<th className="px-6 py-3">Registration No</th>
										<th className="px-6 py-3">Route</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Seats</th>
										<th className="px-6 py-3">Driver</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{buses.length === 0 ? (
										<tr>
											<td colSpan="6" className="px-6 py-8 text-center text-[#6b4b3d]">
												No buses registered yet
											</td>
										</tr>
									) : (
										buses.map((bus) => (
											<tr key={bus._id} className="hover:bg-[#fff4ec]">
												<td className="px-6 py-3">
													<img 
														src={`${API_BASE_URL}/buses/${bus._id}/image`}
														alt={bus.regNo}
														className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 border border-[#f2d9cc]"
														onClick={() => window.open(`${API_BASE_URL}/buses/${bus._id}/image`, '_blank')}
													/>
												</td>
												<td className="px-6 py-3 font-medium">{bus.regNo}</td>
												<td className="px-6 py-3">{bus.route}</td>
												<td className="px-6 py-3">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold ${
															bus.approvalStatus === 'approved'
																? 'bg-[#10b981]/10 text-[#0f5132]'
																: bus.approvalStatus === 'pending'
																? 'bg-[#f59e0b]/10 text-[#b45309]'
																: 'bg-[#ef4444]/10 text-[#991b1b]'
														}`}
													>
														{bus.approvalStatus}
													</span>
												</td>
												<td className="px-6 py-3">{bus.seats}</td>
												<td className="px-6 py-3">{bus.driverName}</td>
											</tr>
										))
									)}
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
						<span className="text-sm text-[#6b4b3d]">{buses.length} buses</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Image</th>
									<th className="px-6 py-3">Registration No</th>
									<th className="px-6 py-3">Route</th>
									<th className="px-6 py-3">Driver</th>
									<th className="px-6 py-3">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{buses.length === 0 ? (
									<tr>
										<td colSpan="5" className="px-6 py-8 text-center text-[#6b4b3d]">
											No buses available
										</td>
									</tr>
								) : (
									buses.map((bus) => (
										<tr key={bus._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3">
												<img 
													src={`${API_BASE_URL}/buses/${bus._id}/image`}
													alt={bus.regNo}
													className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 border border-[#f2d9cc]"
													onClick={() => window.open(`${API_BASE_URL}/buses/${bus._id}/image`, '_blank')}
												/>
											</td>
											<td className="px-6 py-3 font-medium">{bus.regNo}</td>
											<td className="px-6 py-3">{bus.route}</td>
											<td className="px-6 py-3">{bus.driverName}</td>
											<td className="px-6 py-3">
												<span
													className={`px-3 py-1 rounded-full text-xs font-semibold ${
														bus.approvalStatus === 'approved'
															? 'bg-[#10b981]/10 text-[#0f5132]'
															: 'bg-[#f59e0b]/10 text-[#b45309]'
													}`}
												>
													{bus.approvalStatus}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>		);
		}

		if (active === 'driverDetails') {
			return (
				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
						<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Driver Details</h3>
							<span className="text-sm text-[#6b4b3d]">{drivers.length} drivers</span>
						</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Driver</th>
									<th className="px-6 py-3">Assigned Bus</th>
									<th className="px-6 py-3">Shift</th>
									<th className="px-6 py-3">Rating</th>
									<th className="px-6 py-3">Phone</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{drivers.length === 0 ? (
									<tr>
										<td colSpan="5" className="px-6 py-8 text-center text-[#6b4b3d]">
											No drivers registered yet
										</td>
									</tr>
								) : (
									drivers.map((driver) => (
										<tr key={driver._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3 font-medium">{driver.name}</td>
											<td className="px-6 py-3">
												{driver.busId ? (driver.busId.regNo || 'Bus assigned') : 'Not assigned'}
											</td>
											<td className="px-6 py-3">{driver.shift}</td>
											<td className="px-6 py-3">{driver.rating.toFixed(1)}</td>
											<td className="px-6 py-3">{driver.phone}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		);
		}

		if (active === 'complaints') {
			return (
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Complaints</h3>
						<span className="text-sm text-[#6b4b3d]">{complaints.length} complaints</span>
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
								{complaints.length === 0 ? (
									<tr>
										<td colSpan="4" className="px-6 py-8 text-center text-[#6b4b3d]">
											No complaints filed yet
										</td>
									</tr>
								) : (
									complaints.map((complaint) => (
										<tr key={complaint._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3 font-medium">{complaint.ticketId}</td>
											<td className="px-6 py-3">{complaint.route}</td>
											<td className="px-6 py-3">
												<span
													className={`px-3 py-1 rounded-full text-xs font-semibold ${
														complaint.status === 'Resolved' || complaint.status === 'Closed'
															? 'bg-[#10b981]/10 text-[#0f5132]'
															: complaint.status === 'Open'
															? 'bg-[#ef4444]/10 text-[#991b1b]'
															: 'bg-[#f59e0b]/10 text-[#b45309]'
													}`}
												>
													{complaint.status}
												</span>
											</td>
											<td className="px-6 py-3">{complaint.summary}</td>
										</tr>
									))
								)}
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
					<span className="text-sm text-[#6b4b3d]">{feedbacks.length} feedbacks</span>
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
							{feedbacks.length === 0 ? (
								<tr>
									<td colSpan="4" className="px-6 py-8 text-center text-[#6b4b3d]">
										No feedbacks submitted yet
									</td>
								</tr>
							) : (
								feedbacks.map((feedback) => (
									<tr key={feedback._id} className="hover:bg-[#fff4ec]">
										<td className="px-6 py-3 font-medium">{feedback.ticketId}</td>
										<td className="px-6 py-3">{feedback.rider}</td>
										<td className="px-6 py-3">
											<span
												className={`px-3 py-1 rounded-full text-xs font-semibold ${
													feedback.sentiment === 'Positive'
														? 'bg-[#10b981]/10 text-[#0f5132]'
														: feedback.sentiment === 'Neutral'
														? 'bg-[#f59e0b]/10 text-[#b45309]'
														: 'bg-[#ef4444]/10 text-[#991b1b]'
												}`}
											>
												{feedback.sentiment}
											</span>
										</td>
										<td className="px-6 py-3">{feedback.note}</td>
									</tr>
								))
							)}
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
							{active === 'driverDetails' ? (
								<button
									onClick={() => navigate('/add-driver')}
									className="px-4 py-2 rounded-lg bg-[#ff6b35] text-white shadow-sm hover:bg-[#cc562a]"
								>
									Add New Driver
								</button>
							) : (
								<button
									onClick={() => navigate('/add-bus')}
									className="px-4 py-2 rounded-lg bg-[#ff6b35] text-white shadow-sm hover:bg-[#cc562a]"
								>
									Add New Bus
								</button>
							)}
						</div>
					</div>

					{renderSection()}
				</main>
			</div>
		</div>
	);
}
