#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define RST_PIN 9    // Reset pin
#define SS_PIN 10    // Slave Select pin

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance
LiquidCrystal_I2C lcd(0x27, 16, 2);  // LCD initialization, change 0x27 if necessary

// Define UIDs for known users
byte users[4][4] = {
  {0xFB, 0x18, 0xE0, 0x00},  // User 1 UID
  {0x21, 0x0F, 0xE0, 0x00},  // User 2 UID
  {0x43, 0x44, 0xD8, 0x00},  // User 3 UID
  {0x36, 0xD0, 0xDF, 0x00}   // User 4 UID
};

// User names corresponding to UIDs
String userNames[4] = {
  "Millie Akoko",
  "Peter Ndiema",
  "Gladys Njeru",
  "Hosea Mbugua"
};

// Last scan time for each user (in milliseconds)
unsigned long lastScanTimes[4] = {0, 0, 0, 0};
unsigned long debounceTime = 5000;  // 5 seconds debounce time

void setup() {
  Serial.begin(9600);             // Initialize serial communication
  SPI.begin();                    // Initialize SPI bus
  mfrc522.PCD_Init();             // Initialize RFID module
  lcd.init();                     // Initialize the LCD
  lcd.backlight();                // Turn on backlight
  lcd.clear();                    // Clear the display
  lcd.setCursor(0, 0);
  lcd.print("Attendance logs");
  lcd.setCursor(0, 1);
  lcd.print("Ready to scan");
  
  // Wait for Serial connection
  delay(2000); 
}

void loop() {
  // Check if a card is present
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;  // No new card detected
  }

  bool cardFound = false;
  for (int i = 0; i < 4; i++) {
    if (checkUID(mfrc522.uid.uidByte, users[i])) {
      unsigned long currentTime = millis();

      // If the user scanned within 5 seconds of last scan, notify them
      if (currentTime - lastScanTimes[i] < debounceTime) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Already checked");
        lcd.setCursor(0, 1);
        lcd.print("in recently!");
        Serial.println(userNames[i] + " already checked in.");
      } else {
        // Log the attendance - FORMAT: "Name,timestamp"
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Welcome");
        lcd.setCursor(0, 1);
        lcd.print(userNames[i]);  // Display the name of the user
        
        // Send data to Python in the format it expects
        Serial.println(userNames[i] + "," + String(currentTime));
        
        lastScanTimes[i] = currentTime;  // Update the last scan time
      }
      cardFound = true;
      break;  // Exit the loop once a match is found
    }
  }

  if (!cardFound) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Unknown card!");  // Show for unknown cards
    Serial.println("Unknown card detected!");
  }

  // Halt the RFID module for the next read
  mfrc522.PICC_HaltA();
  delay(2000);  // Display message for 2 seconds
  
  // Reset display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Attendance Sys");
  lcd.setCursor(0, 1);
  lcd.print("Ready to scan");
}

// Function to compare two UIDs
bool checkUID(byte *cardUID, byte *knownUID) {
  for (byte i = 0; i < 4; i++) {
    if (cardUID[i] != knownUID[i]) {
      return false;
    }
  }
  return true;
}