import React, { useEffect, useMemo, useState } from 'react';
import { busAPI, busDeviceAPI, iotAPI } from '../utils/api';
import { showErrorAlert, showSuccessAlert } from '../utils/alerts';
import PageBackButton from '../components/PageBackButton';

const DEFAULT_ROUTE = '177 - Kaduwela-Kollupitiya';

export default function AddBus() {
	const [form, setForm] = useState({
		route: DEFAULT_ROUTE,
		regNo: '',
		seats: '',
		ownerName: '',
		phoneNo: '',
		email: '',
		deviceId: '',
		imageFile: null,
	});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [knownDevices, setKnownDevices] = useState([]);
	const [loadingDevices, setLoadingDevices] = useState(false);
	const previewUrl = useMemo(() => (form.imageFile ? URL.createObjectURL(form.imageFile) : ''), [form.imageFile]);

	const loadKnownDevices = async () => {
		setLoadingDevices(true);
		try {
			const response = await iotAPI.getKnownDevices(50);
			setKnownDevices(response.devices || []);
		} catch {
			setKnownDevices([]);
		} finally {
			setLoadingDevices(false);
		}
	};

	useEffect(() => {
		loadKnownDevices();
	}, []);

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
		if (!form.ownerName.trim()) nextErrors.ownerName = 'Owner name is required';
		if (!/^\d{10}$/.test(form.phoneNo.trim())) nextErrors.phoneNo = 'Phone number must be 10 digits';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Valid email is required';
		if (!form.deviceId.trim()) nextErrors.deviceId = 'Device ID is required';
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
			fd.append('ownerName', form.ownerName.trim());
			fd.append('phoneNo', form.phoneNo.trim());
			fd.append('email', form.email.trim());
			fd.append('deviceId', form.deviceId.trim());
			fd.append('image', form.imageFile);

			// Step 1: Create Bus
			const createdBus = await busAPI.createBusWithImage(fd);
			if (!createdBus || !createdBus._id) {
				throw new Error('Bus creation failed - no bus ID returned');
			}

			// Step 2: Register Device
			try {
				const deviceRegResponse = await busDeviceAPI.register({
					busId: createdBus._id,
					deviceId: form.deviceId.trim(),
				});
				
				if (!deviceRegResponse || !deviceRegResponse.success) {
					throw new Error('Device registration returned invalid response');
				}

				await showSuccessAlert('Success', 'Bus and device registered successfully!');
				setForm({
					route: DEFAULT_ROUTE,
					regNo: '',
					seats: '',
					ownerName: '',
					phoneNo: '',
					email: '',
					deviceId: '',
					imageFile: null,
				});
			} catch (deviceError) {
				// Device registration failed - provide detailed error
				const errorMsg = deviceError.message || 'Failed to register device with bus';
				await showErrorAlert('Device Registration Failed', `Bus was created (${createdBus.regNo}), but device registration failed: ${errorMsg}. Please register the device manually from the Bus Devices tab.`);
			}
		} catch (err) {
			await showErrorAlert('Submission Failed', err.message || 'Something went wrong while saving bus/device');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-[#fff4ec] text-[#2a1a15] px-4 py-8 sm:px-6 lg:px-10">
			<div className="max-w-4xl mx-auto mb-4">
				<PageBackButton to="/admin-dashboard" label="Back to Dashboard" />
			</div>
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
							<select
								name="route"
								value={form.route}
								onChange={handleChange}
								className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
							>
								<option value={DEFAULT_ROUTE}>{DEFAULT_ROUTE}</option>
							</select>
							{errors.route && <p className="mt-1 text-sm text-red-500">{errors.route}</p>}
						</div>

						<div>
							<label className="block text-sm font-medium text-[#2a1a15]">Number Plate</label>
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
								<label className="block text-sm font-medium text-[#2a1a15]">Owner Name</label>
								<input
									type="text"
									name="ownerName"
									value={form.ownerName}
									onChange={handleChange}
									className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									placeholder="Owner full name"
								/>
								{errors.ownerName && <p className="mt-1 text-sm text-red-500">{errors.ownerName}</p>}
							</div>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-[#2a1a15]">Phone Number</label>
								<input
									type="tel"
									name="phoneNo"
									value={form.phoneNo}
									onChange={handleChange}
									className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									placeholder="10-digit phone number"
								/>
								{errors.phoneNo && <p className="mt-1 text-sm text-red-500">{errors.phoneNo}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium text-[#2a1a15]">Email</label>
								<input
									type="email"
									name="email"
									value={form.email}
									onChange={handleChange}
									className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
									placeholder="Owner email"
								/>
								{errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-[#2a1a15]">Device ID</label>
							<select
								name="deviceId"
								value={form.deviceId}
								onChange={handleChange}
								className="mt-1 w-full rounded-lg border border-[#f2d9cc] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
							>
								<option value="" disabled>
									{loadingDevices ? 'Loading devices...' : knownDevices.length > 0 ? 'Select available device ID' : 'No devices found'}
								</option>
								{knownDevices.map((d) => (
									<option key={d.deviceId} value={d.deviceId}>{d.deviceId}</option>
								))}
							</select>
							<div className="mt-1 flex items-center justify-between gap-3">
								<p className="text-xs text-[#6b4b3d]">
									Use the device label configured in ESP32 firmware (sent as device_id).
								</p>
								<button
									type="button"
									onClick={loadKnownDevices}
									disabled={loadingDevices}
									className="text-xs font-medium text-[#ff6b35] hover:text-[#cc562a] disabled:opacity-60"
								>
									{loadingDevices ? 'Refreshing...' : 'Refresh devices'}
								</button>
							</div>
							{knownDevices.length > 0 && (
								<p className="mt-1 text-xs text-[#6b4b3d]">
									Detected {knownDevices.length} IoT device(s) from live sensor data.
								</p>
							)}
							{errors.deviceId && <p className="mt-1 text-sm text-red-500">{errors.deviceId}</p>}
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
