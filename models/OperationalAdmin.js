const mongoose = require('mongoose');

const operationalAdminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true ,required: true },
    mobileNumber: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('OperationalAdmin', operationalAdminSchema);
