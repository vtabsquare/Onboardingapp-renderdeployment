const mongoose = require('mongoose');

const salaryHikeSchema = new mongoose.Schema({
    employeeName: {
        type: String,
        required: true,
    },
    doorNo: {
        type: String,
    },
    street: {
        type: String,
    },
    addressLine1: {
        type: String,
    },
    addressLine2: {
        type: String,
    },
    district: {
        type: String,
    },
    state: {
        type: String,
    },
    pincode: {
        type: String,
    },
    newSalary: {
        type: String,
    },
    effectiveDate: {
        type: String,
    },
    date: {
        type: String,
    },
    driveFileId: {
        type: String,
        required: true,
    },
    driveLink: {
        type: String,
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('SalaryHike', salaryHikeSchema);
