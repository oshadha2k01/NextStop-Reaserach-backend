import React, { useMemo, useState } from 'react';
import { busAPI } from '../utils/api';

export default function AddBus() {
	const [form, setForm] = useState({
		route: '',
		regNo: '',
		seats: '',
		driverName: '',
		imageFile: null,
	});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const previewUrl = useMemo(() => (form.imageFile ? URL.createObjectURL(form.imageFile) : ''), [form.imageFile]);

	const handleChange = (e) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleFile = (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setForm((prev) => ({ ...prev, imageFile: file }));
	};

	const validate = () => {
		const nextErrors = {};
		if (!form.route.trim()) nextErrors.route = 'Route is required';
		if (!form.regNo.trim()) nextErrors.regNo = 'Registration number is required';
		if (!form.seats || Number(form.seats) <= 0) nextErrors.seats = 'Seats must be a positive number';
		if (!form.driverName.trim()) nextErrors.driverName = 'Driver name is required';
		if (!form.imageFile) nextErrors.imageFile = 'Bus image is required';
		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;
		setIsSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('route', form.route.trim());
			fd.append('regNo', form.regNo.trim());
			fd.append('seats', form.seats);
			fd.append('driverName', form.driverName.trim());
			fd.append('image', form.imageFile);

			const result = await busAPI.createBusWithImage(fd);
			alert(result.message || 'Bus added successfully!');
			setForm({ route: '', regNo: '', seats: '', driverName: '', imageFile: null });
		} catch (err) {
			alert(`Submission failed: ${err.message}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff4ec] text-[#2a1a15] px-4 py-8 sm:px-6 lg:px-10">
			<div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-[#f2d9cc] overflow-hidden">
				<div className="px-6 py-5 border-b border-[#f2d9cc] flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Add Bus</h1>
						<p className="text-sm text-[#6b4b3d]">Upload bus image and enter route details</p>
					</div>
					<span className="px-3 py-1 text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] rounded-full">Draft</span>
				</div>

				<form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="space-y-4">
						<label className="block text-sm font-medium text-[#2a1a15]">Bus Image</label>
						<div className="border-2 border-dashed border-[#f2d9cc] rounded-xl p-4 bg-[#fffaf7] text-center">
							<input
								type="file"
								accept="image/*"
								onChange={handleFile}
								className="block w-full text-sm text-[#6b4b3d]"
							/>
							{errors.imageFile && <p className="mt-2 text-sm text-red-500">{errors.imageFile}</p>}
						</div>
						{previewUrl ? (
							<div className="rounded-xl overflow-hidden border border-[#f2d9cc]">
								<img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
							</div>
						) : (
							<p className="text-sm text-[#6b4b3d]">No image selected.</p>
						)}
					</div>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-[#2a1a15]">Route</label>
							<input
								type="text"
								name="route"
								value={form.route}
								onChange={handleChange}
								className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
								placeholder="e.g., Route 12"
							/>
							{errors.route && <p className="mt-1 text-sm text-red-500">{errors.route}</p>}
						</div>

						<div>
							<label className="block text-sm font-medium text-[#2a1a15]">Registration Number</label>
							<input
								type="text"
								name="regNo"
								value={form.regNo}
								onChange={handleChange}
								className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
								placeholder="Unique registration number"
							/>
							{errors.regNo && <p className="mt-1 text-sm text-red-500">{errors.regNo}</p>}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-[#2a1a15]">Seats</label>
								<input
									type="number"
									name="seats"
									value={form.seats}
									onChange={handleChange}
									min="1"
									className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									placeholder="Number of seats"
								/>
								{errors.seats && <p className="mt-1 text-sm text-red-500">{errors.seats}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-[#2a1a15]">Driver Name</label>
								<input
									type="text"
									name="driverName"
									value={form.driverName}
									onChange={handleChange}
									className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									placeholder="Driver full name"
								/>
								{errors.driverName && <p className="mt-1 text-sm text-red-500">{errors.driverName}</p>}
							</div>
						</div>

						<div className="flex items-center gap-3 pt-2">
							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#ff6b35] text-white font-medium shadow-sm hover:bg-[#cc562a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff6b35] disabled:opacity-60"
							>
								{isSubmitting ? 'Saving...' : 'Save Bus'}
							</button>
							<span className="text-sm text-[#6b4b3d]">All fields are required.</span>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
