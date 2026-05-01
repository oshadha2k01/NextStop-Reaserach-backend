const Bus = require("../../models/Bus/BusModel");
const Driver = require("../../models/SuperAdmin/Driver");
const BusDevice = require("../../models/BusDevice/BusDevice");

function parseBase64Image(dataString) {
	if (!dataString) return null;
	const matches = dataString.match(/^data:(.+);base64,(.+)$/);
	if (matches) {
		return { contentType: matches[1], data: Buffer.from(matches[2], "base64") };
	}
	try {
		return { contentType: "image/*", data: Buffer.from(dataString, "base64") };
	} catch {
		return null;
	}
}

async function attachDriverNames(buses) {
	if (!Array.isArray(buses) || buses.length === 0) return buses;
	const busIds = buses.map((b) => b._id);
	const drivers = await Driver.find({ busId: { $in: busIds } })
		.select("name busId")
		.lean();

	const driverByBusId = new Map();
	for (const d of drivers) {
		if (!d?.busId) continue;
		if (!driverByBusId.has(String(d.busId))) {
			driverByBusId.set(String(d.busId), d.name);
		}
	}

	return buses.map((b) => ({
		...b,
		driverName: driverByBusId.get(String(b._id)) || null,
	}));
}

const updateTripStatus = async (req, res) => {
	try {
		const { busId, isActive } = req.body;
		if (typeof busId === 'undefined' || typeof isActive === 'undefined') {
			return res.status(400).json({ message: 'Missing required fields: busId and isActive' });
		}

		const updatedBus = await Bus.findOneAndUpdate(
			{ $or: [{ regNo: busId }, { device_id: busId }] },
			{ isActive: Boolean(isActive) },
			{ new: true, runValidators: true }
		).lean();

		if (!updatedBus) {
			return res.status(404).json({ message: 'Bus not found' });
		}

		const io = req.app.get('io');
		if (io) {
			io.emit('bus_status_changed', { busId, isActive: Boolean(isActive) });
		}

		return res.status(200).json({ message: 'Trip status updated', bus: updatedBus });
	} catch (err) {
		return res.status(500).json({ message: err.message || 'Server error' });
	}
};

