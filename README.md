# MarketHub - Multi-Vendor E-Commerce Marketplace

An enterprise-grade full-stack multi-vendor marketplace platform built for high reliability, modular scalability, and modern developer experience.

MarketHub supports three core user roles:
- **Customer**: Browse products, vendor storefronts, add items to a unified cart, checkout, and track shipments.
- **Vendor**: Manage vendor profile, product catalog, inventory, order fulfillment, and analytics.
- **Admin**: Review vendor onboarding applications, mediate disputes, manage categories, and oversee system health.

---

## Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 8 | Fast, modern client SPA with instant HMR |
| **Styling** | Tailwind CSS v4 | Clean, responsive design system & utility styling |
| **Backend** | Node.js + Express.js | Modular RESTful API architecture |
| **Database** | PostgreSQL | Relational transactional database |
| **Connection** | `pg` (node-postgres) | Connection pooling with graceful startup checks |

---

## Project Structure

```text
MultiVendorMarketplace/
├── frontend/
│   ├── public/
│   │   └── logo.svg                 # MarketHub brand icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Top navigation with live API health indicator
│   │   │   ├── Hero.jsx             # Hero section with role highlights & CTAs
│   │   │   ├── ProductSection.jsx   # Featured products with vendor tags & filters
│   │   │   ├── BackendStatusCard.jsx# Interactive CORS/API verification card
│   │   │   └── Footer.jsx           # Clean footer & system architecture summary
│   │   ├── App.jsx                  # Main application assembly & API polling
│   │   ├── App.css                  # Custom styling overrides
│   │   ├── index.css                # Tailwind CSS v4 entrypoint
│   │   └── main.jsx                 # React root mount
│   ├── .env.example                 # Example client environment variables
│   ├── .gitignore                   # Frontend ignored files (.env, dist, node_modules)
│   ├── index.html                   # HTML5 shell with Inter typography & metadata
│   ├── package.json                 # Frontend dependencies & scripts
│   └── vite.config.js               # Vite configuration with Tailwind CSS & proxy
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js               # Environment configuration loader
│   │   │   └── db.js                # PostgreSQL connection pool with safe checks
│   │   ├── controllers/
│   │   │   └── healthController.js  # GET /api/health controller
│   │   ├── middleware/
│   │   │   └── errorHandler.js      # Centralized error handler and 404 router
│   │   ├── routes/
│   │   │   ├── healthRoutes.js      # Health endpoint routing
│   │   │   └── index.js             # Route aggregator
│   │   ├── services/
│   │   │   └── index.js             # Placeholder for business logic services
│   │   ├── models/
│   │   │   └── index.js             # Placeholder for database models
│   │   ├── app.js                   # Express app with CORS & middleware setup
│   │   └── server.js                # Server entrypoint with graceful shutdown
│   ├── .env.example                 # Safe environment template without secrets
│   ├── .gitignore                   # Backend ignored files (.env, node_modules)
│   └── package.json                 # Backend dependencies (express, cors, dotenv, pg)
│
├── .gitignore                       # Root Git ignore rules
├── package.json                     # Monorepo root helper scripts
└── README.md                        # Documentation and run instructions
```

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended; verified on Node v24)
- npm (v9 or higher; verified on npm v11)
- Git
- PostgreSQL (optional for Stage 1 health check; required for database tables in later stages)

---

### Installation

Install dependencies for both frontend and backend:

#### Option A: From root directory
```bash
npm run install:all
```

#### Option B: Standalone installation
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Running the Application

You need two terminal windows to run both servers concurrently:

#### Terminal 1: Backend API Server
```bash
cd backend
npm run dev
```
- Local URL: [http://localhost:5000](http://localhost:5000)
- Health Check: [http://localhost:5000/api/health](http://localhost:5000/api/health)

#### Terminal 2: Frontend Client (Vite Dev Server)
```bash
cd frontend
npm run dev
```
- Client URL: [http://localhost:5173](http://localhost:5173)

---

## API Endpoints (Stage 1)

### `GET /api/health`
Checks whether the backend is up and running.

**Sample Response:**
```json
{
  "success": true,
  "message": "MarketHub API is running",
  "timestamp": "2026-10-23T10:55:32.305Z",
  "uptime": 15.68,
  "environment": "development"
}
```

---

## Environment Variables

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/markethub_db
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
```
*Note: Real secrets are never committed to git.*

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env` (optional, defaults to `http://localhost:5000` via Vite proxy):
```env
VITE_API_BASE_URL=http://localhost:5000
```
