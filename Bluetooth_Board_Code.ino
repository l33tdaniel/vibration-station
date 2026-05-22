#include <ArduinoBLE.h>

// PIN MAPPINGS
const int MOTOR_PWM = 1;       // Pin D1
const int CHARGE_PIN = 22;     // P0.13/P0.22 (Charge speed)
const int VBAT_PIN = PIN_VBAT; // P0.31
const int VBAT_ENABLE = 14;    // P0.14 (Must be LOW to read voltage)

// BLE 
// Using a standard Service UUID and a Characteristic UUID
BLEService motorService("180F"); 
BLEIntCharacteristic freqCharacteristic("2A19", BLERead | BLEWrite); 

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
  motorService.addCharacteristic(freqCharacteristic);
  BLE.addService(motorService);
  
  freqCharacteristic.writeValue(0); // Initialize with 0 (OFF)
  BLE.advertise();

  Serial.println("Bluetooth Active. Waiting for connection...");
}

void loop() {
  // Check battery safety periodically
  checkBattery();

  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to: ");
    Serial.println(central.address());

    while (central.connected()) {
      if (freqCharacteristic.written()) {
        int val = freqCharacteristic.value();
        
        Serial.print("Data Received: ");
        Serial.println(val);

        // LOGIC: If input is between 80-160, run the frequency.
        // If input is 0 (or anything else), stop the motor completely.
        if (val >= 80 && val <= 160) {
          tone(MOTOR_PWM, val); 
          Serial.print("Motor Frequency Set: ");
          Serial.print(val);
          Serial.println(" Hz");
        } 
        else {
          // This stops the 'tone' generator and forces the pin to 0V
          noTone(MOTOR_PWM);
          digitalWrite(MOTOR_PWM, LOW); 
          Serial.println("Motor stopped (Value 0 or Out of Range)");
        }
      }
      delay(100); // Small delay for stability
    }

    // Safety: Ensure motor stops if Bluetooth disconnects
    noTone(MOTOR_PWM);
    digitalWrite(MOTOR_PWM, LOW);
    Serial.println("Disconnected - Motor Safety Stop");
  }
}

void checkBattery() {
  // Read raw value (0-1023)
  uint32_t raw = analogRead(VBAT_PIN);
  
  // XIAO Divider: 1M / 510k 
  // Formula: Raw * RefVoltage / Resolution * DividerRatio
  float voltage = (float)raw * 3.3 / 1024.0 * (1510.0 / 510.0);
  
  // If battery is critically low, shut down to protect the LiPo cell
  if (voltage < 3.3 && voltage > 1.0) {
    Serial.println("!!! BATTERY CRITICALLY LOW - SHUTTING DOWN !!!");
    noTone(MOTOR_PWM);
    digitalWrite(MOTOR_PWM, LOW);
    while(1); // Lock the board until recharged/reset
  }
}
