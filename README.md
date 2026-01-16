# 🛡️ PharmaGuard - Camera-First Thermal Safety System

A pharmaceutical supply chain tracking prototype that detects **substandard drugs** (not just counterfeit ones) by monitoring temperature exposure throughout the journey from manufacturer to consumer.

## 🎯 Core Concept

> A medicine can be **GENUINE** yet **UNSAFE** due to heat exposure during transport.

PharmaGuard proves this by:
- Tracking batches through the supply chain
- Scanning temperature-sensitive color-changing stickers at each checkpoint
- Automatically invalidating batches exposed to dangerous temperatures
- Providing transparent journey history to pharmacists and consumers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- A device with a camera (for QR scanning and sticker detection)

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Open in Browser
Navigate to `http://localhost:5173`

## 📱 User Flows

### 1️⃣ Manufacturer
- Create new medicine batches
- Set temperature requirements
- Get batch QR code for tracking

### 2️⃣ Checkpoint / Transport
- Scan batch QR at each transit point
- Scan temperature sticker color via camera
- System automatically logs conditions
- **Red sticker = Automatic batch invalidation**

### 3️⃣ Pharmacist
- Scan batch QR to verify status
- View complete journey timeline
- Generate tablet QR codes for consumers (only if batch is SAFE)

### 4️⃣ Consumer
- Scan tablet/batch QR code
- See verification result:
  - ✅ **GENUINE & SAFE** - Properly stored
  - ⚠️ **GENUINE but HEAT-DAMAGED** - Do not use

## 🌡️ Temperature Sticker System

The system uses color-changing stickers that indicate temperature exposure:

| Color | Status | Action |
|-------|--------|--------|
| 🟢 Green | Safe | Temperature within range |
| 🟡 Yellow | Warning | Elevated exposure, monitor |
| 🔴 Red | Danger | Heat damage - **Batch Invalidated** |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/batch` | Create new batch |
| GET | `/batch/:id` | Get batch details |
| GET | `/batches` | List all batches |
| POST | `/scan` | Log checkpoint scan |
| GET | `/checkpoints` | Get checkpoint order |
| POST | `/tablet` | Create tablet QR codes |
| GET | `/tablet/:id` | Get tablet info (consumer scan) |

## 🏗️ Tech Stack

- **Frontend:** React 18 + Vite, React Router, @zxing/library (QR scanning)
- **Backend:** Node.js, Express, better-sqlite3
- **QR Generation:** qrcode npm package
- **Color Detection:** Custom RGB/HSV analysis

## 📁 Project Structure

```
pharmahack/
├── backend/
│   ├── server.js          # Express API server
│   ├── pharmaguard.db     # SQLite database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks (camera, QR scanner)
│   │   ├── utils/         # API helpers, color detection
│   │   └── App.jsx        # Main app with routing
│   └── package.json
└── README.md
```

## 🎪 Demo Flow

1. **Create a batch** as Manufacturer → Get QR code
2. **Scan at Checkpoint 1** → Green sticker → SAFE
3. **Scan at Checkpoint 2** → Green sticker → Still SAFE
4. **Scan at Checkpoint 3** → **Red sticker** → INVALIDATED!
5. **Pharmacist scans** → Sees "HEAT DAMAGED" warning
6. **Consumer scans** → Sees "GENUINE but HEAT-DAMAGED - DO NOT USE"

This demonstrates that PharmaGuard catches **substandard** drugs (genuine but damaged), not just counterfeits.

## 📜 License

Built for PharmaHack 2026

