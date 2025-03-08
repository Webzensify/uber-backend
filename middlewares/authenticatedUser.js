const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver')
const Owner = require('../models/Owner')
const authenticateUser = async (req, res, next) => {
    const {authtoken, role} = req.headers;
    const {userId} = req.params;
    if (authtoken === undefined) {
        return res.status(500).json({msg: "authToken not defined"});
    }
    try {
        const data = jwt.verify(authtoken, process.env.JWT_SECRET);
        let Model;
        if (role === "owner") {
            Model = Owner;
        } else if (role === "user") {
            Model = User;
        } else if (role === "driver") {
            Model = Driver;
        }
        req.user = await Model.findById(data.user.id);
        console.log('req.user ', req.user);
        next()
    }
    catch(e){
        console.log(e)
        res.json({msg: "Invalid AuthToken"})
    }

}
module.exports = authenticateUser;