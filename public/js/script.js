// === BLE UUIDs
const SERVICE_UUID = "0000abcd-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000dcba-0000-1000-8000-00805f9b34fb";

// === State
let bluetoothDevice = null;
let gattServer = null;
let sensorCharacteristic = null;
let isConnected = false;
let threatTriggered = false; // Flag to avoid duplicate alerts

// === Sensor data model
let sensorData = {
  thermal: { value: null, status: 'normal' },
  pulse: { value: null, status: 'normal' },
  proximity: { value: null, status: 'safe' },
  motion: { steps: 0, x: 0, y: 0, z: 0, status: 'stationary' },
  pressure: { weight: 0, status: 'normal' }
};

// === DOM References (all elements we interact with in HTML)
const el = {
  connectBtn: document.getElementById('connectBtn'),
  statusDot: document.getElementById('statusDot'),
  connectionStatus: document.getElementById('connectionStatus'),
  statusMessages: document.getElementById('statusMessages'),

  thermalValue: document.getElementById('thermalValue'),
  thermalBar: document.getElementById('thermalBar'),
  thermalStatus: document.getElementById('thermalStatus'),

  pulseValue: document.getElementById('pulseValue'),
  pulseGauge: document.getElementById('pulseGauge'),
  pulseStatus: document.getElementById('pulseStatus'),

  proximityValue: document.getElementById('proximityValue'),
  proximityIndicator: document.getElementById('proximityIndicator'),
  proximityStatus: document.getElementById('proximityStatus'),

  motionValue: document.getElementById('motionValue'),
  motionX: document.getElementById('motionX'),
  motionY: document.getElementById('motionY'),
  motionZ: document.getElementById('motionZ'),
  motionStatus: document.getElementById('motionStatus'),

  pressureValue: document.getElementById('pressureValue'),
  heelPressure: document.getElementById('heelPressure'),
  archPressure: document.getElementById('archPressure'),
  toePressure: document.getElementById('toePressure'),
  pressureStatus: document.getElementById('pressureStatus'),

  threatValue: document.getElementById('threatValue'),
  threatBar: document.getElementById('threatBar'),
  threatChart: document.getElementById('threatChart')?.getContext("2d"),

  alertBox: document.getElementById('alertNotification'),
  decisionTitle: document.getElementById('decisionTitle'),
  decisionDesc: document.getElementById('decisionDesc'),
  emergencyBtn: document.getElementById('emergencyBtn')
};

// === Initialization: Set up event listeners
window.addEventListener('load', () => {
  if (!navigator.bluetooth) {
    showStatus('Bluetooth not supported', 'error');
    el.connectBtn.disabled = true;
    return;
  }
  el.connectBtn.addEventListener('click', toggleConnection);
  el.emergencyBtn.addEventListener('click', handleCancelAlert);
});

// === Toggle Bluetooth Connection
async function toggleConnection() {
  isConnected ? await disconnectDevice() : await connectToDevice();
}

// === Connect to BLE device
async function connectToDevice() {
  try {
    showStatus('Scanning for device…', 'info');
    el.connectBtn.disabled = true;

    bluetoothDevice = await navigator.bluetooth.requestDevice({
      optionalServices: [SERVICE_UUID],
      acceptAllDevices: true
    });

    gattServer = await bluetoothDevice.gatt.connect();
    const service = await gattServer.getPrimaryService(SERVICE_UUID);
    sensorCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    await sensorCharacteristic.startNotifications();
    sensorCharacteristic.addEventListener('characteristicvaluechanged', handleSensorData);
    bluetoothDevice.addEventListener('gattserverdisconnected', handleDisconnection);

    isConnected = true;
    updateConnectionUI();
    showStatus('Connected', 'success');
  } catch (err) {
    showStatus('Connect failed: ' + err.message, 'error');
    isConnected = false;
    updateConnectionUI();
  } finally {
    el.connectBtn.disabled = false;
  }
}

// === Disconnect BLE device
async function disconnectDevice() {
  if (sensorCharacteristic) {
    await sensorCharacteristic.stopNotifications();
    sensorCharacteristic.removeEventListener('characteristicvaluechanged', handleSensorData);
  }
  if (gattServer?.connected) gattServer.disconnect();
  bluetoothDevice?.removeEventListener('gattserverdisconnected', handleDisconnection);

  isConnected = false;
  updateConnectionUI();
  showStatus('Disconnected', 'info');
  hideThreatAlert();
}

function handleDisconnection() {
  isConnected = false;
  updateConnectionUI();
  showStatus('Device disconnected', 'warning');
  hideThreatAlert();
}

