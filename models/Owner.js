const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    name: {type: String, required: false},
    address: {type: String},
    fcmToken: {type: String},
    mobileNumber: {type: String, required: false},
    aadhaarNumber: {type: String, required: false},
    email: {type: String, required: true}
})
module.exports = mongoose.model('Owner', ownerSchema)