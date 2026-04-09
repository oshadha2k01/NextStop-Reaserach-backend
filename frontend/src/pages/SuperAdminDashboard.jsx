import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusFront, CheckCircle, XCircle, AlertCircle, Info, Check, Trash2, Search, User, MessageSquare, Star, Loader, TrendingUp, Activity } from 'lucide-react';
import { busAPI, complaintAPI, feedbackAPI, monitoringAPI } from '../utils/api';
import Feedbacks from './Feedbacks';
import { showErrorAlert, showSuccessAlert, showConfirmAlert, showWarningAlert } from '../utils/alerts';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const DEFAULT_BUS_IMAGE = 'https://images.unsplash.com/photo-1464219414925-ead315e28213?w=400&h=300&fit=crop';

export default function SuperAdminDashboard() {
	const navigate = useNavigate();
	const [isAuthenticated, setIsAuthenticated] = useState(null);

	// Auth check useEffect - runs FIRST
	useEffect(() => {
		const token = localStorage.getItem('token');
		const userRole = localStorage.getItem('userRole');

		if (!token || userRole !== 'superadmin') {
			showErrorAlert('Access Denied', 'Please log in as SuperAdmin first');
			navigate('/superadminlogin', { replace: true });
		} else {
			setIsAuthenticated(true);
		}
	}, [navigate]);

	const dummyBuses = [
		{
			_id: '1',
			regNo: 'DL-01-AB-1234',
			route: 'Route 5 (Central)',
			driverName: 'Anita Rao',
			seats: 42,
			approvalStatus: 'pending',
			rejectionReason: null,
			createdAt: '2026-01-02',
			image: 'https://images.unsplash.com/photo-1464219414925-ead315e28213?w=400&h=300&fit=crop',
		},
		{
			_id: '2',
			regNo: 'DL-02-CD-5678',
			route: 'Route 12 (North)',
			driverName: 'Michael Chen',
			seats: 38,
			approvalStatus: 'pending',
			rejectionReason: null,
			createdAt: '2026-01-03',
			image: 'https://images.unsplash.com/photo-1464219414927-32a27a02dc3a?w=400&h=300&fit=crop',
		},
		{
			_id: '3',
			regNo: 'DL-03-EF-9012',
			route: 'Route 2 (South)',
			driverName: 'David Singh',
			seats: 40,
			approvalStatus: 'approved',
			rejectionReason: null,
			createdAt: '2026-01-01',
			image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
		},
		{
			_id: '4',
			regNo: 'DL-04-GH-3456',
			route: 'Route 8 (East)',
			driverName: 'Priya Sharma',
			seats: 45,
			approvalStatus: 'approved',
			rejectionReason: null,
			createdAt: '2025-12-30',
			image: 'https://images.unsplash.com/photo-1464219414924-32a27a02dc3b?w=400&h=300&fit=crop',
		},
		{
			_id: '5',
			regNo: 'DL-05-IJ-7890',
			route: 'Route 15 (West)',
			driverName: 'Rajesh Kumar',
			seats: 50,
			approvalStatus: 'rejected',
			rejectionReason: 'Bus condition does not meet safety standards. Vehicle requires maintenance before approval.',
			createdAt: '2025-12-28',
			image: 'https://images.unsplash.com/photo-1464219414925-ead315e28211?w=400&h=300&fit=crop',
		},
		{
			_id: '6',
			regNo: 'DL-06-KL-2345',
			route: 'Route 20 (Airport)',
			driverName: 'Sarah Williams',
			seats: 48,
			approvalStatus: 'rejected',
			rejectionReason: 'Driver documentation incomplete. Please resubmit with valid license and background check.',
			createdAt: '2025-12-25',
			image: 'https://images.unsplash.com/photo-1464219414926-ead315e28212?w=400&h=300&fit=crop',
		},
	];

	const [buses, setBuses] = useState(dummyBuses);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [showRejectModal, setShowRejectModal] = useState(false);
	const [selectedBusId, setSelectedBusId] = useState(null);
	const [rejectReason, setRejectReason] = useState('');
	const [actionLoading, setActionLoading] = useState(false);
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	const [selectedBusDetails, setSelectedBusDetails] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [showComplaintsModal, setShowComplaintsModal] = useState(false);
	const [showFeedbacksModal, setShowFeedbacksModal] = useState(false);
	const [selectedDriverForModal, setSelectedDriverForModal] = useState(null);
	const [activeNav, setActiveNav] = useState('approvals');
	const [complaintsSearchQuery, setComplaintsSearchQuery] = useState('');
	const [driversSearchQuery, setDriversSearchQuery] = useState('');
	const [feedbacksSearchQuery, setFeedbacksSearchQuery] = useState('');

	// Real-Time Monitoring states
	const [monitoringBuses, setMonitoringBuses] = useState([]);
	const [monitoringLoading, setMonitoringLoading] = useState(false);
	const [monitoringError, setMonitoringError] = useState('');
	const [monitoringSearchQuery, setMonitoringSearchQuery] = useState('');
	const [monitoringStatusFilter, setMonitoringStatusFilter] = useState('all'); // all, active, maintenance, flagged
	const [complaints, setComplaints] = useState([]);
	const [complaintsLoading, setComplaintsLoading] = useState(false);

	useEffect(() => {
		fetchBuses();
		loadComplaintsData();
		// Load monitoring data on component mount
		loadMonitoringData();
		// Refresh monitoring data every 30 seconds
		const interval = setInterval(() => {
			loadMonitoringData();
			loadComplaintsData();
		}, 30000);
		return () => clearInterval(interval);
	}, []);

	const getBusImageUrl = (bus) => {
		if (!bus?._id) return DEFAULT_BUS_IMAGE;
		return `${API_BASE_URL}/buses/${bus._id}/image`;
	};

	const fetchBuses = async () => {
		try {
			setLoading(true);
			const data = await busAPI.getAllBuses();
			setBuses(data || []);
			setError('');
		} catch (err) {
			setError(err.message || 'Failed to fetch buses');
		} finally {
			setLoading(false);
		}
	};

	const loadMonitoringData = async () => {
		try {
			setMonitoringLoading(true);
			setMonitoringError('');
			const data = await monitoringAPI.getRealTimeBusMonitoring();
			setMonitoringBuses(data || []);
		} catch (err) {
			setMonitoringError(err.message || 'Failed to load monitoring data');
			showErrorAlert('Monitoring Error', err.message || 'Could not load real-time data');
		} finally {
			setMonitoringLoading(false);
		}
	};

	const loadComplaintsData = async () => {
		try {
			setComplaintsLoading(true);
			const data = await complaintAPI.getAll();
			setComplaints(Array.isArray(data) ? data : []);
		} catch (err) {
			setComplaints([]);
		} finally {
			setComplaintsLoading(false);
		}
	};

	const handleApprove = async (busId) => {
		try {
			setActionLoading(true);
			await busAPI.approveBus(busId);
			await fetchBuses();
			await showSuccessAlert('Success', 'Bus approved successfully!');
		} catch (err) {
			await showErrorAlert('Approve Failed', err.message || 'Failed to approve bus');
		} finally {
			setActionLoading(false);
		}
	};

	const handleRejectClick = (busId) => {
		setSelectedBusId(busId);
		setRejectReason('');
		setShowRejectModal(true);
	};

	const handleRemoveBus = async (bus) => {
		const result = await showConfirmAlert(
			'Remove Bus?',
			`Are you sure you want to remove ${bus.regNo}? This action cannot be undone.`
		);

		if (!result.isConfirmed) return;

		try {
			setActionLoading(true);
			await busAPI.deleteBus(bus._id);
			await fetchBuses();
			await loadMonitoringData();
			await showSuccessAlert('Removed', `${bus.regNo} removed successfully`);
		} catch (err) {
			await showErrorAlert('Remove Failed', err.message || 'Failed to remove bus');
		} finally {
			setActionLoading(false);
		}
	};

	const handleViewDetails = (bus) => {
		setSelectedBusDetails(bus);
		setShowDetailsModal(true);
	};

	const handleRejectSubmit = async () => {
		if (!rejectReason.trim()) {
			await showErrorAlert('Validation Error', 'Please provide a rejection reason');
			return;
		}

		try {
			setActionLoading(true);
			await busAPI.rejectBus(selectedBusId, rejectReason);
			await fetchBuses();
			setShowRejectModal(false);
			setSelectedBusId(null);
			setRejectReason('');
			await showSuccessAlert('Success', 'Bus rejected successfully!');
		} catch (err) {
			await showErrorAlert('Reject Failed', err.message || 'Failed to reject bus');
		} finally {
			setActionLoading(false);
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'approved':
				return 'bg-[#10b981]/10 text-[#0f5132]';
			case 'rejected':
				return 'bg-[#ef4444]/10 text-[#991b1b]';
			default:
				return 'bg-[#f59e0b]/10 text-[#b45309]';
		}
	};

	const getStatusIcon = (status) => {
		switch (status) {
			case 'approved':
				return <CheckCircle className="h-4 w-4" />;
			case 'rejected':
				return <XCircle className="h-4 w-4" />;
			default:
				return <AlertCircle className="h-4 w-4" />;
		}
	};

	const handleViewDriverDetails = (bus) => {
		setSelectedDriverForModal(bus);
	};

	const handleViewComplaints = (bus) => {
		setSelectedDriverForModal(bus);
		setShowComplaintsModal(true);
	};

	const handleViewFeedbacks = (bus) => {
		setSelectedDriverForModal(bus);
		setShowFeedbacksModal(true);
	};

	// Filter buses by search query
	const filteredBuses = buses.filter((bus) =>
		bus.regNo.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const pendingBuses = buses.filter((b) => b.approvalStatus === 'pending');
	const approvedBuses = buses.filter((b) => b.approvalStatus === 'approved');
	const rejectedBuses = buses.filter((b) => b.approvalStatus === 'rejected');
	const filteredComplaints = complaints.filter((complaint) => {
		const query = complaintsSearchQuery.toLowerCase().trim();
		if (!query) return true;
		return (
			String(complaint.title || '').toLowerCase().includes(query)
			|| String(complaint.description || complaint.message || '').toLowerCase().includes(query)
			|| String(complaint.busId || complaint.bus_id || '').toLowerCase().includes(query)
			|| String(complaint.driverId || complaint.driver_id || '').toLowerCase().includes(query)
		);
	});
	const warningItems = monitoringBuses
		.filter((bus) => bus.operationalStatus === 'flagged' || bus.operationalStatus === 'maintenance')
		.map((bus) => {
			const reasons = [];
			if (bus.complaints?.highPriority > 0) reasons.push('High-priority complaints');
			if ((bus.complaints?.total || 0) > 5) reasons.push('Too many complaints');
			if ((Number(bus.feedback?.averageRating) || 0) < 3) reasons.push('Low feedback rating');
			return {
				...bus,
				reasons: reasons.length ? reasons : ['Operational risk detected'],
			};
		});

	// Keep this check after all hooks are declared to avoid hook-order runtime errors.
	if (isAuthenticated === null || isAuthenticated === false) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-[#fff4ec] to-[#f2d9cc] flex items-center justify-center">
				<div className="text-center">
					<Loader className="h-12 w-12 text-[#ff6b35] animate-spin mx-auto mb-4" />
					<p className="text-[#2a1a15] font-semibold">Redirecting to login...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#fff4ec] text-[#2a1a15]">
			<div className="flex min-h-screen">
				{/* Sidebar */}
				<aside className="w-64 bg-[#ff6b35] text-white flex flex-col">
					<div className="px-6 py-5 border-b border-white/20">
						<h1 className="text-xl font-bold">Super Admin</h1>
						<p className="text-sm text-white/80">Bus Approval Panel</p>
					</div>
				<nav className="flex-1 py-4 space-y-2 px-3">
					<button 
						onClick={() => setActiveNav('approvals')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'approvals' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<BusFront className="h-5 w-5" />
						<span className="font-medium">Bus Approvals</span>
					</button>
					<button 
						onClick={() => setActiveNav('monitoring')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'monitoring' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<Activity className="h-5 w-5" />
						<span className="font-medium">Monitoring</span>
					</button>
					<button 
						onClick={() => setActiveNav('buses')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'buses' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<Trash2 className="h-5 w-5" />
						<span className="font-medium">Manage Buses</span>
					</button>
					<button 
						onClick={() => setActiveNav('complaints')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'complaints' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<MessageSquare className="h-5 w-5" />
						<span className="font-medium">Complaints</span>
					</button>
					<button 
						onClick={() => setActiveNav('warnings')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'warnings' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<AlertCircle className="h-5 w-5" />
						<span className="font-medium">Warnings</span>
					</button>
					<button 
						onClick={() => setActiveNav('feedbacks')}
						className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-all ${
							activeNav === 'feedbacks' 
								? 'bg-white text-[#ff6b35] shadow-sm' 
								: 'text-white hover:bg-white/10'
						}`}
					>
						<Star className="h-5 w-5" />
						<span className="font-medium">Feedbacks</span>
					</button>
					</nav>
				</aside>

				{/* Main Content */}
				{activeNav === 'approvals' && (
					<main className="flex-1 p-6 sm:p-10 space-y-6">
						<div>
							<p className="text-sm text-[#6b4b3d]">Control Center</p>
							<h2 className="text-2xl font-semibold">Bus Registration Approvals</h2>
						</div>

						{/* Stats */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4 flex items-center justify-between">
								<div>
									<p className="text-sm text-[#6b4b3d]">Pending Approval</p>
									<p className="text-2xl font-semibold text-[#2a1a15]">{pendingBuses.length}</p>
								</div>
								<AlertCircle className="h-8 w-8 text-[#f59e0b]" />
							</div>
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4 flex items-center justify-between">
								<div>
									<p className="text-sm text-[#6b4b3d]">Approved</p>
									<p className="text-2xl font-semibold text-[#2a1a15]">{approvedBuses.length}</p>
								</div>
								<CheckCircle className="h-8 w-8 text-[#10b981]" />
							</div>
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4 flex items-center justify-between">
								<div>
									<p className="text-sm text-[#6b4b3d]">Rejected</p>
									<p className="text-2xl font-semibold text-[#2a1a15]">{rejectedBuses.length}</p>
								</div>
								<XCircle className="h-8 w-8 text-[#ef4444]" />
							</div>
						</div>

						{/* Loading State */}
						{loading && (
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-8 text-center">
								<p className="text-[#6b4b3d]">Loading buses...</p>
							</div>
						)}

						{/* Error State */}
						{error && !loading && (
							<div className="rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 p-4 text-[#991b1b]">
								<p>{error}</p>
								<button
									onClick={fetchBuses}
									className="mt-2 px-3 py-1 bg-[#ef4444] text-white rounded text-sm hover:bg-[#dc2626]"
								>
									Retry
								</button>
							</div>
						)}

						{/* Pending Buses */}
						{!loading && !error && (
							<>
								<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
									<div className="px-6 py-4 border-b border-[#f2d9cc]">
										<h3 className="text-lg font-semibold text-[#2a1a15]">Pending Bus Registrations</h3>
										<p className="text-sm text-[#6b4b3d]">Review and approve or reject new bus registrations</p>
									</div>

									{pendingBuses.length === 0 ? (
										<div className="px-6 py-8 text-center text-[#6b4b3d]">
											<p>No pending bus approvals</p>
										</div>
									) : (
										<div className="overflow-x-auto">
											<table className="min-w-full text-left">
												<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
													<tr>
														<th className="px-6 py-3">Image</th>
														<th className="px-6 py-3">Reg No</th>
														<th className="px-6 py-3">Route</th>
														<th className="px-6 py-3">Driver</th>
														<th className="px-6 py-3">Seats</th>
														<th className="px-6 py-3">Status</th>
														<th className="px-6 py-3">Actions</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
													{pendingBuses.map((bus) => (
														<tr key={bus._id} className="hover:bg-[#fff4ec]">
															<td className="px-6 py-3"><img src={getBusImageUrl(bus)} onError={(e) => { e.currentTarget.src = DEFAULT_BUS_IMAGE; }} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
															<td className="px-6 py-3 font-medium">{bus.regNo}</td>
															<td className="px-6 py-3">{bus.route}</td>
															<td className="px-6 py-3">{bus.driverName}</td>
															<td className="px-6 py-3">{bus.seats}</td>
															<td className="px-6 py-3">
																<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bus.approvalStatus)}`}>
																	{getStatusIcon(bus.approvalStatus)}
																	{bus.approvalStatus === 'pending' ? 'Pending' : bus.approvalStatus}
																</span>
															</td>
															<td className="px-6 py-3 space-x-2">
																<button
																	onClick={() => handleViewDetails(bus)}
																	className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all duration-200"
																	disabled={actionLoading}
																	title="View Details"
																>
																	<Info className="h-4 w-4" />
																</button>
																<button
																	onClick={() => handleApprove(bus._id)}
																	disabled={actionLoading}
																	className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white transition-all duration-200"
																	title="Approve Bus"
																>
																	<Check className="h-4 w-4" />
																</button>
																<button
																	onClick={() => handleRejectClick(bus._id)}
																	disabled={actionLoading}
																	className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white transition-all duration-200"
																	title="Reject Bus"
																>
																	<Trash2 className="h-4 w-4" />
																</button>
															</td>
														</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>

							{/* Approved Buses */}
							<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
								<div className="px-6 py-4 border-b border-[#f2d9cc]">
									<h3 className="text-lg font-semibold text-[#2a1a15]">Approved Buses</h3>
									<p className="text-sm text-[#6b4b3d]">{approvedBuses.length} buses approved</p>
								</div>
								{approvedBuses.length === 0 ? (
									<div className="px-6 py-8 text-center text-[#6b4b3d]">
										<p>No approved buses yet</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="min-w-full text-left">
											<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
												<tr>
													<th className="px-6 py-3">Image</th>
													<th className="px-6 py-3">Reg No</th>
													<th className="px-6 py-3">Route</th>
													<th className="px-6 py-3">Driver</th>
													<th className="px-6 py-3">Seats</th>
													<th className="px-6 py-3">Status</th>
													<th className="px-6 py-3">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
												{approvedBuses.map((bus) => (
													<tr key={bus._id} className="hover:bg-[#fff4ec]">
														<td className="px-6 py-3"><img src={getBusImageUrl(bus)} onError={(e) => { e.currentTarget.src = DEFAULT_BUS_IMAGE; }} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
														<td className="px-6 py-3 font-medium">{bus.regNo}</td>
														<td className="px-6 py-3">{bus.route}</td>
														<td className="px-6 py-3">{bus.driverName}</td>
														<td className="px-6 py-3">{bus.seats}</td>
														<td className="px-6 py-3">
															<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bus.approvalStatus)}`}>
																{getStatusIcon(bus.approvalStatus)}
																Approved
															</span>
														</td>
														<td className="px-6 py-3">
															<button
																onClick={() => handleViewDetails(bus)}
																className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all duration-200"
																title="View Details"
															>
																<Info className="h-4 w-4" />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>

							{/* Rejected Buses */}
							<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc]">
								<div className="px-6 py-4 border-b border-[#f2d9cc]">
									<h3 className="text-lg font-semibold text-[#2a1a15]">Rejected Buses</h3>
									<p className="text-sm text-[#6b4b3d]">{rejectedBuses.length} buses rejected</p>
								</div>
								{rejectedBuses.length === 0 ? (
									<div className="px-6 py-8 text-center text-[#6b4b3d]">
										<p>No rejected buses</p>
									</div>
								) : (
									<div className="overflow-x-auto">
										<table className="min-w-full text-left">
											<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
												<tr>
													<th className="px-6 py-3">Image</th>
													<th className="px-6 py-3">Reg No</th>
													<th className="px-6 py-3">Route</th>
													<th className="px-6 py-3">Driver</th>
													<th className="px-6 py-3">Seats</th>
													<th className="px-6 py-3">Status</th>
													<th className="px-6 py-3">Rejection Reason</th>
													<th className="px-6 py-3">Actions</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
												{rejectedBuses.map((bus) => (
													<tr key={bus._id} className="hover:bg-[#fff4ec]">
														<td className="px-6 py-3"><img src={getBusImageUrl(bus)} onError={(e) => { e.currentTarget.src = DEFAULT_BUS_IMAGE; }} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
														<td className="px-6 py-3 font-medium">{bus.regNo}</td>
														<td className="px-6 py-3">{bus.route}</td>
														<td className="px-6 py-3">{bus.driverName}</td>
														<td className="px-6 py-3">{bus.seats}</td>
														<td className="px-6 py-3">
															<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(bus.approvalStatus)}`}>
																{getStatusIcon(bus.approvalStatus)}
																Rejected
															</span>
														</td>
														<td className="px-6 py-3 text-xs max-w-xs">{bus.rejectionReason || '—'}</td>
														<td className="px-6 py-3">
															<button
																onClick={() => handleViewDetails(bus)}
																className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-all duration-200"
																title="View Details"
															>
																<Info className="h-4 w-4" />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						</>
						)}
					</main>
				)}

				{activeNav === 'monitoring' && (
					<main className="flex-1 p-6 sm:p-10 space-y-6">
						<div>
							<p className="text-sm text-[#6b4b3d]">System Health</p>
							<h2 className="text-2xl font-semibold">Real-Time Bus Monitoring</h2>
						</div>

						{/* Monitoring Stats */}
						<div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
								<p className="text-sm text-[#6b4b3d]">Total Active</p>
								<p className="text-2xl font-semibold text-[#2a1a15]">{monitoringBuses.filter(b => b.operationalStatus === 'active').length}</p>
								<p className="text-xs text-[#10b981] mt-1">✓ Operational</p>
							</div>
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
								<p className="text-sm text-[#6b4b3d]">Maintenance</p>
								<p className="text-2xl font-semibold text-[#2a1a15]">{monitoringBuses.filter(b => b.operationalStatus === 'maintenance').length}</p>
								<p className="text-xs text-[#f59e0b] mt-1">⚠ Attention Needed</p>
							</div>
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
								<p className="text-sm text-[#6b4b3d]">Flagged</p>
								<p className="text-2xl font-semibold text-[#2a1a15]">{monitoringBuses.filter(b => b.operationalStatus === 'flagged').length}</p>
								<p className="text-xs text-[#ef4444] mt-1">🔴 Critical</p>
							</div>
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-4">
								<p className="text-sm text-[#6b4b3d]">Total Buses</p>
								<p className="text-2xl font-semibold text-[#2a1a15]">{monitoringBuses.length}</p>
								<p className="text-xs text-[#2a1a15] mt-1">📊 Fleet Size</p>
							</div>
						</div>

						{/* Filters */}
						<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
							<div className="flex-1">
								<div className="relative">
									<Search className="absolute left-3 top-3 h-5 w-5 text-[#6b4b3d]" />
									<input
										type="text"
										placeholder="Search by registration number or driver name..."
										value={monitoringSearchQuery}
										onChange={(e) => setMonitoringSearchQuery(e.target.value)}
										className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#f2d9cc] focus:outline-none focus:border-[#ff6b35]"
									/>
								</div>
							</div>
							<select
								value={monitoringStatusFilter}
								onChange={(e) => setMonitoringStatusFilter(e.target.value)}
								className="px-4 py-2 rounded-lg border border-[#f2d9cc] focus:outline-none focus:border-[#ff6b35] bg-white"
							>
								<option value="all">All Status</option>
								<option value="active">Active</option>
								<option value="maintenance">Maintenance</option>
								<option value="flagged">Flagged</option>
							</select>
							<button
								onClick={loadMonitoringData}
								className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#e55a24] transition-all"
							>
								⟳ Refresh
							</button>
						</div>

						{/* Loading State */}
						{monitoringLoading && (
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-8 text-center">
								<Loader className="h-8 w-8 text-[#ff6b35] animate-spin mx-auto mb-2" />
								<p className="text-[#6b4b3d]">Loading real-time data...</p>
							</div>
						)}

						{/* Error State */}
						{monitoringError && !monitoringLoading && (
							<div className="rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 p-4 text-[#991b1b]">
								<p>{monitoringError}</p>
								<button
									onClick={loadMonitoringData}
									className="mt-2 px-3 py-1 bg-[#ef4444] text-white rounded text-sm hover:bg-[#dc2626]"
								>
									Retry
								</button>
							</div>
						)}

						{/* Buses Grid */}
						{!monitoringLoading && !monitoringError && (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{monitoringBuses
									.filter(bus => {
										const matchesSearch = !monitoringSearchQuery || 
											bus.regNo?.toLowerCase().includes(monitoringSearchQuery.toLowerCase()) ||
											bus.driverName?.toLowerCase().includes(monitoringSearchQuery.toLowerCase());
										const matchesStatus = monitoringStatusFilter === 'all' || bus.operationalStatus === monitoringStatusFilter;
										return matchesSearch && matchesStatus;
									})
									.map((bus) => {
										const statusColor = {
											active: 'bg-[#10b981]/10 border-[#10b981]',
											maintenance: 'bg-[#f59e0b]/10 border-[#f59e0b]',
											flagged: 'bg-[#ef4444]/10 border-[#ef4444]',
										}[bus.operationalStatus] || 'bg-[#f2d9cc]';

										const statusText = {
											active: '✓ Active',
											maintenance: '⚠ Maintenance',
											flagged: '🔴 Flagged',
										}[bus.operationalStatus];

										const statusTextColor = {
											active: 'text-[#10b981]',
											maintenance: 'text-[#f59e0b]',
											flagged: 'text-[#ef4444]',
										}[bus.operationalStatus];

										return (
											<div key={bus._id} className={`rounded-2xl border-2 p-4 space-y-3 transition-all hover:shadow-md ${statusColor}`}>
												{/* Header */}
												<div className="flex justify-between items-start">
													<div>
														<p className="font-semibold text-[#2a1a15]">{bus.regNo}</p>
														<p className="text-xs text-[#6b4b3d]">{bus.route}</p>
													</div>
													<span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusTextColor}`}>
														{statusText}
													</span>
												</div>

												{/* Driver & Seats */}
												<div className="flex justify-between text-sm">
													<div>
														<p className="text-[#6b4b3d]">Driver</p>
														<p className="font-semibold text-[#2a1a15]">{bus.driverName || 'N/A'}</p>
													</div>
													<div>
														<p className="text-[#6b4b3d]">Seats</p>
														<p className="font-semibold text-[#2a1a15]">{bus.seats || 0}</p>
													</div>
												</div>

												{/* Complaints Section */}
												<div className="border-t border-current border-opacity-20 pt-3">
													<p className="text-xs font-semibold text-[#6b4b3d] mb-2">COMPLAINTS</p>
													<div className="grid grid-cols-2 gap-2 text-xs">
														<div className="bg-white/50 rounded px-2 py-1">
															<p className="text-[#6b4b3d]">Total</p>
															<p className="font-bold text-[#2a1a15]">{bus.complaints.total}</p>
														</div>
														<div className="bg-white/50 rounded px-2 py-1">
															<p className="text-[#6b4b3d]">Open</p>
															<p className="font-bold text-[#f59e0b]">{bus.complaints.open}</p>
														</div>
													</div>
												</div>

												{/* Feedback Section */}
												<div className="border-t border-current border-opacity-20 pt-3">
													<p className="text-xs font-semibold text-[#6b4b3d] mb-2">FEEDBACK</p>
													<div className="flex items-end justify-between">
														<div>
															<p className="text-xl font-bold text-[#2a1a15]">{bus.feedback.averageRating || 'N/A'}</p>
															<p className="text-xs text-[#6b4b3d]">/ 5.0</p>
														</div>
														<div className="text-right">
															<p className="text-xs text-[#6b4b3d]">Ratings: {bus.feedback.totalRatings}</p>
														</div>
													</div>
													<div className="grid grid-cols-3 gap-1 mt-2 text-xs">
														<div className="bg-[#10b981]/20 rounded px-1 py-1 text-center">
															<p className="font-semibold text-[#10b981]">{bus.feedback.positiveCount}</p>
															<p className="text-[#0f5132]">+ve</p>
														</div>
														<div className="bg-[#f59e0b]/20 rounded px-1 py-1 text-center">
															<p className="font-semibold text-[#f59e0b]">{bus.feedback.neutralCount}</p>
															<p className="text-[#b45309]">Neutral</p>
														</div>
														<div className="bg-[#ef4444]/20 rounded px-1 py-1 text-center">
															<p className="font-semibold text-[#ef4444]">{bus.feedback.negativeCount}</p>
															<p className="text-[#991b1b]">-ve</p>
														</div>
													</div>
												</div>
											</div>
										);
									})}
							</div>
						)}

						{/* Empty State */}
						{!monitoringLoading && !monitoringError && monitoringBuses.length === 0 && (
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-8 text-center">
								<Activity className="h-12 w-12 text-[#6b4b3d] mx-auto mb-3 opacity-50" />
								<p className="text-[#6b4b3d]">No buses registered yet</p>
							</div>
						)}
					</main>
				)}

				{activeNav === 'buses' && (
					<main className="flex-1 p-6 sm:p-10 space-y-6">
						<div>
							<p className="text-sm text-[#6b4b3d]">Fleet Control</p>
							<h2 className="text-2xl font-semibold">Remove Buses</h2>
						</div>
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Reg No</th>
										<th className="px-6 py-3">Route</th>
										<th className="px-6 py-3">Driver</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{approvedBuses.map((bus) => (
										<tr key={bus._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3 font-medium">{bus.regNo}</td>
											<td className="px-6 py-3">{bus.route}</td>
											<td className="px-6 py-3">{bus.driverName || 'N/A'}</td>
											<td className="px-6 py-3">Approved</td>
											<td className="px-6 py-3">
												<button
													onClick={() => handleRemoveBus(bus)}
													disabled={actionLoading}
													className="px-3 py-1.5 rounded-lg bg-[#ef4444] text-white hover:bg-[#dc2626] disabled:opacity-60"
												>
													Remove
												</button>
											</td>
										</tr>
									))}
									{approvedBuses.length === 0 && (
										<tr>
											<td className="px-6 py-6 text-[#6b4b3d]" colSpan={5}>No approved buses available.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</main>
				)}

				{activeNav === 'complaints' && (
					<main className="flex-1 p-6 sm:p-10 space-y-6">
						<div>
							<p className="text-sm text-[#6b4b3d]">Issue Desk</p>
							<h2 className="text-2xl font-semibold">Driver & Bus Complaints</h2>
						</div>
						<div className="relative max-w-xl">
							<Search className="absolute left-3 top-3 h-5 w-5 text-[#6b4b3d]" />
							<input
								type="text"
								placeholder="Search complaints..."
								value={complaintsSearchQuery}
								onChange={(e) => setComplaintsSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#f2d9cc] focus:outline-none focus:border-[#ff6b35]"
							/>
						</div>
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Type</th>
										<th className="px-6 py-3">Bus</th>
										<th className="px-6 py-3">Driver</th>
										<th className="px-6 py-3">Priority</th>
										<th className="px-6 py-3">Status</th>
										<th className="px-6 py-3">Description</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{complaintsLoading && (
										<tr>
											<td className="px-6 py-6 text-[#6b4b3d]" colSpan={6}>Loading complaints...</td>
										</tr>
									)}
									{!complaintsLoading && filteredComplaints.map((complaint) => (
										<tr key={complaint._id} className="hover:bg-[#fff4ec]">
											<td className="px-6 py-3">{complaint.type || 'General'}</td>
											<td className="px-6 py-3">{complaint.busId || complaint.bus_id || 'N/A'}</td>
											<td className="px-6 py-3">{complaint.driverId || complaint.driver_id || 'N/A'}</td>
											<td className="px-6 py-3">{complaint.priority || 'Normal'}</td>
											<td className="px-6 py-3">{complaint.status || 'Open'}</td>
											<td className="px-6 py-3 max-w-md">{complaint.description || complaint.message || complaint.title || 'No description'}</td>
										</tr>
									))}
									{!complaintsLoading && filteredComplaints.length === 0 && (
										<tr>
											<td className="px-6 py-6 text-[#6b4b3d]" colSpan={6}>No complaints found.</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</main>
				)}

				{activeNav === 'warnings' && (
					<main className="flex-1 p-6 sm:p-10 space-y-6">
						<div>
							<p className="text-sm text-[#6b4b3d]">Risk Watch</p>
							<h2 className="text-2xl font-semibold">Warnings & Alerts</h2>
						</div>
						{warningItems.length === 0 ? (
							<div className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-8 text-center">
								<p className="text-[#10b981] font-semibold">No warnings right now</p>
								<p className="text-sm text-[#6b4b3d] mt-1">All monitored buses are in healthy state.</p>
							</div>
						) : (
							<div className="space-y-4">
								{warningItems.map((item) => (
									<div key={item._id} className="rounded-2xl bg-white shadow-sm border border-[#f2d9cc] p-5">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p className="font-semibold text-[#2a1a15]">{item.regNo} - {item.route}</p>
												<p className="text-sm text-[#6b4b3d]">Driver: {item.driverName || 'N/A'}</p>
											</div>
											<span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.operationalStatus === 'flagged' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#b45309]'}`}>
												{item.operationalStatus === 'flagged' ? 'Critical' : 'Warning'}
											</span>
										</div>
										<ul className="mt-3 text-sm text-[#6b4b3d] list-disc pl-5 space-y-1">
											{item.reasons.map((reason, idx) => (
												<li key={`${item._id}-${idx}`}>{reason}</li>
											))}
										</ul>
										<div className="mt-4">
											<button
												onClick={() => showWarningAlert('Warning Sent', `Warning flagged for ${item.regNo}.`) }
												className="px-4 py-2 rounded-lg bg-[#ff6b35] text-white hover:bg-[#e55a24]"
											>
												Send Warning
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</main>
				)}

				{activeNav === 'feedbacks' && (
					<div className="flex-1">
						<Feedbacks />
					</div>
				)}
			</div>

			{/* Details Modal */}
			{showDetailsModal && selectedBusDetails && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<div className="px-6 py-4 border-b border-[#f2d9cc]">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Bus Details</h3>
							<p className="text-sm text-[#6b4b3d]">Complete information</p>
						</div>
						<div className="p-6 space-y-6">
							<div className="w-full">
								<img src={getBusImageUrl(selectedBusDetails)} onError={(e) => { e.currentTarget.src = DEFAULT_BUS_IMAGE; }} alt={selectedBusDetails.regNo} className="w-full h-64 object-cover rounded-lg" />
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Registration Number</p>
									<p className="text-base font-semibold text-[#2a1a15]">{selectedBusDetails.regNo}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Route</p>
									<p className="text-base font-semibold text-[#2a1a15]">{selectedBusDetails.route}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Driver Name</p>
									<p className="text-base font-semibold text-[#2a1a15]">{selectedBusDetails.driverName}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Total Seats</p>
									<p className="text-base font-semibold text-[#2a1a15]">{selectedBusDetails.seats}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Status</p>
									<span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getStatusColor(selectedBusDetails.approvalStatus)}`}>
										{getStatusIcon(selectedBusDetails.approvalStatus)}
										{selectedBusDetails.approvalStatus === 'pending' ? 'Pending' : selectedBusDetails.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}
									</span>
								</div>
								<div>
									<p className="text-sm font-medium text-[#6b4b3d]">Submitted</p>
									<p className="text-base font-semibold text-[#2a1a15]">{selectedBusDetails.createdAt}</p>
								</div>
								{selectedBusDetails.rejectionReason && (
									<div className="col-span-2 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-4">
										<p className="text-sm font-medium text-[#991b1b]">Rejection Reason</p>
										<p className="text-sm text-[#991b1b] mt-1">{selectedBusDetails.rejectionReason}</p>
									</div>
								)}
							</div>
						</div>
						<div className="px-6 py-4 border-t border-[#f2d9cc] flex justify-end">
							<button
								onClick={() => setShowDetailsModal(false)}
								className="px-4 py-2 rounded-lg bg-[#ff6b35] text-white font-medium hover:bg-[#e55a24]"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reject Modal */}
			{showRejectModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white rounded-2xl shadow-lg max-w-md w-full mx-4">
						<div className="px-6 py-4 border-b border-[#f2d9cc]">
							<h3 className="text-lg font-semibold text-[#2a1a15]">Reject Bus Registration</h3>
							<p className="text-sm text-[#6b4b3d]">Provide a reason for rejection</p>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-[#2a1a15] mb-2">Rejection Reason</label>
								<textarea
									value={rejectReason}
									onChange={(e) => setRejectReason(e.target.value)}
									placeholder="Explain why this bus registration is being rejected..."
									rows="4"
									className="w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35] text-[#2a1a15]"
								/>
							</div>
						</div>
						<div className="px-6 py-4 border-t border-[#f2d9cc] flex gap-3 justify-end">
							<button
								onClick={() => setShowRejectModal(false)}
								disabled={actionLoading}
								className="px-4 py-2 rounded-lg border border-[#f2d9cc] text-[#2a1a15] hover:bg-[#fff4ec] disabled:opacity-60"
							>
								Cancel
							</button>
							<button
								onClick={handleRejectSubmit}
								disabled={actionLoading}
								className="px-4 py-2 rounded-lg bg-[#ef4444] text-white font-medium hover:bg-[#dc2626] disabled:opacity-60"
							>
								{actionLoading ? 'Rejecting...' : 'Reject Bus'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
