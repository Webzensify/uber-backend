const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const Admin = require('../models/Admin');
const OperationalAdmin = require('../models/OperationalAdmin');

const authenticateUser = async (req, res, next) => {
    console.log(req.headers);
    const { authtoken, role } = req.headers;
    const { userId } = req.params;
    if (authtoken === undefined) {
        return res.status(500).json({ msg: "authToken not defined" });
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
        } else if (role === 'admin') {
            Model = Admin;
        } else if (role === 'operational admin') {
            Model = OperationalAdmin;
        } else {
            return res.status(400).json({ msg: 'Invalid role' });
        }
        console.log(`data: ${data.user}`);
        req.user = await Model.findById(data.user.id);
        req.userID = data.user.id;
        req.user.role = role;
        console.log('req.user ', req.user);
        next();
    } catch (e) {
        console.log(e);
        res.json({ msg: "Invalid AuthToken" });
    }
};

module.exports = authenticateUser;