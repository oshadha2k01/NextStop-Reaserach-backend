import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function AddDriver() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [formData, setFormData] = useState({
		name: '',
		phone: '',
		licenseNumber: '',
		shift: 'Morning',
		status: 'active',
		rating: 0,
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setSuccess('');

		// Validation
		if (!formData.name || !formData.phone || !formData.licenseNumber) {
			setError('Please fill in all required fields');
			return;
		}

		if (formData.phone.length < 10) {
			setError('Phone number must be at least 10 digits');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`${API_BASE_URL}/drivers`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: formData.name,
					phone: formData.phone,
					licenseNumber: formData.licenseNumber,
					shift: formData.shift,
					status: formData.status,
					rating: parseInt(formData.rating) || 0,
				}),
			});

			if (response.status === 201) {
				setSuccess('Driver added successfully!');
				setFormData({
					name: '',
					phone: '',
					licenseNumber: '',
					shift: 'Morning',
					status: 'active',
					rating: 0,
				});
				
				// Redirect after 2 seconds
				setTimeout(() => {
					navigate('/admin-dashboard');
				}, 2000);
			} else if (response.status === 409) {
				setError('License number already exists');
			} else {
				const data = await response.json();
				setError(data.message || 'Failed to add driver');
			}
		} catch (err) {
			setError('Error adding driver: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff4ec]">
			<div className="max-w-2xl mx-auto p-6">
				{/* Header */}
				<div className="flex items-center gap-3 mb-8">
					<button
						onClick={() => navigate(-1)}
						className="p-2 hover:bg-[#f2d9cc] rounded-lg transition-colors"
					>
						<ArrowLeft className="h-6 w-6 text-[#ff6b35]" />
					</button>
					<h1 className="text-3xl font-bold text-[#2a1a15]">Add New Driver</h1>
				</div>

				{/* Form Card */}
				<div className="bg-white rounded-2xl shadow-sm border border-[#f2d9cc] p-8">
					{error && (
						<div className="mb-6 p-4 bg-[#ef4444]/10 border border-[#ef4444] rounded-lg text-[#991b1b]">
							{error}
						</div>
					)}

					{success && (
						<div className="mb-6 p-4 bg-[#10b981]/10 border border-[#10b981] rounded-lg text-[#0f5132]">
							{success}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Name Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								Driver Name *
							</label>
							<input
								type="text"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Enter driver name"
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
								required
							/>
						</div>

						{/* Phone Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								Phone Number *
							</label>
							<input
								type="tel"
								name="phone"
								value={formData.phone}
								onChange={handleChange}
								placeholder="Enter phone number"
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
								required
							/>
						</div>

						{/* License Number Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								License Number *
							</label>
							<input
								type="text"
								name="licenseNumber"
								value={formData.licenseNumber}
								onChange={handleChange}
								placeholder="Enter license number"
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
								required
							/>
						</div>

						{/* Shift Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								Shift
							</label>
							<select
								name="shift"
								value={formData.shift}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
							>
								<option value="Morning">Morning</option>
								<option value="Evening">Evening</option>
								<option value="Night">Night</option>
								<option value="Maintenance">Maintenance</option>
							</select>
						</div>

						{/* Status Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								Status
							</label>
							<select
								name="status"
								value={formData.status}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
								<option value="on-leave">On Leave</option>
							</select>
						</div>

						{/* Rating Field */}
						<div>
							<label className="block text-sm font-medium text-[#2a1a15] mb-2">
								Initial Rating (0-5)
							</label>
							<input
								type="number"
								name="rating"
								value={formData.rating}
								onChange={handleChange}
								min="0"
								max="5"
								step="0.1"
								placeholder="Enter rating"
								className="w-full px-4 py-2 border border-[#f2d9cc] rounded-lg focus:outline-none focus:border-[#ff6b35] bg-[#fff4ec]"
							/>
						</div>

						{/* Submit Button */}
						<div className="flex gap-3 pt-6">
							<button
								type="submit"
								disabled={loading}
								className="flex-1 px-4 py-3 bg-[#ff6b35] text-white rounded-lg font-medium hover:bg-[#cc562a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{loading ? 'Adding Driver...' : 'Add Driver'}
							</button>
							<button
								type="button"
								onClick={() => navigate(-1)}
								className="flex-1 px-4 py-3 border border-[#f2d9cc] text-[#2a1a15] rounded-lg font-medium hover:bg-[#f2d9cc] transition-colors"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
