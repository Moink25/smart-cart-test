# Smart Cart RFID System

A smart shopping cart system that uses RFID technology to allow customers to scan products and checkout easily.

## System Components

1. **Web Application**

   - Admin dashboard for product management
   - Customer dashboard for cart connection and checkout
   - Backend server for data management and socket communication

2. **Physical Cart with NodeMCU**
   - ESP8266 NodeMCU for WiFi connectivity
   - RFID-RC522 module for scanning products
   - LCD display for showing cart status
   - LED indicators for user feedback
   - Buttons for interaction (checkout and remove mode)

## Setup Instructions

### Server Setup

1. Navigate to the server directory:

   ```
   cd server
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on port 5000 by default.

### Client Setup

1. Navigate to the client directory:

   ```
   cd client
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

The client will run on port 3000 by default.

### NodeMCU Setup

1. Install the following libraries in Arduino IDE:

   - ESP8266WiFi
   - ESP8266HTTPClient
   - WebSocketsClient
   - ArduinoJson
   - SPI
   - MFRC522
   - LiquidCrystal_I2C

2. Open `arduino/NodeMCU_RFID_WebSocket.ino` in Arduino IDE.

3. Update the WiFi credentials and server IP:

   ```c
   const char *ssid = "YOUR_WIFI_SSID";
   const char *password = "YOUR_WIFI_PASSWORD";
   const char *websocketServer = "YOUR_SERVER_IP";
   ```

4. Update the device ID for your cart:

   ```c
   const char *deviceId = "cart_001";
   ```

5. Connect the hardware components:

   - RFID RC522:

     - SDA -> D8
     - SCK -> D5
     - MOSI -> D7
     - MISO -> D6
     - RST -> D0
     - 3.3V -> 3.3V
     - GND -> GND

   - LCD I2C Display:

     - SDA -> D2
     - SCL -> D1
     - VCC -> 5V or 3.3V
     - GND -> GND

   - Buttons:

     - Checkout Button -> D1
     - Remove Button -> D2
     - Connect to GND when pressed

   - LEDs:
     - Green LED -> D3
     - Red LED -> D4
     - Blue LED -> D5
     - Connect through appropriate resistors to GND

6. Upload the code to your NodeMCU.

## NodeMCU Setup (Simplified HTTP Version)

If you're having issues with the WebSockets library, you can use a simplified version that uses HTTP instead:

1. Install the following libraries in Arduino IDE:

   - ESP8266WiFi
   - ESP8266HTTPClient
   - ArduinoJson
   - SPI
   - MFRC522

2. Open `arduino/NodeMCU_RFID_HTTP.ino` in Arduino IDE.

3. Update the WiFi credentials and server URL:

   ```c
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverUrl = "http://YOUR_SERVER_IP:5000/api/cart/device/rfid-scan";
   ```

4. Update the device ID for your cart:

   ```c
   const char* deviceId = "cart_001";
   ```

5. Connect the hardware components:

   - RFID RC522:

     - SDA -> D8
     - SCK -> D5
     - MOSI -> D7
     - MISO -> D6
     - RST -> D0
     - 3.3V -> 3.3V
     - GND -> GND

   - LEDs:
     - Green LED -> D3
     - Red LED -> D4
     - Connect through appropriate resistors to GND

6. Upload the code to your NodeMCU.

This simplified version only scans RFID tags and sends them to the server via HTTP. It doesn't have the LCD display, buttons, or WebSocket functionality from the full version.

## How to Use

### Admin Actions

1. Login as admin (username: admin, password: admin123)
2. Manage products through the Admin Dashboard
3. View and edit inventory levels

### Customer Actions

1. Login as customer (username: customer, password: customer123)
2. Connect to a physical cart using its device ID
3. Use the physical cart to scan products using RFID
4. View cart contents in real-time on both the web app and the cart's LCD display
5. Press the checkout button on the cart or use the web app to checkout
6. The cart will automatically disconnect after checkout

### Using the Physical Cart

1. The LCD will show "Ready to connect" when the cart is powered on
2. After connecting through the web app, the LCD will show "Cart Connected"
3. Scan products by placing them near the RFID reader
4. Hold the remove button while scanning to remove an item
5. Press the checkout button to complete your purchase
6. The LCD will show your cart contents and total amount

## Technologies Used

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: React, TypeScript, Tailwind CSS
- **Hardware**: NodeMCU ESP8266, RC522 RFID Reader
- **Payment**: Razorpay
- **Authentication**: JWT

## License

MIT
#   s m a r t - c a r t - t e s t  
 