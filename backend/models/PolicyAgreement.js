const mongoose = require('mongoose');

const policyAgreementSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    stipend: {
      type: String,
      trim: true,
    },
    probationSalary: {
      type: String,
      trim: true,
    },
    postProbationSalary: {
      type: String,
      trim: true,
    },
    workStartTime: {
      type: String,
      trim: true,
    },
    workEndTime: {
      type: String,
      trim: true,
    },
    internshipMonths: {
      type: String,
      trim: true,
    },
    trainingMonths: {
      type: String,
      trim: true,
    },
    probationMonths: {
      type: String,
      trim: true,
    },
    postProbationMonths: {
      type: String,
      trim: true,
    },
    employeeType: {
      type: String,
      trim: true,
      default: 'Internship',
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

module.exports = mongoose.model('PolicyAgreement', policyAgreementSchema);
