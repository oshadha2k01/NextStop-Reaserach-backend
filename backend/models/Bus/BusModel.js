const mongoose = require("mongoose");

const BusSchema = new mongoose.Schema(
  {
    image: {
      data: { type: Buffer, required: true },      
      contentType: { type: String, required: true }, 
    },
    route: {
      type: String,
      required: true,
    },
    regNo: {
      type: String,
      required: true,
      unique: true,
    },
    seats: {
      type: Number,
      required: true,
    },
    ownerName: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    device_id: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", BusSchema);