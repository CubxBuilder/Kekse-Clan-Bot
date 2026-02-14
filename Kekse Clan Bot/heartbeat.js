const axios = require('axios');

const API_KEY = 'sk_live_fbf210c1ca2f44a9ee2846ec748d7375';
const API_URL = '${window.location.origin}/api/ingest';

async function sendHeartbeat() {
  try {
    await axios.post(`${API_URL}/heartbeat`, {
      apiKey: API_KEY,
      botName: 'Kekse-Clan-Bot',
      status: 'online',
      uptime: process.uptime(),
      cpuUsage: '12%',
      ramUsage: '128MB'
    });
    console.log('Heartbeat sent');
  } catch (err) {
    console.error('Failed to send heartbeat:', err.message);
  }
}

async function sendLog(level, message) {
  await axios.post(`${API_URL}/log`, {
    apiKey: API_KEY,
    botName: 'Kekse-Clan-Bot',
    level,
    message
  });
}

setInterval(sendHeartbeat, 30000);