const createBus = async (req, res) => {
	try {
		const { route, regNo, seats, ownerName, phoneNo, email, deviceId } = req.body;
		const normalizedDeviceId = String(deviceId || '').trim();
		if (!route || !regNo || !seats || !ownerName || !phoneNo || !email || !normalizedDeviceId) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		let imageObj = null;
		if (req.file && req.file.buffer) {
			imageObj = { data: req.file.buffer, contentType: req.file.mimetype };
		} else if (req.body.image) {
			imageObj = parseBase64Image(req.body.image);
			if (!imageObj) return res.status(400).json({ message: "Invalid base64 image" });
		} else {
			return res.status(400).json({ message: "Image is required (file upload or base64)" });
		}

		const bus = new Bus({
			route,
			regNo,
			seats: Number(seats),
			ownerName,
			phoneNo,
			email,
			image: { data: imageObj.data, contentType: imageObj.contentType },
		});

		const created = await bus.save();

		const existingDeviceAssignment = await BusDevice.findOne({ device_id: normalizedDeviceId }).lean();
		if (existingDeviceAssignment && String(existingDeviceAssignment.bus_id) !== String(created._id)) {
			await BusDevice.deleteOne({ _id: existingDeviceAssignment._id });
			await Bus.findByIdAndUpdate(existingDeviceAssignment.bus_id, { device_id: null });
		}

		const registration = await BusDevice.findOneAndUpdate(
			{ bus_id: created._id },
			{
				bus_id: created._id,
				device_id: normalizedDeviceId,
				is_active: true,
				registered_at: new Date(),
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		await Bus.findByIdAndUpdate(created._id, { device_id: normalizedDeviceId });

		const obj = created.toObject();
		if (obj.image) delete obj.image.data;
		return res.status(201).json({
			...obj,
			deviceId: normalizedDeviceId,
			busDeviceRegistration: {
				id: registration._id,
				busId: registration.bus_id,
				deviceId: registration.device_id,
				isActive: registration.is_active,
				registeredAt: registration.registered_at,
			},
		});
	} catch (err) {
		if (err.code === 11000) return res.status(409).json({ message: "regNo already exists" });
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const getBuses = async (req, res) => {
	try {
		let buses = await Bus.find().sort({ createdAt: -1 }).lean();
		buses.forEach((b) => {
			if (b.image) delete b.image.data;
		});
		buses = await attachDriverNames(buses);
		return res.json(buses);
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const getBusById = async (req, res) => {
	try {
		const bus = await Bus.findById(req.params.id).lean();
		if (!bus) return res.status(404).json({ message: "Bus not found" });
		if (bus.image) delete bus.image.data;

		const driver = await Driver.findOne({ busId: bus._id }).select("name").lean();
		return res.json({
			...bus,
			driverName: driver?.name || null,
		});
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const getBusImage = async (req, res) => {
	try {
		const bus = await Bus.findById(req.params.id).select("image");
		if (!bus || !bus.image || !bus.image.data) return res.status(404).json({ message: "Image not found" });
		res.set("Content-Type", bus.image.contentType || "application/octet-stream");
		return res.send(bus.image.data);
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const updateBus = async (req, res) => {
	try {
		const { route, regNo, seats, ownerName, phoneNo, email, deviceId } = req.body;
		const normalizedDeviceId = typeof deviceId === "string" ? deviceId.trim() : deviceId;
		const update = {};
		if (route) update.route = route;
		if (regNo) update.regNo = regNo;
		if (typeof seats !== "undefined") update.seats = Number(seats);
		if (ownerName) update.ownerName = ownerName;
		if (phoneNo) update.phoneNo = phoneNo;
		if (email) update.email = email;
		if (typeof normalizedDeviceId !== "undefined") update.device_id = normalizedDeviceId || null;

		if (req.file && req.file.buffer) {
			update.image = { data: req.file.buffer, contentType: req.file.mimetype };
		} else if (req.body.image) {
			const parsed = parseBase64Image(req.body.image);
			if (!parsed) return res.status(400).json({ message: "Invalid base64 image" });
			update.image = { data: parsed.data, contentType: parsed.contentType };
		}

		const updated = await Bus.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).lean();
		if (!updated) return res.status(404).json({ message: "Bus not found" });

		if (typeof normalizedDeviceId !== "undefined") {
			const currentRegistration = await BusDevice.findOne({ bus_id: req.params.id }).lean();

			if (currentRegistration && currentRegistration.device_id && currentRegistration.device_id !== normalizedDeviceId) {
				const oldDeviceId = currentRegistration.device_id;
				const reassignedDevice = await BusDevice.findOne({ device_id: normalizedDeviceId }).lean();

				if (reassignedDevice && String(reassignedDevice.bus_id) !== String(req.params.id)) {
					await BusDevice.deleteOne({ _id: reassignedDevice._id });
					await Bus.findByIdAndUpdate(reassignedDevice.bus_id, { device_id: null });
				}

				await BusDevice.findOneAndUpdate(
					{ bus_id: req.params.id },
					{
						bus_id: req.params.id,
						device_id: normalizedDeviceId || null,
						is_active: true,
						registered_at: currentRegistration.registered_at || new Date(),
					},
					{ upsert: true, new: true, setDefaultsOnInsert: true }
				);

				await Bus.findByIdAndUpdate(req.params.id, { device_id: normalizedDeviceId || null });
				if (oldDeviceId && !normalizedDeviceId) {
					await BusDevice.deleteOne({ bus_id: req.params.id });
				}
			} else if (!currentRegistration && normalizedDeviceId) {
				const reassignedDevice = await BusDevice.findOne({ device_id: normalizedDeviceId }).lean();
				if (reassignedDevice && String(reassignedDevice.bus_id) !== String(req.params.id)) {
					await BusDevice.deleteOne({ _id: reassignedDevice._id });
					await Bus.findByIdAndUpdate(reassignedDevice.bus_id, { device_id: null });
				}

				await BusDevice.findOneAndUpdate(
					{ bus_id: req.params.id },
					{
						bus_id: req.params.id,
						device_id: normalizedDeviceId,
						is_active: true,
						registered_at: new Date(),
					},
					{ upsert: true, new: true, setDefaultsOnInsert: true }
				);
				await Bus.findByIdAndUpdate(req.params.id, { device_id: normalizedDeviceId });
			}
		}

		if (updated.image) delete updated.image.data;
		return res.json(updated);
	} catch (err) {
		if (err.code === 11000) return res.status(409).json({ message: "regNo already exists" });
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const deleteBus = async (req, res) => {
	try {
		const deleted = await Bus.findByIdAndDelete(req.params.id).lean();
		if (!deleted) return res.status(404).json({ message: "Bus not found" });

		// Keep linked collections consistent when a bus is removed.
		await Promise.all([
			BusDevice.deleteMany({ bus_id: req.params.id }),
			Driver.updateMany({ busId: req.params.id }, { $set: { busId: null } }),
		]);

		return res.json({ message: "Bus deleted" });
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const approveBus = async (req, res) => {
	try {
		const bus = await Bus.findByIdAndUpdate(
			req.params.id,
			{ approvalStatus: 'approved', rejectionReason: null },
			{ new: true, runValidators: true }
		).lean();
		if (!bus) return res.status(404).json({ message: "Bus not found" });
		if (bus.image) delete bus.image.data;
		return res.json({ message: "Bus approved successfully", bus });
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

const rejectBus = async (req, res) => {
	try {
		const { reason } = req.body;
		if (!reason) {
			return res.status(400).json({ message: "Rejection reason is required" });
		}

		const bus = await Bus.findByIdAndUpdate(
			req.params.id,
			{ approvalStatus: 'rejected', rejectionReason: reason },
			{ new: true, runValidators: true }
		).lean();
		if (!bus) return res.status(404).json({ message: "Bus not found" });
		if (bus.image) delete bus.image.data;
		return res.json({ message: "Bus rejected successfully", bus });
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

// Get bus statistics for dashboard
const getBusStats = async (req, res) => {
	try {
		const totalBuses = await Bus.countDocuments();
		const approvedBuses = await Bus.countDocuments({ approvalStatus: 'approved' });
		const pendingBuses = await Bus.countDocuments({ approvalStatus: 'pending' });
		const rejectedBuses = await Bus.countDocuments({ approvalStatus: 'rejected' });

		return res.json({
			totalBuses,
			approvedBuses,
			pendingBuses,
			rejectedBuses,
			activeToday: approvedBuses, // Can be enhanced with real-time data
			inMaintenance: 0, // Can be enhanced with maintenance tracking
		});
	} catch (err) {
		return res.status(500).json({ message: err.message || "Server error" });
	}
};

module.exports = {
	createBus,
	getBuses,
	getBusById,
	getBusImage,
	updateBus,
	deleteBus,
	approveBus,
	rejectBus,
	updateTripStatus,
	getBusStats,
};