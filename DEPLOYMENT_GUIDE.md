# 🚀 Omnichannel POS & Loyalty System - Setup & Deployment Guide

This guide will walk you through setting up the POS system on your local server and deploying it for use on multiple devices (Phones, Tablets, and Desktops).

---

## 📋 Prerequisites

Before starting, ensure the following are installed on your local server machine:
1.  **Node.js** (v18.0.0 or higher) - [Download here](https://nodejs.org/)
2.  **MariaDB** (v11.x) - [Download here](https://mariadb.org/download/)
3.  **Git** (Optional, for version control)

---

## 🛠️ Step 1: Database Setup

The POS system uses MariaDB for the centralized local hub.

1. Open your **MariaDB Client** (e.g., HeidiSQL, DBeaver, or the MariaDB Command Line).
2. Log in with your credentials (default used in development: User: `root`, Password: `123`).
3. Create the database (if it doesn't exist):
   ```sql
   CREATE DATABASE IF NOT EXISTS test;
   USE test;
   ```
4. The system will automatically attempt to connect to this database. Ensure your credentials in `src/lib/mysql.ts` match your local MariaDB setup.

---

## 📦 Step 2: Installation

1. Open a terminal (PowerShell or Command Prompt) in the project folder `kels-pos`.
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

---

## 🚀 Step 3: Running the Application

### For Development (Testing locally)
To start the application in development mode with live-reloading:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### For Production (Actual Store Use)
To ensure maximum performance and enable PWA (Offline) features, you must build the app:
1. **Build the project:**
   ```bash
   npm run build
   ```
2. **Start the production server:**
   ```bash
   npm run start
   ```

---

## 📱 Step 4: Accessing on Other Devices

To use the POS on a smartphone or tablet in the same store network:

1. Find your server's **Local IP Address** (Type `ipconfig` in CMD on Windows; look for IPv4 Address, e.g., `192.168.1.50`).
2. On your phone/tablet, open the browser and type: `http://192.168.1.50:3000`.
3. **Install as App (PWA):**
   - **iOS (Safari):** Tap the 'Share' icon and select **'Add to Home Screen'**.
   - **Android (Chrome):** Tap the three dots and select **'Install App'**.

---

## 💡 User Guide & Workflow

### 1. Daily Startup
- Open the App on your device.
- Check the **Online Indicator** (Green dot) in the top right. If it's Red, you are in **Offline Mode**. You can still take orders; they will sync automatically when the dot turns Green.

### 2. Catalog Management (Manager Only)
- Log in as **Manager**.
- Go to the **Catalog** tab.
- Add your products (Fixed price) or services (Variable price like Kilos/Liters).

### 3. Taking an Order
- Tap **New Order** on the dashboard.
- Select/Search for a customer to track loyalty points.
- Add items to the cart. For variable items, a popup will ask for the quantity (e.g., 1.5kg).
- Use the **Hold** button if a customer needs to step away.
- Select a payment method (**Cash, Digital, or Voucher**) to complete the sale.

### 4. End-of-Day Reporting
- Managers can access the **Reports** tab.
- View total sales and payment breakdowns.
- Tap **Print Report** to save as a PDF or send to a printer.

---

## 🔧 Troubleshooting

- **Database Connection Error:** Verify MariaDB is running and the credentials in `src/lib/mysql.ts` are correct.
- **Devices Can't Connect:** Ensure your server's Firewall allows incoming traffic on port `3000` and that all devices are on the same Wi-Fi network.
- **Syncing Issues:** If the dot stays Red, check the server's internet/network connection. The app will keep all data safe in the local storage (IndexedDB) until connection is restored.
