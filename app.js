// MQTT Topics matching your ESP32 Wokwi code
const topicVoltage = 'esp32/user123/voltage';
const topicPercent = 'esp32/user123/percentage';
const topicLedStatus = 'esp32/user123/led_status';

// UI Elements
const statusBadge = document.getElementById('connection-status');
const brokerInfo = document.getElementById('broker-info');
const voltText = document.getElementById('volt');
const percentText = document.getElementById('percent');
const voltBar = document.getElementById('volt-bar');
const ledStatusText = document.getElementById('status');
const ledBulb = document.getElementById('led-bulb');
const triggerInfo = document.getElementById('trigger-info');

// HiveMQ WebSocket endpoints (TLS Port 8884 primary, Port 8000 fallback)
const brokerUrls = [
  'wss://broker.hivemq.com:8884/mqtt',
  'ws://broker.hivemq.com:8000/mqtt'
];

let urlIndex = 0;
let client = null;

function connectToHiveMQ() {
  if (typeof mqtt === 'undefined') {
    statusBadge.innerText = 'Library Error';
    brokerInfo.innerText = 'Check internet connection to load MQTT.js';
    return;
  }

  const currentUrl = brokerUrls[urlIndex];
  const clientId = 'web_dash_' + Math.random().toString(16).substring(2, 10);

  brokerInfo.innerText = `Connecting to ${currentUrl}...`;

  client = mqtt.connect(currentUrl, {
    clientId: clientId,
    clean: true,
    keepalive: 30,
    connectTimeout: 5000,
    reconnectPeriod: 3000
  });

  client.on('connect', () => {
    statusBadge.innerText = 'Connected';
    statusBadge.className = 'badge connected';
    brokerInfo.innerText = `Connected to broker.hivemq.com`;

    client.subscribe([topicVoltage, topicPercent, topicLedStatus], (err) => {
      if (!err) {
        console.log('Subscribed to ESP32 topics');
      }
    });
  });

  client.on('message', (topic, message) => {
    const payload = message.toString();

    if (topic === topicVoltage) {
      const voltage = parseFloat(payload) || 0;
      voltText.innerText = voltage.toFixed(2);
    }

    if (topic === topicPercent) {
      const pct = parseInt(payload, 10) || 0;
      percentText.innerText = pct;
      voltBar.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    }

    if (topic === topicLedStatus) {
      ledStatusText.innerText = payload;
      if (payload === 'ON') {
        ledBulb.className = 'led-bulb on';
        triggerInfo.innerText = 'Threshold reached (≥ 80% / 4.00V)';
      } else {
        ledBulb.className = 'led-bulb off';
        triggerInfo.innerText = 'Below 80% threshold (< 4.00V)';
      }
    }
  });

  client.on('error', (err) => {
    console.warn('MQTT Error on ' + currentUrl, err);
    statusBadge.innerText = 'Disconnected';
    statusBadge.className = 'badge disconnected';

    // Switch to fallback port if primary port fails
    if (urlIndex === 0 && window.location.protocol !== 'https:') {
      client.end(true);
      urlIndex = 1;
      connectToHiveMQ();
    }
  });

  client.on('close', () => {
    statusBadge.innerText = 'Disconnected';
    statusBadge.className = 'badge disconnected';
  });
}

// Start connection on page load
connectToHiveMQ();
