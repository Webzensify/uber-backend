const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendVerificationCode = async (mobileNumber, code) => {
  try {
    await client.messages.create({
      body: `Your verification code is ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber,
    });
    console.log(`OTP ${code} sent to ${mobileNumber}`);
  } catch (error) {
    console.error('Error sending OTP via Twilio:', error);
    throw error; // Let the caller handle the error
  }
};

module.exports = { sendVerificationCode };