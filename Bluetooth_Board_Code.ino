#include <ArduinoBLE.h>

// ===== BLE CONTRACT =====
// Battery Service "180F"
//   Battery Level char "2A19"  uint8 0-100 %, Read | Notify  (REAL battery %)
// Motor Service "6e500001-b5a3-f393-e0a9-e50e24dcca9e" (custom)
//   Motor Cmd char  "6e500002-b5a3-f393-e0a9-e50e24dcca9e"  int, Read | Write
//     0 = OFF, 80-160 = intensity (same value range as before; only the UUID moved)
// Local name: "Vibration Device 2"

// PIN MAPPINGS
const int MOTOR_PWM = 1;       // Pin D1
const int CHARGE_PIN = 22;     // P0.13/P0.22 (Charge speed)
const int VBAT_PIN = PIN_VBAT; // P0.31
const int VBAT_ENABLE = 14;    // P0.14 (Must be LOW to read voltage)

// MOTOR PWM TUNING (analogWrite, default nRF52840 8-bit range 0-255, default PWM freq is fine for an ERM motor)
// Voltage cap math: avg motor V = (pwm/255)*Vsupply. LiPo max ~4.2V, motor rated 3.0V.
//   pwm_for_3V = 255 * 3.0 / 4.2 ~= 182  -> keep PWM_MAX at/below this so avg V stays <= ~3.0V.
const int PWM_MIN = 80;        // tunable: low-end duty to overcome motor stiction (~60-90 of 255)
const int PWM_MAX = 180;       // tunable: voltage-cap ceiling (<=182 keeps avg V <= ~3.0V at 4.2V supply)

// BATTERY -> PERCENT MAPPING (LiPo ~3.3V empty .. 4.2V full)
const float VBAT_EMPTY = 3.3;
const float VBAT_FULL  = 4.2;

// BLE
BLEService batteryService("180F");
BLEUnsignedCharCharacteristic batteryLevelChar("2A19", BLERead | BLENotify);

BLEService motorService("6e500001-b5a3-f393-e0a9-e50e24dcca9e");
BLEIntCharacteristic motorCharacteristic("6e500002-b5a3-f393-e0a9-e50e24dcca9e", BLERead | BLEWrite);

unsigned long lastBatteryUpdate = 0;
const unsigned long BATTERY_INTERVAL = 3000; // ms

void setup() {
  Serial.begin(115200);

  // 1. PIN CONFIGURATION
  pinMode(MOTOR_PWM, OUTPUT);
  digitalWrite(MOTOR_PWM, LOW); // Start with motor OFF

  // 2. BATTERY & CHARGING SETUP
  pinMode(VBAT_ENABLE, OUTPUT);
  digitalWrite(VBAT_ENABLE, LOW); // Enable battery sensing circuit
  pinMode(CHARGE_PIN, OUTPUT);
  digitalWrite(CHARGE_PIN, LOW);  // Set to 100mA charging

  // 3. INITIALIZE BLUETOOTH
  if (!BLE.begin()) {
    Serial.println("Starting BLE failed!");
    while (1);
  }

  BLE.setLocalName("Vibration Device 2");
  BLE.setAdvertisedService(motorService);

  batteryService.addCharacteristic(batteryLevelChar);
  BLE.addService(batteryService);

  motorService.addCharacteristic(motorCharacteristic);
  BLE.addService(motorService);

  motorCharacteristic.writeValue(0);            // OFF
  batteryLevelChar.writeValue(readBatteryPercent());
  BLE.advertise();

  Serial.println("Bluetooth Active. Waiting for connection...");
}

void loop() {
  checkBattery();
  updateBatteryLevel();

  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      checkBattery();
      updateBatteryLevel();

      if (motorCharacteristic.written()) {
        int val = motorCharacteristic.value();
        Serial.print("Data Received: ");
        Serial.println(val);
        setMotor(val);
      }
      delay(100);
    }

    // Safety: stop motor on disconnect
    setMotor(0);
    Serial.println("Disconnected - Motor Safety Stop");
  }
}

// Map 80-160 input to PWM_MIN..PWM_MAX duty; anything else = OFF.
void setMotor(int val) {
  if (val >= 80 && val <= 160) {
    int pwm = map(val, 80, 160, PWM_MIN, PWM_MAX);
    analogWrite(MOTOR_PWM, pwm);
    Serial.print("Motor PWM: ");
    Serial.println(pwm);
  } else {
    analogWrite(MOTOR_PWM, 0);
    digitalWrite(MOTOR_PWM, LOW);
    Serial.println("Motor stopped (Value 0 or Out of Range)");
  }
}

float readBatteryVoltage() {
  uint32_t raw = analogRead(VBAT_PIN);
  // XIAO Divider 1M / 510k: Raw * RefV / Resolution * DividerRatio
  return (float)raw * 3.3 / 1024.0 * (1510.0 / 510.0);
}

uint8_t readBatteryPercent() {
  float v = readBatteryVoltage();
  float pct = (v - VBAT_EMPTY) / (VBAT_FULL - VBAT_EMPTY) * 100.0;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return (uint8_t)pct;
}

void updateBatteryLevel() {
  unsigned long now = millis();
  if (now - lastBatteryUpdate >= BATTERY_INTERVAL) {
    lastBatteryUpdate = now;
    batteryLevelChar.writeValue(readBatteryPercent()); // writeValue notifies subscribers
  }
}

void checkBattery() {
  float voltage = readBatteryVoltage();
  // Critically low: shut down to protect the LiPo cell
  if (voltage < 3.3 && voltage > 1.0) {
    Serial.println("!!! BATTERY CRITICALLY LOW - SHUTTING DOWN !!!");
    analogWrite(MOTOR_PWM, 0);
    digitalWrite(MOTOR_PWM, LOW);
    while (1); // Lock until recharged/reset
  }
}
