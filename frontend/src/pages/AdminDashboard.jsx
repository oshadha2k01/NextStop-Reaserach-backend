import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	BusFront,
	MapPin,
	UserSquare,
	Megaphone,
	MessageSquare,
	ShieldCheck,
	Pencil,
	Trash2,
	Plus,
	X,
} from 'lucide-react';
import { showErrorAlert, showSuccessAlert, showConfirmAlert } from '../utils/alerts';
import PageBackButton from '../components/PageBackButton';

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL
	|| (typeof window !== 'undefined' && window.location.hostname === 'smartbusstop.me'
		? 'https://smartbusstop.me/backend/api'
		: 'http://localhost:3000/api');

const normalizeBaseUrl = (value) => {
	const trimmed = String(value || '').trim();
	if (!trimmed) return 'http://localhost:3000/api';

	const withProtocol = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed.replace(/^\/+/, '')}`;

	// Collapse duplicate slashes in path while preserving protocol (https://)
	return withProtocol.replace(/([^:]\/)\/+/g, '$1').replace(/\/+$/, '');
};

const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL);
const buildApiUrl = (endpoint) => `${API_BASE_URL}/${String(endpoint || '').replace(/^\/+/, '')}`;

const navItems = [
	{ key: 'registeredBuses', label: 'Registered Buses', icon: BusFront },
	{ key: 'busDevices', label: 'Bus Devices', icon: ShieldCheck },
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
	const [busDevices, setBusDevices] = useState([]);
	const [knownIotDevices, setKnownIotDevices] = useState([]);
	const [complaints, setComplaints] = useState([]);
	const [feedbacks, setFeedbacks] = useState([]);
	const [stats, setStats] = useState({
		totalBuses: 0,
		approvedBuses: 0,
		activeToday: 0,
		inMaintenance: 0,
	});
	const [showDeviceModal, setShowDeviceModal] = useState(false);
	const [selectedBusForDevice, setSelectedBusForDevice] = useState(null);
	const [deviceRegistrationForm, setDeviceRegistrationForm] = useState({
		deviceId: '',
	});
	const [registering, setRegistering] = useState(false);
	const [showBusEditModal, setShowBusEditModal] = useState(false);
	const [editingBus, setEditingBus] = useState(null);
	const [busEditForm, setBusEditForm] = useState({
		route: '',
		regNo: '',
		seats: '',
		ownerName: '',
		phoneNo: '',
		email: '',
		deviceId: '',
	});
	const [busEditImage, setBusEditImage] = useState(null);
	const [busSaving, setBusSaving] = useState(false);
	const [showDriverModal, setShowDriverModal] = useState(false);
	const [editingDriver, setEditingDriver] = useState(null);
	const [driverSaving, setDriverSaving] = useState(false);
	const [driverBuses, setDriverBuses] = useState([]);
	const [driverForm, setDriverForm] = useState({
		name: '',
		phone: '',
		licenseNumber: '',
		busId: '',
		shift: 'Morning',
		status: 'active',
		rating: 0,
	});

	useEffect(() => {
		fetchData();
	}, [active]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const token = localStorage.getItem('token');
			const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

			// Fetch bus stats
			const statsRes = await fetch(buildApiUrl('/buses/stats'), { headers: authHeaders });
			if (statsRes.ok) {
				const statsData = await statsRes.json();
				setStats(statsData);
			}

			// Fetch buses
			const busesRes = await fetch(buildApiUrl('/buses'), { headers: authHeaders });
			if (busesRes.ok) {
				const busesData = await busesRes.json();
				setBuses(busesData);
			}

			// Fetch drivers
			const driversRes = await fetch(buildApiUrl('/drivers'), { headers: authHeaders });
			if (driversRes.ok) {
				const driversData = await driversRes.json();
				setDrivers(driversData);
			}

			// Fetch bus-device mappings
			const busDevicesRes = await fetch(buildApiUrl('/bus-device'), { headers: authHeaders });
			if (busDevicesRes.ok) {
				const busDevicesData = await busDevicesRes.json();
				setBusDevices(busDevicesData.registrations || []);
			}

			// Fetch recently seen IoT devices for online/offline insights
			const iotDevicesRes = await fetch(buildApiUrl('/iot-devices?limit=200'), { headers: authHeaders });
			if (iotDevicesRes.ok) {
				const iotDevicesData = await iotDevicesRes.json();
				setKnownIotDevices(iotDevicesData.devices || []);
			}

			// Fetch complaints
			const complaintsRes = await fetch(buildApiUrl('/complaints'), { headers: authHeaders });
			if (complaintsRes.ok) {
				const complaintsData = await complaintsRes.json();
				setComplaints(complaintsData);
			}

			// Fetch feedbacks
			const feedbacksRes = await fetch(buildApiUrl('/feedback'), { headers: authHeaders });
			if (feedbacksRes.ok) {
				const feedbacksData = await feedbacksRes.json();
				setFeedbacks(feedbacksData);
			}
		} catch (error) {
			console.error('Error fetching data:', error);
			showErrorAlert('Load Failed', 'Could not load dashboard data. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const fetchDriverBuses = async (includeCurrentBus = null) => {
		try {
			const token = localStorage.getItem('token');
			const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
			const res = await fetch(buildApiUrl('/drivers/available-buses'), { headers: authHeaders });
			const data = res.ok ? await res.json() : [];

			const normalized = Array.isArray(data) ? data : [];
			if (
				includeCurrentBus
				&& includeCurrentBus._id
				&& !normalized.some((b) => b._id === includeCurrentBus._id)
			) {
				setDriverBuses([{ _id: includeCurrentBus._id, regNo: includeCurrentBus.regNo, route: includeCurrentBus.route }, ...normalized]);
				return;
			}

			setDriverBuses(normalized);
		} catch (error) {
			setDriverBuses([]);
		}
	};

	const openCreateDriverModal = async () => {
		setEditingDriver(null);
		setDriverForm({
			name: '',
			phone: '',
			licenseNumber: '',
			busId: '',
			shift: 'Morning',
			status: 'active',
			rating: 0,
		});
		await fetchDriverBuses();
		setShowDriverModal(true);
	};

	const openEditDriverModal = async (driver) => {
		setEditingDriver(driver);
		setDriverForm({
			name: driver.name || '',
			phone: driver.phone || '',
			licenseNumber: driver.licenseNumber || '',
			busId: driver.busId?._id || '',
			shift: driver.shift || 'Morning',
			status: driver.status || 'active',
			rating: driver.rating ?? 0,
		});
		await fetchDriverBuses(driver.busId || null);
		setShowDriverModal(true);
	};

	const closeDriverModal = () => {
		setShowDriverModal(false);
		setEditingDriver(null);
	};

	const openEditBusModal = (bus) => {
		setEditingBus(bus);
		setBusEditForm({
			route: bus.route || '',
			regNo: bus.regNo || '',
			seats: bus.seats ?? '',
			ownerName: bus.ownerName || '',
			phoneNo: bus.phoneNo || '',
			email: bus.email || '',
			deviceId: bus.device_id || '',
		});
		setBusEditImage(null);
		setShowBusEditModal(true);
	};

	const closeBusEditModal = () => {
		setShowBusEditModal(false);
		setEditingBus(null);
		setBusEditImage(null);
	};

	const handleBusEditChange = (e) => {
		const { name, value } = e.target;
		setBusEditForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleBusEditFile = (e) => {
		const file = e.target.files?.[0];
		setBusEditImage(file || null);
	};

	const handleSaveBus = async () => {
		if (!editingBus) return;

		if (!busEditForm.route.trim() || !busEditForm.regNo.trim() || !busEditForm.ownerName.trim() || !busEditForm.phoneNo.trim() || !busEditForm.email.trim() || !busEditForm.deviceId.trim()) {
			await showErrorAlert('Validation Error', 'Route, registration number, owner, phone, email and device ID are required');
			return;
		}

		setBusSaving(true);
		try {
			const payload = new FormData();
			payload.append('route', busEditForm.route.trim());
			payload.append('regNo', busEditForm.regNo.trim());
			payload.append('seats', String(busEditForm.seats));
			payload.append('ownerName', busEditForm.ownerName.trim());
			payload.append('phoneNo', busEditForm.phoneNo.trim());
			payload.append('email', busEditForm.email.trim());
			payload.append('deviceId', busEditForm.deviceId.trim());
			if (busEditImage) payload.append('image', busEditImage);

			const response = await fetch(buildApiUrl(`/buses/${editingBus._id}`), {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('token')}`,
				},
				body: payload,
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || 'Failed to update bus');
			}

			await showSuccessAlert('Success', 'Bus updated successfully');
			closeBusEditModal();
			await fetchData();
		} catch (error) {
			await showErrorAlert('Update Failed', error.message || 'Failed to update bus');
		} finally {
			setBusSaving(false);
		}
	};

	const handleDriverFormChange = (e) => {
		const { name, value } = e.target;
		setDriverForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleSaveDriver = async () => {
		if (!driverForm.name.trim() || !driverForm.phone.trim() || !driverForm.licenseNumber.trim() || !driverForm.busId) {
			await showErrorAlert('Validation Error', 'Name, phone, license number and bus assignment are required');
			return;
		}

		setDriverSaving(true);
		try {
			const token = localStorage.getItem('token');
			const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
			const payload = {
				name: driverForm.name.trim(),
				phone: driverForm.phone.trim(),
				licenseNumber: driverForm.licenseNumber.trim(),
				busId: driverForm.busId,
				shift: driverForm.shift,
				status: driverForm.status,
				rating: Number(driverForm.rating) || 0,
			};

			const endpoint = editingDriver ? buildApiUrl(`/drivers/${editingDriver._id}`) : buildApiUrl('/drivers');
			const method = editingDriver ? 'PUT' : 'POST';

			const res = await fetch(endpoint, {
				method,
				headers: {
					'Content-Type': 'application/json',
					...authHeaders,
				},
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Failed to save driver');
			}

			await showSuccessAlert('Success', editingDriver ? 'Driver updated successfully' : 'Driver created successfully');
			closeDriverModal();
			await fetchData();
		} catch (error) {
			await showErrorAlert('Save Failed', error.message || 'Failed to save driver');
		} finally {
			setDriverSaving(false);
		}
	};

	const handleDeleteDriver = async (driver) => {
		const result = await showConfirmAlert('Delete Driver?', `Remove ${driver.name} from the system?`);
		if (!result.isConfirmed) return;

		try {
			const token = localStorage.getItem('token');
			const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
			const res = await fetch(buildApiUrl(`/drivers/${driver._id}`), {
				method: 'DELETE',
				headers: authHeaders,
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.message || 'Failed to delete driver');
			}

			await showSuccessAlert('Deleted', 'Driver deleted successfully');
			await fetchData();
		} catch (error) {
			await showErrorAlert('Delete Failed', error.message || 'Failed to delete driver');
		}
	};

	const renderSection = () => {
		const iotDeviceMap = knownIotDevices.reduce((acc, item) => {
			acc[item.deviceId] = item;
			return acc;
		}, {});

		const isDeviceOnline = (lastSeenAt) => {
			if (!lastSeenAt) return false;
			const ONLINE_WINDOW_MS = 5 * 60 * 1000;
			return Date.now() - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS;
		};

		const handleRegisterDevice = async () => {
			if (!selectedBusForDevice || !deviceRegistrationForm.deviceId.trim()) {
				await showErrorAlert('Validation Error', 'Please select a bus and enter a device ID');
				return;
			}

			setRegistering(true);
			try {
				const response = await fetch(buildApiUrl('/bus-device/register'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${localStorage.getItem('token')}`,
					},
					body: JSON.stringify({
						busId: selectedBusForDevice._id,
						deviceId: deviceRegistrationForm.deviceId.trim(),
					}),
				});

				const data = await response.json();
				if (!response.ok) {
					throw new Error(data.error || 'Failed to register device');
				}

				await showSuccessAlert('Success', `Device ${deviceRegistrationForm.deviceId} registered successfully!`);
				setShowDeviceModal(false);
				setDeviceRegistrationForm({ deviceId: '' });
				setSelectedBusForDevice(null);
				fetchData(); // Refresh data
			} catch (error) {
				await showErrorAlert('Registration Failed', error.message || 'Failed to register device');
			} finally {
				setRegistering(false);
			}
		};

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
										<th className="px-6 py-3">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{buses.length === 0 ? (
										<tr>
											<td colSpan="7" className="px-6 py-8 text-center text-[#6b4b3d]">
												No buses registered yet
											</td>
										</tr>
									) : (
										buses.map((bus) => (
											<tr key={bus._id} className="hover:bg-[#fff4ec]">
												<td className="px-6 py-3">
													<img 
														src={buildApiUrl(`/buses/${bus._id}/image`)}
														alt={bus.regNo}
														className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 border border-[#f2d9cc]"
														onClick={() => window.open(buildApiUrl(`/buses/${bus._id}/image`), '_blank')}
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
												<td className="px-6 py-3">
													<button
														onClick={() => openEditBusModal(bus)}
														className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3b82f6]/10 text-[#1d4ed8] hover:bg-[#3b82f6] hover:text-white text-xs font-medium"
													>
														<Pencil className="h-4 w-4" />
														Edit
													</button>
												</td>
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
													src={buildApiUrl(`/buses/${bus._id}/image`)}
													alt={bus.regNo}
													className="h-12 w-12 rounded object-cover cursor-pointer hover:opacity-80 border border-[#f2d9cc]"
													onClick={() => window.open(buildApiUrl(`/buses/${bus._id}/image`), '_blank')}
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

		if (active === 'busDevices') {
			// Find buses without device_id
			const busesWithoutDevices = buses.filter(bus => !bus.device_id);

			return (
				<div className="space-y-6">
					{/* Buses without devices - Warning section */}
					{busesWithoutDevices.length > 0 && (
						<div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
							<div className="flex items-start gap-4">
								<div className="text-yellow-600 text-2xl">⚠️</div>
								<div className="flex-1">
									<h3 className="font-semibold text-yellow-900 mb-2">Buses Without Device Registration ({busesWithoutDevices.length})</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
										{busesWithoutDevices.map((bus) => (
											<div key={bus._id} className="bg-white rounded-lg p-3 flex items-center justify-between border border-yellow-100">
												<div>
													<p className="font-medium text-sm text-[#2a1a15]">{bus.regNo}</p>

											{showBusEditModal && (
												<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
													<div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl border border-[#f2d9cc] max-h-[90vh] overflow-y-auto">
														<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
															<h3 className="text-lg font-semibold text-[#2a1a15]">Edit Bus</h3>
															<button onClick={closeBusEditModal} className="text-[#6b4b3d] hover:text-[#2a1a15]">
																<X className="h-5 w-5" />
															</button>
														</div>
														<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
															<div className="md:col-span-2">
																<label className="block text-sm text-[#2a1a15] mb-1">Bus Image</label>
																<input type="file" accept="image/*" onChange={handleBusEditFile} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
																<p className="text-xs text-[#6b4b3d] mt-1">Leave empty to keep the current image.</p>
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Route *</label>
																<input name="route" value={busEditForm.route} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Registration No *</label>
																<input name="regNo" value={busEditForm.regNo} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Seats *</label>
																<input name="seats" type="number" min="1" value={busEditForm.seats} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Device ID *</label>
																<select name="deviceId" value={busEditForm.deviceId} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg">
																	<option value="">Select device ID</option>
																	{knownIotDevices.map((d) => (
																		<option key={d.deviceId} value={d.deviceId}>{d.deviceId}</option>
																	))}
																</select>
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Owner Name *</label>
																<input name="ownerName" value={busEditForm.ownerName} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
															<div>
																<label className="block text-sm text-[#2a1a15] mb-1">Phone No *</label>
																<input name="phoneNo" value={busEditForm.phoneNo} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
															<div className="md:col-span-2">
																<label className="block text-sm text-[#2a1a15] mb-1">Email *</label>
																<input name="email" value={busEditForm.email} onChange={handleBusEditChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
															</div>
														</div>
														<div className="px-6 py-4 border-t border-[#f2d9cc] flex items-center justify-end gap-3">
															<button onClick={closeBusEditModal} className="px-4 py-2 border border-[#f2d9cc] rounded-lg text-[#6b4b3d] hover:bg-[#fff4ec]">Cancel</button>
															<button onClick={handleSaveBus} disabled={busSaving} className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a24] disabled:opacity-60">
																{busSaving ? 'Saving...' : 'Update Bus'}
															</button>
														</div>
													</div>
												</div>
											)}
													<p className="text-xs text-[#6b4b3d]">{bus.route}</p>
												</div>
												<button
													onClick={() => {
														setSelectedBusForDevice(bus);
														setShowDeviceModal(true);
													}}
													className="px-3 py-1 bg-[#ff6b35] text-white text-xs rounded font-medium hover:bg-[#e55a24]"
												>
													Register Device
												</button>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Bus-Device Registrations table */}
					<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
						<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Bus-Device Registrations</h3>
							<span className="text-sm text-[#6b4b3d]">{busDevices.length} mappings</span>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Bus Reg No</th>
										<th className="px-6 py-3">Route</th>
										<th className="px-6 py-3">Device ID</th>
										<th className="px-6 py-3">Live Status</th>
										<th className="px-6 py-3">Last Seen</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Registered At</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{busDevices.length === 0 ? (
										<tr>
											<td colSpan="7" className="px-6 py-8 text-center text-[#6b4b3d]">
												No bus-device mappings available
											</td>
										</tr>
									) : (
										busDevices.map((mapping) => (
											(() => {
												const iotInfo = iotDeviceMap[mapping.deviceId];
												const online = isDeviceOnline(iotInfo?.lastSeenAt);
												return (
											<tr key={mapping.id} className="hover:bg-[#fff4ec]">
												<td className="px-6 py-3 font-medium">{mapping.busRegNo || '-'}</td>
												<td className="px-6 py-3">{mapping.busRoute || '-'}</td>
												<td className="px-6 py-3">{mapping.deviceId}</td>
												<td className="px-6 py-3">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold ${
															online
																? 'bg-[#10b981]/10 text-[#0f5132]'
																: 'bg-[#9ca3af]/20 text-[#374151]'
														}`}
													>
														{online ? 'Online' : 'Offline'}
													</span>
												</td>
												<td className="px-6 py-3">
													{iotInfo?.lastSeenAt ? new Date(iotInfo.lastSeenAt).toLocaleString() : 'No telemetry'}
												</td>
												<td className="px-6 py-3">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold ${
															mapping.isActive
																? 'bg-[#10b981]/10 text-[#0f5132]'
																: 'bg-[#ef4444]/10 text-[#991b1b]'
														}`}
													>
														{mapping.isActive ? 'Active' : 'Inactive'}
													</span>
												</td>
												<td className="px-6 py-3">
													{mapping.registeredAt ? new Date(mapping.registeredAt).toLocaleString() : '-'}
												</td>
											</tr>
												);
											})()
										))
									)}
								</tbody>
							</table>
						</div>
					</div>

					{/* Device Registration Modal */}
					{showDeviceModal && (
						<div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
							<div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
								<h3 className="text-lg font-semibold text-[#2a1a15] mb-4">Register Device for Bus</h3>
								{selectedBusForDevice && (
									<div className="mb-4 p-3 bg-[#fff4ec] rounded-lg border border-[#f2d9cc]">
										<p className="text-sm text-[#6b4b3d]"><strong>Bus:</strong> {selectedBusForDevice.regNo}</p>
										<p className="text-sm text-[#6b4b3d]"><strong>Route:</strong> {selectedBusForDevice.route}</p>
									</div>
								)}
								<div className="mb-4">
									<label className="block text-sm font-medium text-[#2a1a15] mb-2">Device ID</label>
									<input
										type="text"
										value={deviceRegistrationForm.deviceId}
										onChange={(e) => setDeviceRegistrationForm({ deviceId: e.target.value })}
										placeholder="e.g., ESP32_WROOM_DA_01"
										className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									/>
								</div>
								<div className="flex gap-3">
									<button
										onClick={() => {
											setShowDeviceModal(false);
											setDeviceRegistrationForm({ deviceId: '' });
											setSelectedBusForDevice(null);
										}}
										className="flex-1 px-4 py-2 border border-[#f2d9cc] rounded-lg text-[#6b4b3d] hover:bg-[#fff4ec]"
									>
										Cancel
									</button>
									<button
										onClick={handleRegisterDevice}
										disabled={registering}
										className="flex-1 px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a24] disabled:opacity-50"
									>
										{registering ? 'Registering...' : 'Register'}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			);
		}

		if (active === 'driverDetails') {
			return (
				<div className="space-y-6">
					<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
						<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Driver Details</h3>
							<div className="flex items-center gap-3">
								<span className="text-sm text-[#6b4b3d]">{drivers.length} drivers</span>
								<button
									onClick={openCreateDriverModal}
									className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff6b35] text-white text-sm font-medium hover:bg-[#e55a24]"
								>
									<Plus className="h-4 w-4" />
									Add Driver
								</button>
							</div>
						</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Driver</th>
									<th className="px-6 py-3">Assigned Bus</th>
									<th className="px-6 py-3">License</th>
									<th className="px-6 py-3">Shift</th>
									<th className="px-6 py-3">Rating</th>
									<th className="px-6 py-3">Phone</th>
									<th className="px-6 py-3">Status</th>
									<th className="px-6 py-3">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{drivers.length === 0 ? (
									<tr>
										<td colSpan="8" className="px-6 py-8 text-center text-[#6b4b3d]">
											No drivers registered yet
										</td>
									</tr>
								) : (
									drivers.map((driver) => (
										<tr key={driver._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3 font-medium">{driver.name}</td>
											<td className="px-6 py-3">
												{driver.busId ? `${driver.busId.regNo || 'Assigned'}${driver.busId.route ? ` - ${driver.busId.route}` : ''}` : 'Not assigned'}
											</td>
											<td className="px-6 py-3">{driver.licenseNumber}</td>
											<td className="px-6 py-3">{driver.shift}</td>
											<td className="px-6 py-3">{Number(driver.rating || 0).toFixed(1)}</td>
											<td className="px-6 py-3">{driver.phone}</td>
											<td className="px-6 py-3">
												<span className={`px-3 py-1 rounded-full text-xs font-semibold ${
													driver.status === 'active'
														? 'bg-[#10b981]/10 text-[#0f5132]'
														: driver.status === 'inactive'
														? 'bg-[#ef4444]/10 text-[#991b1b]'
														: 'bg-[#f59e0b]/10 text-[#b45309]'
												}`}>
													{driver.status}
												</span>
											</td>
											<td className="px-6 py-3">
												<div className="flex items-center gap-2">
													<button
														onClick={() => openEditDriverModal(driver)}
														className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#3b82f6]/10 text-[#1d4ed8] hover:bg-[#3b82f6] hover:text-white"
														title="Edit"
													>
														<Pencil className="h-4 w-4" />
													</button>
													<button
														onClick={() => handleDeleteDriver(driver)}
														className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-[#ef4444]/10 text-[#dc2626] hover:bg-[#ef4444] hover:text-white"
														title="Delete"
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
					{showDriverModal && (
						<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
							<div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl border border-[#f2d9cc]">
								<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
									<h3 className="text-lg font-semibold text-[#2a1a15]">{editingDriver ? 'Edit Driver' : 'Add Driver'}</h3>
									<button onClick={closeDriverModal} className="text-[#6b4b3d] hover:text-[#2a1a15]">
										<X className="h-5 w-5" />
									</button>
								</div>
								<div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">Name *</label>
										<input name="name" value={driverForm.name} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
									</div>
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">Phone *</label>
										<input name="phone" value={driverForm.phone} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
									</div>
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">License Number *</label>
										<input name="licenseNumber" value={driverForm.licenseNumber} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
									</div>
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">Assigned Bus *</label>
										<select name="busId" value={driverForm.busId} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg">
											<option value="">Select a bus</option>
											{driverBuses.map((bus) => (
												<option key={bus._id} value={bus._id}>{bus.regNo} - {bus.route}</option>
											))}
										</select>
									</div>
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">Shift</label>
										<select name="shift" value={driverForm.shift} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg">
											<option value="Morning">Morning</option>
											<option value="Evening">Evening</option>
											<option value="Night">Night</option>
											<option value="Maintenance">Maintenance</option>
										</select>
									</div>
									<div>
										<label className="block text-sm text-[#2a1a15] mb-1">Status</label>
										<select name="status" value={driverForm.status} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg">
											<option value="active">Active</option>
											<option value="inactive">Inactive</option>
											<option value="on-leave">On Leave</option>
										</select>
									</div>
									<div className="md:col-span-2">
										<label className="block text-sm text-[#2a1a15] mb-1">Rating (0-5)</label>
										<input name="rating" type="number" min="0" max="5" step="0.1" value={driverForm.rating} onChange={handleDriverFormChange} className="w-full px-3 py-2 border border-[#f2d9cc] rounded-lg" />
									</div>
								</div>
								<div className="px-6 py-4 border-t border-[#f2d9cc] flex items-center justify-end gap-3">
									<button onClick={closeDriverModal} className="px-4 py-2 border border-[#f2d9cc] rounded-lg text-[#6b4b3d] hover:bg-[#fff4ec]">Cancel</button>
									<button onClick={handleSaveDriver} disabled={driverSaving} className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a24] disabled:opacity-60">
										{driverSaving ? 'Saving...' : editingDriver ? 'Update Driver' : 'Create Driver'}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		);
		}

		if (active === 'complaints') {
			return (
				<div className="space-y-6">
					{/* Complaints Stats */}
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
						<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
							<p className="text-sm text-[#6b4b3d]">Total Complaints</p>
							<p className="text-2xl font-semibold text-[#2a1a15]">{complaints.length}</p>
						</div>
						<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
							<p className="text-sm text-[#6b4b3d]">Open</p>
							<p className="text-2xl font-semibold text-[#ef4444]">{complaints.filter(c => c.status === 'Open').length}</p>
						</div>
						<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
							<p className="text-sm text-[#6b4b3d]">In Review</p>
							<p className="text-2xl font-semibold text-[#f59e0b]">{complaints.filter(c => c.status === 'In Review').length}</p>
						</div>
						<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
							<p className="text-sm text-[#6b4b3d]">Resolved</p>
							<p className="text-2xl font-semibold text-[#10b981]">{complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}</p>
						</div>
					</div>

					{/* Complaints Table */}
					<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
						<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Complaint Tickets</h3>
							<span className="text-sm text-[#6b4b3d]">{complaints.length} total</span>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Ticket ID</th>
										<th className="px-6 py-3">Category</th>
										<th className="px-6 py-3">Priority</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Filed Date</th>
										<th className="px-6 py-3">Description</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{complaints.length === 0 ? (
										<tr>
											<td colSpan="6" className="px-6 py-8 text-center text-[#6b4b3d]">
												No complaints filed yet
											</td>
										</tr>
									) : (
										complaints.map((complaint) => (
											<tr key={complaint._id} className="hover:bg-[#fff4ec]">
												<td className="px-6 py-3 font-medium">{complaint.ticketId || 'N/A'}</td>
												<td className="px-6 py-3">{complaint.category || 'General'}</td>
												<td className="px-6 py-3">
													<span
														className={`px-3 py-1 rounded-full text-xs font-semibold ${
															complaint.priority === 'High'
																? 'bg-[#ef4444]/10 text-[#991b1b]'
																: complaint.priority === 'Medium'
																? 'bg-[#f59e0b]/10 text-[#b45309]'
																: 'bg-[#3b82f6]/10 text-[#0c4a6e]'
														}`}
													>
														{complaint.priority || 'Low'}
													</span>
												</td>
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
														{complaint.status || 'Open'}
													</span>
												</td>
												<td className="px-6 py-3 text-xs">{new Date(complaint.createdAt).toLocaleDateString()}</td>
												<td className="px-6 py-3 max-w-xs whitespace-nowrap overflow-hidden text-ellipsis">{complaint.description || complaint.summary}</td>
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

		return (
			<div className="space-y-6">
				{/* Feedbacks Stats */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
					<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
						<p className="text-sm text-[#6b4b3d]">Total Feedbacks</p>
						<p className="text-2xl font-semibold text-[#2a1a15]">{feedbacks.length}</p>
					</div>
					<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
						<p className="text-sm text-[#6b4b3d]">Positive</p>
						<p className="text-2xl font-semibold text-[#10b981]">{feedbacks.filter(f => f.rating >= 4).length}</p>
					</div>
					<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
						<p className="text-sm text-[#6b4b3d]">Neutral</p>
						<p className="text-2xl font-semibold text-[#f59e0b]">{feedbacks.filter(f => f.rating === 3).length}</p>
					</div>
					<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
						<p className="text-sm text-[#6b4b3d]">Negative</p>
						<p className="text-2xl font-semibold text-[#ef4444]">{feedbacks.filter(f => f.rating < 3).length}</p>
					</div>
				</div>

				{/* Feedbacks Table */}
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
					<div className="px-6 py-4 border-b border-[#f2d9cc] flex items-center justify-between">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Customer Feedback Reviews</h3>
						<span className="text-sm text-[#6b4b3d]">{feedbacks.length} total</span>
					</div>
					<div className="overflow-x-auto">
						<table className="min-w-full text-left">
							<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
								<tr>
									<th className="px-6 py-3">Bus & Driver</th>
									<th className="px-6 py-3">Passenger</th>
									<th className="px-6 py-3">Rating</th>
									<th className="px-6 py-3">Feedback</th>
									<th className="px-6 py-3">Date</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
								{feedbacks.length === 0 ? (
									<tr>
										<td colSpan="5" className="px-6 py-8 text-center text-[#6b4b3d]">
											No feedbacks submitted yet
										</td>
									</tr>
								) : (
									feedbacks.map((feedback) => {
										const getRatingBgColor = (rating) => {
											if (!rating) return 'bg-gray-100';
											if (rating >= 5) return 'bg-[#10b981]/10 text-[#0f5132]';
											if (rating >= 4) return 'bg-[#3b82f6]/10 text-[#0c4a6e]';
											if (rating >= 3) return 'bg-[#f59e0b]/10 text-[#b45309]';
											return 'bg-[#ef4444]/10 text-[#991b1b]';
										};
										const getRatingColor = (rating) => {
											if (!rating) return 'text-gray-500';
											if (rating >= 5) return 'text-[#10b981]';
											if (rating >= 4) return 'text-[#3b82f6]';
											if (rating >= 3) return 'text-[#f59e0b]';
											return 'text-[#ef4444]';
										};
										return (
											<tr key={feedback._id} className="hover:bg-[#fff4ec]">
												<td className="px-6 py-3">
													<div className="font-semibold">{feedback.busRegNo || 'N/A'}</div>
													<div className="text-xs text-[#6b4b3d]">{feedback.driverName || 'N/A'}</div>
												</td>
												<td className="px-6 py-3">{feedback.passengerName || 'Anonymous'}</td>
												<td className="px-6 py-3">
													<span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRatingBgColor(feedback.rating)}`}>
														⭐ {feedback.rating || 'N/A'}
													</span>
												</td>
												<td className="px-6 py-3 max-w-xs whitespace-nowrap overflow-hidden text-ellipsis text-[#6b4b3d]">{feedback.feedback}</td>
												<td className="px-6 py-3 text-xs text-[#6b4b3d]">{new Date(feedback.createdAt || feedback.date).toLocaleDateString()}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
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
					<PageBackButton to="/access" label="Back to Access" />
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
