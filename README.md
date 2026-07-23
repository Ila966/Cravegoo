# Local Business Delivery Platform (LocalDash)

A complete, modern, responsive full-stack delivery ecosystem designed for small local businesses, delivery couriers, customers, and system administrators. 

This platform uses a **Multi-Page Application (MPA)** architecture with fully separated **HTML**, **CSS**, and **JavaScript** files on the frontend, powered by a secure **Node.js/Express** and **Socket.io** real-time API backend.

---

## 🚀 Key Features

* **Zero-Configuration Startup**: The backend features a hybrid database connector that automatically falls back to an in-memory/JSON-file database mock if MongoDB is not running on your host system. It runs flawlessly out-of-the-box!
* **Real-time Tracker**: Live tracking of orders (from `Pending` to `Delivered`) powered by real-time WebSockets via Socket.io.
* **GPS Transit Simulator**: Couriers can simulate driving transit route coordinates in real-time, feeding live coordinate metrics directly onto the customer's tracking map dashboard.
* **Analytical Charts**: Integrated stats charts (using Chart.js) summarizing catalog item category breakdown.
* **Role-Based Portals**: Personalized, dynamic routing structures, sidebars, and workspaces for Customers, Business Owners, Delivery Partners, and Admins.

---

## 🛠️ Tech Stack

### Frontend
* Pure Vanilla HTML5 & CSS3
* Custom Stylesheets (animations, glassmorphic filters, shimmer scrollbars)
* Tailwind CSS (via JIT compilation CDN)
* Socket.io Client (real-time events)
* Chart.js (interactive canvas charts)

### Backend
* Node.js & Express.js MVC API
* Mongoose ODM (MongoDB connector)
* In-Memory Database Fallback Mock Layer
* Socket.io (WebSocket namespaces & rooms manager)
* JWT Authentication (stored securely in client localStorage)
* Bcrypt (password security hashing)
* Security Middlewares (`cors`, `helmet`, `morgan`)

---

## 🔑 Seeding / Demo Accounts
The database automatically seeds itself with standard demo profiles on initial launch (for both MongoDB and Mock DB modes). 

You can log in to any role instantly using the global password: **`password123`**

* **Customer**: `customer@delivery.com`
* **Business Owner**: `business@delivery.com` (Gourmet Pizza Kitchen)
* **Delivery Courier**: `driver@delivery.com`
* **System Admin**: `admin@delivery.com`

---

## 🏁 Quick Start Setup

### Prerequisites
* [Node.js](https://nodejs.org) (v16+ recommended)
* [MongoDB](https://www.mongodb.com) (Optional: the server automatically falls back to Mock mode if MongoDB is absent)

### Running the Platform

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```url
   http://localhost:5000
   ```
   *(The backend server automatically hosts and serves the frontend statically from the root path)*

---

## 📂 Project Architecture

```text
local-business-delivery-platform/
├── backend/
│   ├── config/
│   │   └── db.js            # MongoDB & Mock Failover layer
│   ├── controllers/         # MVC Controllers (auth, customer, business, delivery, admin)
│   ├── middleware/          # JWT protection and Role validation
│   ├── models/              # Mongoose Schema Definitions (User, Business, Product, Order, Delivery)
│   ├── routes/              # Express API Routes (/api/*)
│   ├── utils/
│   │   └── seed.js          # Auto-seeding logic for test profiles
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── server.js            # Express & Socket.io server entry
│
└── frontend/
    ├── css/
    │   └── style.css        # Premium custom stylesheet, shimmers, maps
    ├── js/
    │   ├── api.js           # API fetch communication wrapper
    │   ├── common.js        # Auth guards, notifications toast, navbar builder
    │   ├── login.js         # Authentication executor
    │   ├── order-tracking.js # Live tracking & socket rooms connector
    │   └── [page-name].js   # Dedicated JS controllers for each template page
    │
    ├── index.html           # Beautiful Landing page
    ├── login.html           # Auth portal
    ├── customer-home.html   # Stores browsing grid
    ├── business-detail.html # Menu browse & add-to-cart
    ├── cart.html            # Items checkout summary
    ├── order-tracking.html  # Socket tracking dashboard & map simulator
    ├── business-dashboard.html # Merchant orders management
    └── [page-name].html     # Page templates
```
