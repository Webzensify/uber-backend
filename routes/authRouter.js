import express from 'express'
import bcrypt from 'bcryptjs'
import User from "../models/User.js"
import {JWT_SECRET} from '../config.js'
import jwt from 'jsonwebtoken'
import {body, validationResult} from 'express-validator'

export const router = express.Router()
router.post('/register/', async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty) {
        return res.status(400).json({'errors': errors.array()})
    }
    console.log(req.body)
    const {email, password, role} = req.body
    const userExists = await User.findOne({
        email: email
    })
    if (userExists) {
        return res.status(400).json({msg: "User already exists"})
    }
    const cryptPassword = await bcrypt.hash(password, 10)
    const newUser = await User.create({
        email: email,
        password: cryptPassword,
        role: role
    })
    const data = {
        user: {id: newUser.id}
    }
    // const authToken = jwt.sign(data, JWT_SECRET,{
    //     expiresIn: "1hr"
    // })
    const authToken = jwt.sign(data, JWT_SECRET)
    // res.cookie(
    //     'authToken', {
    //         maxAge: 3600 * 1000,
    //         secure: false,
    //         httpOnly: true
    //     }
    // )
    console.log(newUser)
    return res.status(200).json({msg: "new User created successfully",
        authToken, "user": newUser})
})

router.post('/login/', [
    body('email', 'Email should be valid').isEmail()
], async(req, res) => {
    const {email, password, rememberMe} = req.body
    const userExists = await User.findOne({
        email: email
    })
    if (!userExists) {
        return res.status(400).json(
            {
                "msg": "invalid credentials"
            })
    }
    const comparePass = await bcrypt.compare(password, userExists.password)
    if (!comparePass){
        return res.status(400).json({
            "msg": "Invalid credentials"
        })
    }
    const data = {
        user: {
            id: userExists.id
        }
    }
    // const tokenExpiry = rememberMe ? "7d" : "1hr"
    const authToken = jwt.sign(data, JWT_SECRET)
    // res.cookie('authToken', {
    //     httpOnly: true,
    //     secure: false,
    //     maxAge: rememberMe? 7*24*3600*1000 : 3600*1000
    // })
    return res.status(200).json({
        "msg": "Login success", "authToken": authToken, "user": userExists
    })
})

