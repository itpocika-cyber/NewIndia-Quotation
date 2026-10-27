# Pocika Quotation — Developer Context & Setup Guide

> **CRITICAL RULE FOR ALL DEVELOPERS (HUMAN OR AI):** 
> Read this entire file before making any architectural or structural changes. This file is the single source of truth for the project. 

---

## 1. Project Overview

Pocika Quotation is a private, internal business tool for **Pocika Fire and Safety Products LLP (Surat, Gujarat)**. It allows authorized staff to create GST-compliant quotations, manage customer and product masters, and generate production-ready PDFs. 

**This is a proprietary, closed-source application protected under a strict License.** It is not for public distribution.

## 2. Technology Stack

- **Frontend:** React (Vite), plain CSS (no Tailwind).
- **Backend:** Node.js + Express.
- **Database:** MongoDB Atlas (via Mongoose).
- **Authentication:** JWT-based sessions, bcrypt password hashing.
- **Storage:** Cloudinary (for product images only).
- **PDF Generation:** Puppeteer (Server-side headless Chrome).
- **Icons:** `lucide-react` strictly. **No emojis** in code, UI, or logs.

---

## 3. Developer Workflow & Git Strategy

**NEVER PUSH DIRECTLY TO `production` UNLESS DEPLOYING TO PRODUCTION.**

We follow a strict 2-branch strategy:
- `production`: The live, production branch. 
- `development`: The active development and testing branch.

### How to write and push code:
1. Always ensure you are on the development branch:
   ```bash
   git checkout development
   ```
2. Make your code changes, test locally, and commit:
   ```bash
   git add .
   git commit -m "feat: added new awesome feature"
   ```
3. Push to the remote development branch for safe keeping/testing:
   ```bash
   git push origin development
   ```
4. **Deploying to Live (Production):**
   When changes are fully tested and approved for live use:
   ```bash
   git checkout production
   git merge development
   git push origin production
   ```

---

## 4. Local Setup Instructions

### Prerequisites
- Node.js (v20.18.0)
- MongoDB Atlas cluster URL
- Cloudinary Account (API Key & Secret)

### Step 1: Environment Variables
Copy the `.env.example` file in the Backend folder to `.env` and fill in the required secrets. 
*Note: `.env` is strictly git-ignored for security.*
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_super_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Initial Admin Creation (Only runs once if no admin exists)
ADMIN_NAME="Pocika Admin"
ADMIN_EMAIL="admin@pocika.com"
ADMIN_PASSWORD="SecurePasswordHere"
```

### Step 2: Install & Run
Open two terminal windows.

**Terminal 1 (Backend):**
```bash
cd Backend
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd Frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000` and the backend on `http://localhost:5000`.

---

## 5. Coding Conventions & Architecture Rules

1. **API Abstraction:** All backend requests must go through `Frontend/src/services/api.js`. Do not write raw `fetch` calls inside React components. The API service automatically handles JWT attachment and 401 redirects.
2. **Icons:** Only use `lucide-react`. Maintain consistent sizing (`size={16}` or `size={20}`). Do not introduce other icon libraries.
3. **UI Modals:** Forms for creation/editing (e.g. Products, Customers) live inside modal overlays, not separate pages.
4. **Security & Validation:** Always disable forms and show loading spinners (`isLoading`, `isSubmitting`) during API requests to prevent double-submissions.
5. **No Dummy Data:** The project is production-ready. Do not reintroduce mock arrays or dummy data variables. Use the database.

---

## 6. Cloudinary Image Pipeline

- All product images upload to the `pocika/quotation-products` folder in Cloudinary.
- **Client-Side Compression:** Images are compressed *in the browser* (via canvas to WebP, ~80% quality, max 1200px) before upload to save bandwidth and prevent payload limits.
- Backend intercepts the file in memory (`multer`), uploads to Cloudinary, and stores the `secure_url` and `public_id` in MongoDB.
- If a product image upload fails on the backend, the system gracefully continues saving the text data to prevent UX failure.
- When a product is deleted or updated, the old image is explicitly destroyed in Cloudinary to prevent orphaned storage.

---

## 7. Current Completed Core Features (Stable)

- [x] JWT Authentication & Role-based access (`admin` vs `staff`).
- [x] Profile-centric UI drawer for Admin settings, users, and backups.
- [x] Product management with image uploads and client-side compression.
- [x] Robust pagination and optimized scrolling for large datasets.
- [x] Sequence generation logic with conflict retries (`E11000` E-proof).
- [x] Auto-save draft functionality for Quotations in progress.
- [x] Server-Side PDF generation via Puppeteer with crisp CSS-based pagination, unbreakable components (`break-inside: avoid`), and repeating headers/footers.
- [x] Complete database-level Import/Export (JSON backup functionality).

## 8. Feature Roadmap (Pending)
1. Quotation Revision management (v1/v2/v3 on negotiation)
2. Margin/Profit Protector (admin-only visibility)
3. Delivery Challan 1-click generation
4. Terms & Conditions preset bundles per category
