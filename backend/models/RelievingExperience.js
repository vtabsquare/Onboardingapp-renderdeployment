const mongoose = require('mongoose');

const relievingExperienceSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    businessTitle: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: String,
      trim: true,
    },
    joinedDate: {
      type: String,
      trim: true,
    },
    relievingDate: {
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

module.exports = mongoose.model('RelievingExperience', relievingExperienceSchema);
