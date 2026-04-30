const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true }
}, { _id: false });

const StageSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  sinhala_name: { type: String },
  fare_stage: { type: Number, required: true },
  coordinates: { type: LocationSchema, required: true }
});

const NationalRouteSchema = new mongoose.Schema({
  province: { type: String, required: true, index: true },
  district: { type: String, required: true, index: true },
  route_number: { type: String, required: true, index: true },
  route_name: { type: String, required: true },
  service_type: { type: String, default: 'Normal' },
  operator: { type: String },
  stages: [StageSchema]
}, { timestamps: true });

module.exports = mongoose.model('NationalRoute', NationalRouteSchema);
