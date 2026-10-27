# Pocika Quotation Management System — Database Backup & Recovery Guide

This guide details all recommended backup and restore procedures for the MongoDB Atlas database powering the Pocika Quotation System.

---

## 1. Overview of Backup Strategies

| Method | Best Used For | Tool / Access Required | Target |
|---|---|---|---|
| **App JSON Backup** | Daily/Weekly business backup | Admin user inside Quotation App UI | Portable JSON file |
| **`mongodump` CLI** | Complete binary database backup | Command line + MongoDB Database Tools | BSON / Gzip archive |
| **MongoDB Atlas UI** | Cloud cluster snapshot (Paid tiers) | Atlas Web Console | Point-in-time snapshot |
| **Migration Script** | Moving from LocalStorage to Mongo | Node.js script in `Backend/` | MongoDB Collections |

---

## 2. Strategy A: In-App Full Backup JSON (Recommended for Regular Business Use)

The application includes a built-in JSON backup and restore system in the **Settings** menu.

### Creating a Backup
1. Sign in as an **Admin** user (`admin@pocika.com`).
2. Navigate to **Configuration → Settings**.
3. Under the **Data Management & Backup** card, click **Export Full Backup JSON**.
4. A file named `pocika_backup_YYYY-MM-DD.json` will be saved to your computer.
5. Store this file in a secure corporate drive or external storage.

### Restoring from Backup
1. In **Settings → Data Management & Backup**, click **Import Backup JSON**.
2. Select your `pocika_backup_YYYY-MM-DD.json` file.
3. Confirm the import prompt. The system will bulk-update all records and re-index sequence numbers.
4. The page will reload automatically after completion.

---

## 3. Strategy B: Binary Database Backup (`mongodump` & `mongorestore`)

On the MongoDB Atlas Free Tier (M0), automated continuous snapshots are not provided. You can run `mongodump` periodically to keep exact binary snapshots of all collections and indexes.

### Prerequisites
Download and install **MongoDB Database Tools**:
- [MongoDB Database Tools Download](https://www.mongodb.com/try/download/database-tools)

### Creating a Dump
Open terminal or PowerShell and run:

```bash
mongodump --uri="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pocika" --archive=pocika_backup_$(date +%Y%m%d).gz --gzip
```

*(On Windows PowerShell:)*
```powershell
$date = Get-Date -Format "yyyyMMdd"
mongodump --uri="$env:MONGODB_URI" --archive="pocika_backup_$date.gz" --gzip
```

### Restoring from Dump
To restore a database dump into your cluster:

```bash
mongorestore --uri="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/pocika" --archive=pocika_backup_20260926.gz --gzip --drop
```
> **Warning**: The `--drop` flag will replace existing collections with the data in the archive. Use with caution in production.

---

## 4. Strategy C: Initial Migration from LocalStorage to MongoDB

If you already have existing quotations, customers, or products created in the earlier local version:

1. In the older frontend or local session, click **Export Full Backup JSON** from the Settings screen.
2. Save the resulting file, e.g. `pocika_backup_surat.json`, to your machine.
3. In `Backend/`, execute the migration script:
   ```bash
   cd Backend
   npm run migrate -- ../pocika_backup_surat.json
   ```
4. The script will automatically populate:
   - Company Profile
   - Quotation Settings
   - Customers & Sequences
   - Products & Sequences
   - Categories, Units, Taxes, Payment Terms, Terms & Conditions
   - Quotations & Activity Logs

---

## 5. Strategy D: Fresh Seed Catalog

If deploying a brand new instance with no prior data:
```bash
cd Backend
# 1. Create the initial admin account
npm run seed:admin

# 2. Populate default Pocika catalog (10 standard IS certified products, categories, units, taxes)
npm run seed:catalog
```

---

## 6. Security & Credentials Ground Rules

- **Never** commit `.env` or backup `.gz` / `.json` files to Git.
- Ensure `Backend/.env` contains your genuine Atlas connection string:
  ```env
  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pocika?retryWrites=true&w=majority
  JWT_SECRET=<your-strong-random-key>
  ADMIN_EMAIL=admin@pocika.com
  ADMIN_PASSWORD=<strong-secret-password>
  ```
- After initial deployment and running `npm run seed:admin`, log in as administrator and update the password.
