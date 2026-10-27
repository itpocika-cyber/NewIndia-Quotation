# Pocika Quotation Management System — Architecture & Technical Reference

## 1. High-Level Architecture Overview

The **Pocika Quotation System** is designed specifically for **Pocika Fire and Safety Products LLP** (Surat, Gujarat), providing GST-compliant quotations, customer/product registers, multi-rate tax calculations (CGST/SGST/IGST), sequential quotation numbering, and role-based access control.

```
┌─────────────────────────────────────────────────────────────┐
│                 React (Vite) Single Page App                │
│  - Lucide Icons, Vanilla CSS Design System, Responsive UI   │
│  - AuthContext (JWT State) & MastersContext (Global Store)  │
│  - Quotation Engine (A4 PDF Print, GSTIN, Word In Rupees)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js + Express API Server                │
│  - Route Rate-Limiting (Brute-force protection on /login)   │
│  - Middleware: JWT Authentication & Role Authorization      │
│  - Atomic Sequence Allocator (Safe concurrent numbering)    │
│  - Modulus-36 Indian GSTIN Validator & Checksum Calculation │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  MongoDB Atlas Cloud (M0)                   │
│  Collections:                                               │
│  - users        - customers     - products                  │
│  - quotations   - masteritems   - company                   │
│  - settings     - sequences     - activitylogs              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication & Authorization Model

### Session Management & JWT
- **Login Endpoint**: `POST /api/v1/auth/login` accepts `{ email, password }`.
- **Password Security**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with 10 salt rounds.
- **JWT Tokens**: Upon authentication, a signed JWT token is issued containing `{ userId, role, email }`, valid for 7 days.
- **Client Storage**: The token is stored securely in `localStorage` (`pocika_auth_token`) and attached to all outbound requests via HTTP header:
  ```http
  Authorization: Bearer <jwt-token>
  ```
- **Brute-Force Protection**: Login requests are rate-limited using `express-rate-limit` (maximum 15 attempts per 15 minutes per IP address).

### Role Separation
1. **`admin`**:
   - Full access to all modules.
   - Can update Company Profile, System Configurations, and General Settings.
   - Can trigger Full Backup Import and Database Reset.
   - Can create and manage staff accounts.
2. **`sales`**:
   - Access to Dashboard, Create Quotation, Quotation Register, Customers, Products, Minor Masters, Reports, and Activity Logs.
   - Restricted from modifying core company profile, settings, and destructive administrative resets.
   - Navigation links to Settings are automatically hidden from the sidebar.

---

## 3. Atomic Sequence Generation & Concurrency

To ensure multiple sales personnel working concurrently never generate conflicting quotation or record numbers, number generation does **not** rely on client-side array lengths.

Instead, the `Sequence` collection uses MongoDB's atomic `findOneAndUpdate` with `$inc`:
```javascript
const result = await Sequence.findOneAndUpdate(
  { key: 'quotation' },
  { $inc: { seq: 1 } },
  { new: true, upsert: true }
);
```

- Quotations follow the format: `QT-YYYY-0001` (e.g. `QT-2026-0001`).
- Inquiries follow: `INQ-YYYY-0001`.
- Customers follow: `CUS-0001`.
- Products follow: `PRD-0001`.

---

## 4. Database Schema Specifications

### `users`
- `email`: String (unique, indexed, lowercase)
- `password`: String (bcrypt hashed, excluded from queries by default)
- `name`: String
- `role`: String enum (`['admin', 'sales']`)
- `isActive`: Boolean (default `true`)
- `lastLogin`: Date

### `customers`
- `id`: String (unique, indexed, e.g. `CUS-0001`)
- `name`: String (required)
- `contactPerson`, `phone`, `email`, `city`, `state`, `billingAddress`, `shippingAddress`, `notes`
- `gstin`: String (15 chars, uppercase)
- `pan`: String (10 chars, uppercase)
- `status`: String enum (`['Active', 'Inactive']`)

### `products`
- `id`: String (unique, indexed, e.g. `PRD-0001`)
- `name`: String (required)
- `make`: String (defaults to `'POCIKA'`)
- `description`, `category`, `unit`, `hsnCode`
- `rate`: Number
- `gstRate`: Number
- `status`: String enum (`['Active', 'Inactive']`)

### `quotations`
- `quotationNo`: String (unique, indexed, e.g. `QT-2026-0001`)
- `quotationDate`: String (`YYYY-MM-DD`)
- `validUntilDate`: String
- `referenceNo`: String
- `subject`: String
- `salesPerson`: String
- `status`: String enum (`['Draft', 'Sent', 'Approved', 'Rejected', 'Expired']`)
- `customer`: Embedded object (customer name, state, GSTIN, address)
- `items`: Subdocument array (product details, quantity, rate, discount, GST breakdown)
- `financials`: Subdocument (subtotal, taxableAmount, CGST, SGST, IGST, roundOff, grandTotal, amountInWords)
- `paymentTermsId`, `paymentTermsNote`, `selectedTermIds`, `companySnapshot`, `notes`
- `createdBy`: ObjectId ref to User

### `masteritems`
Unified schema for auxiliary catalog items:
- `id`: String (e.g. `CAT-1`, `UNT-1`, `TAX-1`, `PAY-1`, `TC-1`)
- `type`: String enum (`['category', 'unit', 'tax', 'payment_term', 'term_condition']`)
- `name` / `title`, `description`, `text`, `symbol`, `rate`, `isDefault`, `status`, `order`

### `activitylogs`
- `id`: String
- `quotationNo`: String
- `action`: String
- `oldStatus`, `newStatus`, `note`
- `user`: String (User name / email)
- `userId`: ObjectId ref to User (records which authenticated user performed the action)
- `timestamp`: Date

---

## 5. API Route Directory

All routes are prefixed with `/api/v1`:

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/auth/login` | Email/password login with rate-limiting | Public |
| `POST` | `/auth/logout` | Session invalidation | Authenticated |
| `GET` | `/auth/me` | Fetch currently logged in user profile | Authenticated |
| `GET` | `/customers` | List all customer profiles | Authenticated |
| `POST` | `/customers` | Create new customer (atomic `CUS-` sequence) | Authenticated |
| `PUT` | `/customers/:id` | Update customer record | Authenticated |
| `DELETE` | `/customers/:id` | Remove customer record | Authenticated |
| `GET` | `/products` | List all product items | Authenticated |
| `POST` | `/products` | Create new product (atomic `PRD-` sequence) | Authenticated |
| `PUT` | `/products/:id` | Update product item | Authenticated |
| `DELETE` | `/products/:id` | Remove product item | Authenticated |
| `GET` | `/masters/all` | Fetch consolidated initial load of all masters | Authenticated |
| `GET` | `/masters/company` | Fetch company profile | Authenticated |
| `PUT` | `/masters/company` | Update company profile | `admin` |
| `GET` | `/masters/settings` | Fetch quotation settings | Authenticated |
| `PUT` | `/masters/settings` | Update quotation settings | `admin` |
| `GET` | `/masters/categories` | List product categories | Authenticated |
| `GET` | `/masters/units` | List units of measurement | Authenticated |
| `GET` | `/masters/taxes` | List GST tax rates | Authenticated |
| `GET` | `/masters/payment-terms` | List payment terms | Authenticated |
| `GET` | `/masters/terms-conditions`| List quotation terms | Authenticated |
| `POST` | `/masters/backup/import` | Full backup JSON import into Mongo | `admin` |
| `POST` | `/masters/reset` | Clear transactional data | `admin` |
| `GET` | `/quotations` | List quotation register | Authenticated |
| `GET` | `/quotations/next-number` | Peek next sequence quotation number | Authenticated |
| `GET` | `/quotations/next-inquiry` | Peek next inquiry number | Authenticated |
| `POST` | `/quotations/save` | Create/Update quotation with sequence commit | Authenticated |
| `PATCH`| `/quotations/:quotationNo/status` | Update quotation lifecycle status | Authenticated |
| `DELETE`| `/quotations/:quotationNo` | Delete quotation | Authenticated |
| `GET` | `/activity` | Fetch recent activity logs | Authenticated |
| `POST` | `/activity` | Record manual or system audit log | Authenticated |
| `GET` | `/health` | Healthcheck (uptime, timestamp) | Public |
