import React, { useEffect, useState } from 'react';
import { BusFront, CheckCircle, XCircle, AlertCircle, Info, Check, Trash2, Search, User, MessageSquare, Star } from 'lucide-react';
import { busAPI } from '../utils/api';
import Feedbacks from './Feedbacks';

export default function SuperAdminDashboard() {
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
	const [loading, setLoading] = useState(false);
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

	useEffect(() => {
		// Uncomment to fetch from API instead of using dummy data
		// fetchBuses();
	}, []);

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

	const handleApprove = async (busId) => {
		try {
			setActionLoading(true);
			await busAPI.approveBus(busId);
			await fetchBuses();
			alert('Bus approved successfully!');
		} catch (err) {
			alert(`Failed to approve: ${err.message}`);
		} finally {
			setActionLoading(false);
		}
	};

	const handleRejectClick = (busId) => {
		setSelectedBusId(busId);
		setRejectReason('');
		setShowRejectModal(true);
	};

	const handleViewDetails = (bus) => {
		setSelectedBusDetails(bus);
		setShowDetailsModal(true);
	};

	const handleRejectSubmit = async () => {
		if (!rejectReason.trim()) {
			alert('Please provide a rejection reason');
			return;
		}

		try {
			setActionLoading(true);
			await busAPI.rejectBus(selectedBusId, rejectReason);
			await fetchBuses();
			setShowRejectModal(false);
			setSelectedBusId(null);
			setRejectReason('');
			alert('Bus rejected successfully!');
		} catch (err) {
			alert(`Failed to reject: ${err.message}`);
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
															<td className="px-6 py-3"><img src={bus.image} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
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
														<td className="px-6 py-3"><img src={bus.image} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
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
														<td className="px-6 py-3"><img src={bus.image} alt={bus.regNo} className="h-12 w-20 object-cover rounded" /></td>
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
								<img src={selectedBusDetails.image} alt={selectedBusDetails.regNo} className="w-full h-64 object-cover rounded-lg" />
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
