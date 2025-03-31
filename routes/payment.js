const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const logger = require("../logger");
const authenticateUser = require("../middlewares/authenticatedUser");
const Ride = require("../models/Ride");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order (After User Accepts)
router.post("/create-order", authenticateUser, async (req, res) => {
  const { rideId } = req.body;
  try {
    const ride = await Ride.findById(rideId).populate("userId");
    if (!ride || ride.status !== "accepted") {
      const msg = "Ride not accepted yet or invalid ride ID";
      logger.error(msg);
      return res.status(400).json({ msg });
    }
    if (ride.paymentStatus === "paid") {
      const msg = "Ride payment already completed";
      logger.error(msg);
      return res.status(400).json({ msg });
    }

    const options = {
      amount: ride.fare * 100, // Fare in paise
      currency: "INR",
      receipt: `ride_${rideId}`,
    };

    const order = await razorpay.orders.create(options);
    const msg = `Order created successfully for ride ID ${rideId}`;
    logger.info(msg);
    return res.json({
      msg,
      orderId: order.id,
      amount: options.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const msg = `Error creating Razorpay order for ride ID ${rideId}`;
    logger.error(`${msg}: ${err.message}`);
    return res.status(500).json({ msg, error: err.message });
  }
});

// Verify Payment
router.post("/verify", authenticateUser, async (req, res) => {
  const { rideId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.body;
  try {
    const ride = await Ride.findById(rideId);
    if (!ride || ride.paymentStatus === "paid") {
      const msg = "Invalid ride ID or payment already completed";
      logger.error(msg);
      return res.status(400).json({ msg });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      const msg = "Payment verification failed due to invalid signature";
      logger.error(msg);
      return res.status(400).json({ msg });
    }

    ride.paymentStatus = "paid";
    ride.status = "started";
    await ride.save();
    const msg = `Payment verified and ride ID ${rideId} marked as started`;
    logger.info(msg);
    return res.json({ msg });
  } catch (err) {
    const msg = `Error verifying payment for ride ID ${rideId}`;
    logger.error(`${msg}: ${err.message}`);
    return res.status(500).json({ msg, error: err.message });
  }
});

module.exports = router;