// === Update Connection UI Status
function updateConnectionUI() {
  if (isConnected) {
    el.statusDot.style.backgroundColor = '#22c55e';
    el.connectionStatus.textContent = 'Connected';
    el.connectBtn.classList.add('connected');
    el.connectBtn.innerHTML = `<i class="fas fa-unlink"></i><span>Disconnect</span>`;
  } else {
    el.statusDot.style.backgroundColor = '#f87171';
    el.connectionStatus.textContent = 'Disconnected';
    el.connectBtn.classList.remove('connected');
    el.connectBtn.innerHTML = `<i class="fas fa-link"></i><span>Connect Device</span>`;
  }
}

// === Show status message
function showStatus(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `status-message ${type}`;
  d.textContent = msg;
  el.statusMessages.appendChild(d);
  setTimeout(() => d.remove(), 4000);
}

// === Handle incoming BLE sensor data
function handleSensorData(event) {
  try {
    const text = new TextDecoder().decode(event.target.value);
    const incoming = JSON.parse(text);

    // === Thermal Sensor ===
    if (incoming.thermal) {
      sensorData.thermal = incoming.thermal;
      el.thermalValue.textContent = incoming.thermal.value;
      el.thermalStatus.className = `sensor-status ${incoming.thermal.status}`;
      el.thermalBar.style.width = `${incoming.thermal.value}%`;
    }

    // === Pulse Sensor ===
    if (incoming.pulse) {
      sensorData.pulse = incoming.pulse;
      el.pulseValue.textContent = incoming.pulse.value;
      el.pulseStatus.className = `sensor-status ${incoming.pulse.status}`;
      el.pulseGauge.style.strokeDashoffset = 565 - incoming.pulse.value;
    }

    // === Proximity Sensor ===
    if (incoming.proximity) {
      sensorData.proximity = incoming.proximity;
      el.proximityValue.textContent = incoming.proximity.value;
      el.proximityStatus.className = `sensor-status ${incoming.proximity.status}`;
      el.proximityIndicator.style.opacity = incoming.proximity.value < 1 ? 1 : 0.3;
    }

    // === Motion Sensor ===
    if (incoming.motion) {
      sensorData.motion = incoming.motion;
      el.motionValue.textContent = incoming.motion.steps ?? '--';
      el.motionX.style.width = `${Math.abs(incoming.motion.x) * 10}%`;
      el.motionY.style.width = `${Math.abs(incoming.motion.y) * 10}%`;
      el.motionZ.style.width = `${Math.abs(incoming.motion.z) * 10}%`;
      el.motionStatus.className = `sensor-status ${incoming.motion.status}`;
    }

    // === Pressure Sensor ===
    if (incoming.pressure) {
      sensorData.pressure = incoming.pressure;
      el.pressureValue.textContent = incoming.pressure.weight;
      el.pressureStatus.className = `sensor-status ${incoming.pressure.status}`;
      [el.heelPressure, el.archPressure, el.toePressure].forEach(p => {
        if (p) p.style.opacity = incoming.pressure.weight > 0 ? 1 : 0.3;
      });
    }

    // === 🚨 Display Threat Score (0–100)
    if (typeof incoming.threat === 'number') {
      el.threatValue.textContent = incoming.threat;
      el.threatBar.style.width = `${incoming.threat}%`;
      updateThreatChart(incoming.threat);

      // Optional color based on level
      if (incoming.threat >= 80) {
        el.threatStatus.className = 'sensor-status high';
      } else if (incoming.threat >= 50) {
        el.threatStatus.className = 'sensor-status medium';
      } else {
        el.threatStatus.className = 'sensor-status safe';
      }
    }

   if (typeof incoming.sos === 'number') {

  // === SOS Code 1: Physical Threat or Assault Attempt
  if (incoming.sos === 1) {
    showThreatAlert();
    showStatus('🚨 Emergency Detected! Sending Help Alert...', 'warning');

    fetch("http://localhost:8080/send-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "dandapatjeet3@gmail.com",
        subject: "🚨 Emergency Alert: Help Needed",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: red; font-size: 22px;">
              <img src="https://img.icons8.com/emoji/48/triangular-flag-emoji.png" width="28" style="vertical-align: middle;" />
              <span style="margin-left: 8px;">Emergency SOS Alert</span>
            </h2>
            <p><strong>Message:</strong> Someone is trying to harm me or behaving inappropriately. Please respond immediately!</p>
            <p><strong>Threat Level:</strong> ${incoming.threat ?? 'Not specified'}</p>
            <p><strong>Live Location:</strong> 
              <a href="https://www.google.com/maps?q=20.2961,85.8245" target="_blank">
                View on Google Maps
              </a>
            </p>
          </div>
        `
      })
    })
    .then(res => res.json())
    .then(data => console.log("✅ SOS Email Sent:", data))
    .catch(err => console.error("❌ SOS Email Error:", err));
  }

  // === SOS Code 2: Misbehavior Alert
  else if (incoming.sos === 2) {
    showThreatAlert();
    showStatus('🚨 Misbehavior Alert! Sending Alert Email...', 'danger');

    fetch("http://localhost:8080/send-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "dandapatjeet3@gmail.com",
        subject: "🚨 Alert: Misbehavior with Girl Detected",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: red; font-size: 22px;">
              <img src="https://img.icons8.com/emoji/48/triangular-flag-emoji.png" width="28" style="vertical-align: middle;" />
              <span style="margin-left: 8px;">Misbehavior Alert</span>
            </h2>
            <p><strong>Alert:</strong> Someone is misbehaving with me. I need help urgently!</p>

            <p><strong>Live Location:</strong> 
              <a href="https://www.google.com/maps?q=20.2961,85.8245" target="_blank">
                View on Google Maps
              </a>
            </p>
          </div>
        `
      })
    })
    .then(res => res.json())
    .then(data => console.log(" Misbehavior Email Sent:", data))
    .catch(err => console.error(" Misbehavior Email Error:", err));
  }

  // === Reset Alert UI when SOS is 0
  else if (incoming.sos === 0) {
    hideThreatAlert();
    showStatus("SOS cleared. Monitoring continues...", "info");
  }
}


  } catch (e) {
    console.error("Sensor data parse error:", e);
  }
}





