import React, { useState } from 'react';
import { Search, Star, ThumbsUp, Calendar, User, Bus } from 'lucide-react';

export default function Feedbacks() {
	const dummyFeedbacks = [
		{
			_id: '1',
			busRegNo: 'DL-01-AB-1234',
			driverName: 'Anita Rao',
			route: 'Route 5 (Central)',
			passengerName: 'Priya Singh',
			rating: 5,
			feedback: 'Great bus service, comfortable seats and punctual arrivals. Driver was professional and courteous.',
			date: '2026-01-02',
			helpful: 15
		},
		{
			_id: '2',
			busRegNo: 'DL-01-AB-1234',
			driverName: 'Anita Rao',
			route: 'Route 5 (Central)',
			passengerName: 'Rajesh Patel',
			rating: 4,
			feedback: 'Good service overall. Could improve AC temperature control. Otherwise clean and well-maintained.',
			date: '2026-01-01',
			helpful: 8
		},
		{
			_id: '3',
			busRegNo: 'DL-02-CD-5678',
			driverName: 'Michael Chen',
			route: 'Route 12 (North)',
			passengerName: 'Neha Verma',
			rating: 5,
			feedback: 'Excellent! Clean bus, helpful staff, and smooth ride. Highly recommended for daily commute.',
			date: '2025-12-30',
			helpful: 22
		},
		{
			_id: '4',
			busRegNo: 'DL-02-CD-5678',
			driverName: 'Michael Chen',
			route: 'Route 12 (North)',
			passengerName: 'Amit Kumar',
			rating: 3,
			feedback: 'Average experience. Bus arrived late twice this week. Driver needs better time management.',
			date: '2025-12-28',
			helpful: 5
		},
		{
			_id: '5',
			busRegNo: 'DL-03-EF-9012',
			driverName: 'David Singh',
			route: 'Route 2 (South)',
			passengerName: 'Anjali Gupta',
			rating: 5,
			feedback: 'Best bus service I have used! Super clean, comfortable, and always on time. Excellent driver behavior.',
			date: '2025-12-27',
			helpful: 28
		},
		{
			_id: '6',
			busRegNo: 'DL-03-EF-9012',
			driverName: 'David Singh',
			route: 'Route 2 (South)',
			passengerName: 'Vikram Sinha',
			rating: 4,
			feedback: 'Nice bus with good facilities. Only issue is that the WiFi connectivity is weak.',
			date: '2025-12-25',
			helpful: 12
		},
		{
			_id: '7',
			busRegNo: 'DL-04-GH-3456',
			driverName: 'Priya Sharma',
			route: 'Route 8 (East)',
			passengerName: 'Isha Mehra',
			rating: 5,
			feedback: 'Outstanding service! The driver is very polite and the bus is always spotlessly clean. Top marks!',
			date: '2025-12-24',
			helpful: 31
		},
		{
			_id: '8',
			busRegNo: 'DL-04-GH-3456',
			driverName: 'Priya Sharma',
			route: 'Route 8 (East)',
			passengerName: 'Rohit Chopra',
			rating: 4,
			feedback: 'Good experience. A/C could be better but overall satisfied with the service quality.',
			date: '2025-12-23',
			helpful: 7
		},
		{
			_id: '9',
			busRegNo: 'DL-05-IJ-7890',
			driverName: 'Rajesh Kumar',
			route: 'Route 15 (West)',
			passengerName: 'Divya Singh',
			rating: 3,
			feedback: 'Decent bus but maintenance needed. Some seats have tears and the bus interior could use cleaning.',
			date: '2025-12-22',
			helpful: 4
		},
		{
			_id: '10',
			busRegNo: 'DL-05-IJ-7890',
			driverName: 'Rajesh Kumar',
			route: 'Route 15 (West)',
			passengerName: 'Harsh Mishra',
			rating: 2,
			feedback: 'Poor service. Bus frequently breaks down and driver is rude. Not recommended.',
			date: '2025-12-20',
			helpful: 2
		},
		{
			_id: '11',
			busRegNo: 'DL-06-KL-2345',
			driverName: 'Sarah Williams',
			route: 'Route 20 (Airport)',
			passengerName: 'Monica Joshi',
			rating: 5,
			feedback: 'Perfect for airport commute! Reliable, professional service, and always punctual. Great value.',
			date: '2025-12-19',
			helpful: 25
		},
		{
			_id: '12',
			busRegNo: 'DL-06-KL-2345',
			driverName: 'Sarah Williams',
			route: 'Route 20 (Airport)',
			passengerName: 'Arjun Kumar',
			rating: 4,
			feedback: 'Good service overall. Booking process could be simpler but buses are reliable.',
			date: '2025-12-18',
			helpful: 9
		},
	];

	const [feedbacks] = useState(dummyFeedbacks);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterRating, setFilterRating] = useState('all');

	const filteredFeedbacks = feedbacks.filter((feedback) => {
		const matchesSearch = 
			feedback.busRegNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
			feedback.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			feedback.passengerName.toLowerCase().includes(searchQuery.toLowerCase());
		
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

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
					<div className="text-sm text-[#6b4b3d] mb-1">Total Feedbacks</div>
					<div className="text-3xl font-bold text-[#2a1a15]">{feedbacks.length}</div>
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
					<div className="text-3xl font-bold text-[#10b981]">{feedbacks.filter(f => f.rating === 5).length}</div>
				</div>
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-4">
					<div className="text-sm text-[#6b4b3d] mb-1">Buses Reviewed</div>
					<div className="text-3xl font-bold text-[#ff6b35]">{new Set(feedbacks.map(f => f.busRegNo)).size}</div>
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

			{/* Feedbacks Table */}
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
												{feedback.date}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

		</div>
	);
}
