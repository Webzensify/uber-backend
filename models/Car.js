const mongoose = require('mongoose')
const carSchema = mongoose.Schema({
    type: {type: String, enums: ["sedan", "hatchback", "suv"], required: true},
    brand: {type: String, required: true},
    model: {type: String, required: true},
    seats: {type: String, required: true},
    number: {type: String, unique: true, required: true},
    desc: {type: String, required: true},
    year: {type: String, required: true},
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "owner"
     }
})
module.exports = mongoose.model('Car', carSchema);