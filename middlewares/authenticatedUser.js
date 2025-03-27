const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Owner = require('../models/Owner');
const Admin = require('../models/Admin');
const OperationalAdmin = require('../models/OperationalAdmin');

const authenticateUser = async (req, res, next) => {
    console.log(req.headers);
    const { authtoken, role } = req.headers;
    if (!authtoken) {
        return res.status(401).json({ msg: "AuthToken not provided" });
    }
    try {
        const data = jwt.verify(authtoken, process.env.JWT_SECRET);
        if (!data || !data.id) {
            return res.status(401).json({ msg: "Invalid token payload" });
        }

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

        const user = await Model.findById(data.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        console.log(`dataid: ${data.id}`)
        req.user = user;
        req.userID = data.id;
        req.user.role = role;
        console.log('Authenticated user:', req.user);
        next();
    } catch (e) {
        console.error('Authentication error:', e.message);
        res.status(401).json({ msg: "Invalid AuthToken" });
    }
};

module.exports = authenticateUser;