// === Show alert box when threat is high
function showThreatAlert() {
  el.alertBox.classList.remove('hidden');
  el.alertBox.classList.add('danger');
  el.decisionTitle.innerHTML = '<i class="fas fa-siren-on"></i> ALERT TRIGGERED';
  el.decisionDesc.textContent = 'Message sent to Police & Volunteers within 500m!';
  el.emergencyBtn.classList.remove('inactive');
  el.emergencyBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Alert';
}

// === Reset UI when threat clears
function hideThreatAlert() {
  threatTriggered = false;
  el.alertBox.classList.add('hidden');
  el.decisionTitle.innerHTML = '<i class="fas fa-shield-alt"></i> SYSTEM SAFE';
  el.decisionDesc.textContent = 'All parameters within normal range.';
  el.emergencyBtn.classList.add('inactive');
  el.emergencyBtn.innerHTML = '<i class="fas fa-shield-alt"></i> System Safe';
}

// === Handle cancel alert button
function handleCancelAlert() {
  // disconnectDevice();
  hideThreatAlert();
  showStatus('Alert cancelled .', 'info');
}

// === Draw/update chart data
let threatChart = null;
function updateThreatChart(value) {
  const ctx = el.threatChart;
  if (!ctx) return;

  if (!threatChart) {
    threatChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Threat',
          data: [],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 100
          }
        }
      }
    });
  }

  const timestamp = new Date().toLocaleTimeString();
  const data = threatChart.data;
  data.labels.push(timestamp);
  data.datasets[0].data.push(value);

  if (data.labels.length > 10) {
    data.labels.shift();
    data.datasets[0].data.shift();
  }

  threatChart.update();
}



function handleCancelAlert() {
  if (!threatTriggered) {
    // 🚫 No alert to cancel
    console.log("ℹ️ No active alert. System already safe.");
    return;
  }

  // ✅ Proceed to cancel the alert
  hideThreatAlert(); // Only hide UI
  showStatus('🚨 Alert cancelled. Monitoring continues...', 'info'); // Optional UI status

  // ✅ Send email that alert was manually cancelled
  fetch("http://localhost:8080/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "dandapatjeet3@gmail.com",  // Your email
      subject: "❌ Alert Cancelled",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: green;">
            <img src="https://img.icons8.com/emoji/48/check-mark-emoji.png" width="24" style="vertical-align: middle;" />
            <span style="margin-left: 6px;">Alert Cancelled</span>
          </h2>
          <p><strong>Status:</strong> I am safe. Nothing happened to me. The device was accidentally triggered, and the alert has been cancelled.</p>
          <p style="font-size: 13px; color: #777;">Time: ${new Date().toLocaleString()}</p>
        </div>
      `
    })
  })
    .then(res => res.json())
    .then(data => console.log("✅ Cancel email sent:", data))
    .catch(err => console.error("❌ Cancel email error:", err));
}
