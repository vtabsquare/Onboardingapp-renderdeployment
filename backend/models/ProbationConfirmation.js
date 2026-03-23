const mongoose = require('mongoose');

const probationConfirmationSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    effectiveDate: { type: String, trim: true },
    doorNo: { type: String, trim: true },
    street: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    designation: { type: String, trim: true },
    reportingManager: { type: String, trim: true },
    annualHike: { type: String, trim: true },
    plannedLeaves: { type: String, trim: true },
    annualPackage: { type: String, trim: true },
    driveFileId: { type: String, required: true },
    driveLink: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProbationConfirmation', probationConfirmationSchema);
