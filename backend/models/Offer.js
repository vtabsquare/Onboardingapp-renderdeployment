const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    doorNo: {
      type: String,
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    addressLine1: {
      type: String,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: String,
      trim: true,
    },
    reportingManager: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    offerDate: {
      type: String,
      trim: true,
    },
    driveFileId: {
      type: String,
      required: true,
    },
    driveLink: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
