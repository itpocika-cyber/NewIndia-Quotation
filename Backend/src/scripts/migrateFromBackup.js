import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company } from '../models/Company.js';
import { Settings } from '../models/Settings.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { MasterItem } from '../models/MasterItem.js';
import { Quotation } from '../models/Quotation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Sequence } from '../models/Sequence.js';

dotenv.config();

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Migration Error] MONGODB_URI not defined in .env');
    process.exit(1);
  }

  const filePath = process.argv[2];
  if (!filePath) {
    console.error('[Migration Error] Please provide the path to your backup JSON file:');
    console.error('   Usage: node src/scripts/migrateFromBackup.js <path-to-backup.json>');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[Migration Error] File not found at path: ${fullPath}`);
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error('[Migration Error] Failed to read or parse JSON file:', err.message);
    process.exit(1);
  }

  console.log(`[Migration] Connecting to MongoDB...`);
  await mongoose.connect(uri);
  console.log(`[Migration] Connected. Starting data migration from: ${path.basename(fullPath)}`);

  // 1. Company
  if (data.company) {
    delete data.company._id;
    await Company.findOneAndUpdate({}, { $set: data.company }, { upsert: true });
    console.log('[Migration] Migrated Company profile');
  }

  // 2. Settings
  if (data.settings) {
    delete data.settings._id;
    await Settings.findOneAndUpdate({}, { $set: data.settings }, { upsert: true });
    console.log('[Migration] Migrated System Settings');
  }

  // 3. Customers
  if (Array.isArray(data.customers) && data.customers.length > 0) {
    for (const c of data.customers) {
      delete c._id;
      await Customer.findOneAndUpdate({ id: c.id }, { $set: c }, { upsert: true });
    }
    await Sequence.setCount('customer', data.customers.length);
    console.log(`[Migration] Migrated ${data.customers.length} Customers`);
  }

  // 4. Products
  if (Array.isArray(data.products) && data.products.length > 0) {
    for (const p of data.products) {
      delete p._id;
      await Product.findOneAndUpdate({ id: p.id }, { $set: p }, { upsert: true });
    }
    await Sequence.setCount('product', data.products.length);
    console.log(`[Migration] Migrated ${data.products.length} Products`);
  }

  // 5. Auxiliary Masters
  const auxTypes = [
    { key: 'categories', type: 'category' },
    { key: 'units', type: 'unit' },
    { key: 'taxes', type: 'tax' },
    { key: 'paymentTerms', type: 'payment_term' },
    { key: 'termsConditions', type: 'term_condition' }
  ];

  for (const item of auxTypes) {
    const list = data[item.key];
    if (Array.isArray(list) && list.length > 0) {
      for (const itm of list) {
        delete itm._id;
        await MasterItem.findOneAndUpdate(
          { id: itm.id, type: item.type },
          { $set: { ...itm, type: item.type } },
          { upsert: true }
        );
      }
      console.log(`[Migration] Migrated ${list.length} ${item.key}`);
    }
  }

  // 6. Quotations
  if (Array.isArray(data.quotations) && data.quotations.length > 0) {
    for (const q of data.quotations) {
      delete q._id;
      await Quotation.findOneAndUpdate({ quotationNo: q.quotationNo }, { $set: q }, { upsert: true });
    }
    await Sequence.setCount('quotation', data.quotations.length);
    console.log(`[Migration] Migrated ${data.quotations.length} Quotations`);
  }

  // 7. Activity Logs
  if (Array.isArray(data.activityLogs) && data.activityLogs.length > 0) {
    for (const act of data.activityLogs) {
      delete act._id;
      await ActivityLog.findOneAndUpdate({ id: act.id }, { $set: act }, { upsert: true });
    }
    console.log(`[Migration] Migrated ${data.activityLogs.length} Activity Logs`);
  }

  console.log('\n[Migration] Migration completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migration Error] Migration failed:', err);
  process.exit(1);
});
