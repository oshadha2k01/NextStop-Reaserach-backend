import React, { useState, useEffect } from 'react';
import { Search, Star, Calendar, User, Bus } from 'lucide-react';
import { feedbackAPI } from '../utils/api';
import { showErrorAlert, showSuccessAlert } from '../utils/alerts';

export default function Feedbacks() {
	const [feedbacks, setFeedbacks] = useState([]);
	const [stats, setStats] = useState({ total: 0, positive: 0, neutral: 0, negative: 0, fiveStar: 0, fourStar: 0, threeStarOrLess: 0 });
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterRating, setFilterRating] = useState('all');

	useEffect(() => {
		loadFeedbacks();
	}, []);

	const loadFeedbacks = async () => {
		setLoading(true);
		try {
			const [feedbacksData, statsData] = await Promise.all([
				feedbackAPI.getAll(),
				feedbackAPI.getStats(),
			]);
			setFeedbacks(Array.isArray(feedbacksData) ? feedbacksData : []);
			setStats(statsData);
		} catch (error) {
			console.error('Error loading feedbacks:', error);
			showErrorAlert('Load Failed', error.message || 'Could not load feedbacks. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const filteredFeedbacks = feedbacks.filter((feedback) => {
		const matchesSearch = 
			(feedback.busRegNo?.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(feedback.driverName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
			(feedback.passengerName?.toLowerCase().includes(searchQuery.toLowerCase()));
		
		const matchesRating = filterRating === 'all' || feedback.rating === parseInt(filterRating);
		
		return matchesSearch && matchesRating;
	});

	const getRatingColor = (rating) => {
		if (rating === 5) return 'text-[#10b981]';
		if (rating === 4) return 'text-[#3b82f6]';
		if (rating === 3) return 'text-[#f59e0b]';
		if (rating <= 2) return 'text-[#ef4444]';
	};

	const getRatingBgColor = (rating) => {
		if (rating === 5) return 'bg-[#10b981]/10';
		if (rating === 4) return 'bg-[#3b82f6]/10';
		if (rating === 3) return 'bg-[#f59e0b]/10';
		if (rating <= 2) return 'bg-[#ef4444]/10';
	};

	const getAverageRating = () => {
		if (feedbacks.length === 0) return '0.0';
		const total = feedbacks.reduce((sum, f) => sum + f.rating, 0);
		return (total / feedbacks.length).toFixed(1);
	};

	return (
		<div className="min-h-screen bg-[#fff4ec] text-[#2a1a15] p-6 sm:p-10">
			{/* Header */}
			<div className="mb-8">
				<p className="text-sm text-[#6b4b3d]">Customer Reviews</p>
				<h1 className="text-4xl font-bold mb-2">Bus Feedbacks & Ratings</h1>
				<p className="text-[#6b4b3d]">View and manage customer reviews for all buses</p>
			</div>

			{loading ? (
				<div className="flex items-center justify-center p-12">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
						<p className="text-[#6b4b3d]">Loading feedbacks...</p>
					</div>
				</div>
			) : (
				<>
					{/* Stats Cards */}
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<div className="text-sm text-[#6b4b3d] mb-1">Total Feedbacks</div>
							<div className="text-3xl font-bold text-[#2a1a15]">{stats.total || feedbacks.length}</div>
						</div>
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<div className="text-sm text-[#6b4b3d] mb-1">Average Rating</div>
							<div className="flex items-center gap-2">
								<div className="text-3xl font-bold text-[#2a1a15]">{getAverageRating()}</div>
								<Star className="h-5 w-5 fill-[#fbbf24] text-[#fbbf24]" />
							</div>
						</div>
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<div className="text-sm text-[#6b4b3d] mb-1">5-Star Ratings</div>
							<div className="text-3xl font-bold text-[#10b981]">{stats.fiveStar || feedbacks.filter(f => f.rating === 5).length}</div>
						</div>
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<div className="text-sm text-[#6b4b3d] mb-1">Positive Sentiment</div>
							<div className="text-3xl font-bold text-[#ff6b35]">{stats.positive || 0}</div>
						</div>
					</div>

					{/* Search and Filter */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
						{/* Search Bar */}
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<div className="flex items-center gap-3 px-4 py-3 bg-[#fff4ec] rounded-lg border border-[#f2d9cc]">
								<Search className="h-5 w-5 text-[#6b4b3d]" />
								<input
									type="text"
									placeholder="Search by bus reg, driver, or passenger name..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="flex-1 bg-transparent outline-none text-[#2a1a15] placeholder-[#b89968]"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery('')}
										className="text-[#6b4b3d] hover:text-[#2a1a15] font-medium text-sm"
									>
										Clear
									</button>
								)}
							</div>
						</div>

						{/* Rating Filter */}
						<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
							<select
								value={filterRating}
								onChange={(e) => setFilterRating(e.target.value)}
								className="w-full px-4 py-3 bg-[#fff4ec] rounded-lg border border-[#f2d9cc] text-[#2a1a15] outline-none focus:ring-2 focus:ring-[#ff6b35]"
							>
								<option value="all">All Ratings</option>
								<option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
								<option value="4">⭐⭐⭐⭐ 4 Stars</option>
								<option value="3">⭐⭐⭐ 3 Stars</option>
								<option value="2">⭐⭐ 2 Stars</option>
								<option value="1">⭐ 1 Star</option>
							</select>
						</div>
					</div>
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-hidden">
					<div className="px-6 py-4 border-b border-[#f2d9cc]">
						<h3 className="text-lg font-semibold text-[#2a1a15]">Customer Reviews</h3>
						<p className="text-sm text-[#6b4b3d]">Showing {filteredFeedbacks.length} feedbacks</p>
					</div>

					{filteredFeedbacks.length === 0 ? (
						<div className="px-6 py-12 text-center text-[#6b4b3d]">
							<p className="text-lg">No feedbacks found matching your criteria</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full text-left">
								<thead className="bg-[#fff4ec] text-[#6b4b3d] text-sm">
									<tr>
										<th className="px-6 py-3">Bus & Driver</th>
										<th className="px-6 py-3">Route</th>
										<th className="px-6 py-3">Passenger</th>
										<th className="px-6 py-3">Rating</th>
										<th className="px-6 py-3">Feedback</th>
										<th className="px-6 py-3">Date</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#f2d9cc] text-sm text-[#2a1a15]">
									{filteredFeedbacks.map((feedback) => (
										<tr key={feedback._id} className="hover:bg-[#fff4ec] transition">
											<td className="px-6 py-4">
												<div className="font-semibold flex items-center gap-2">
													<Bus className="h-4 w-4 text-[#ff6b35]" />
													{feedback.busRegNo}
												</div>
												<div className="text-xs text-[#6b4b3d]">{feedback.driverName}</div>
											</td>
											<td className="px-6 py-4 text-sm">{feedback.route}</td>
											<td className="px-6 py-4">
												<div className="flex items-center gap-2">
													<User className="h-4 w-4 text-[#6b4b3d]" />
													<span className="font-medium">{feedback.passengerName}</span>
												</div>
											</td>
											<td className="px-6 py-4">
												<div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getRatingBgColor(feedback.rating)} ${getRatingColor(feedback.rating)}`}>
													<div className="flex gap-0.5">
														{[...Array(5)].map((_, i) => (
															<Star key={i} className={`h-3 w-3 ${i < feedback.rating ? 'fill-current' : 'text-gray-300'}`} />
														))}
													</div>
													{feedback.rating}
												</div>
											</td>
											<td className="px-6 py-4">
												<p className="max-w-xs text-xs line-clamp-2 text-[#6b4b3d]">{feedback.feedback}</p>
											</td>
											<td className="px-6 py-4 text-xs text-[#6b4b3d]">
												<div className="flex items-center gap-2">
													<Calendar className="h-4 w-4" />
													{new Date(feedback.createdAt || feedback.date).toLocaleDateString()}
												</div>
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
		</div>
	);
}
