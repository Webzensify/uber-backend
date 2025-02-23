const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(process.env.FIREBASE_CREDENTIALS_PATH),
});

const sendNotification = async (fcmToken, title, body) => {
  const message = {
    notification: { title, body },
    token: fcmToken,
  };
  try {
    await admin.messaging().send(message);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = { sendNotification };