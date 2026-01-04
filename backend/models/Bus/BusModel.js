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
    driverName: {
      type: String,
      required: true, 
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