const admin = require('firebase-admin');
const serviceAccount = require('../../../serviceAccountKey.json');

try {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin inicializado.');
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error.message);
}

function formatData(data = {}) {
  const formatted = {};
  Object.keys(data).forEach((key) => {
    formatted[key] = data[key] != null ? data[key].toString() : '';
  });
  if (!formatted.click_action) formatted.click_action = 'FLUTTER_NOTIFICATION_CLICK';
  if (!formatted.tipo) formatted.tipo = 'GENERAL';
  return formatted;
}

async function sendPushNotification(token, titulo, cuerpo, data = {}) {
  if (!token) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title: titulo, body: cuerpo },
      data: formatData(data),
    });
  } catch (error) {
    console.error('Error Push Individual:', error.message);
  }
}

async function sendMulticastNotification(tokens, titulo, cuerpo, data = {}) {
  if (!tokens || tokens.length === 0) return;
  const uniqueTokens = [...new Set(tokens)].filter((t) => t && t.length > 10);
  if (uniqueTokens.length === 0) return;
  try {
    const response = await admin.messaging().sendEachForMulticast({
      notification: { title: titulo, body: cuerpo },
      data: formatData(data),
      tokens: uniqueTokens,
    });
    console.log(`Push Grupal: ${response.successCount} enviados, ${response.failureCount} fallos.`);
  } catch (error) {
    console.error('Error Push Multicast:', error.message);
  }
}

module.exports = { sendPushNotification, sendMulticastNotification };
