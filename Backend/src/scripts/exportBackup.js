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
import { User } from '../models/User.js';

dotenv.config();

async function runLiveBackup() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas for live backup...');

  const [
    company,
    settings,
    customers,
    products,
    masterItems,
    quotations,
    activityLogs,
    sequences,
    users
  ] = await Promise.all([
    Company.findOne().lean(),
    Settings.findOne().lean(),
    Customer.find().lean(),
    Product.find().lean(),
    MasterItem.find().lean(),
    Quotation.find().lean(),
    ActivityLog.find().lean(),
    Sequence.find().lean(),
    User.find().select('-passwordHash -password').lean()
  ]);

  const backupData = {
    version: 'pocika_surat_mongo_v1',
    createdAt: new Date().toISOString(),
    counts: {
      customers: customers.length,
      products: products.length,
      masterItems: masterItems.length,
      quotations: quotations.length,
      activityLogs: activityLogs.length,
      sequences: sequences.length,
      users: users.length
    },
    company,
    settings,
    customers,
    products,
    categories: masterItems.filter((i) => i.type === 'category'),
    units: masterItems.filter((i) => i.type === 'unit'),
    taxes: masterItems.filter((i) => i.type === 'tax'),
    paymentTerms: masterItems.filter((i) => i.type === 'payment_term'),
    termsConditions: masterItems.filter((i) => i.type === 'term_condition'),
    quotations,
    activityLogs,
    sequences,
    users
  };

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const outPath = path.join(backupDir, `live_backup_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`Live backup created successfully at: ${outPath}`);
  console.log('Summary of backed-up records:', backupData.counts);
  await mongoose.disconnect();
}

runLiveBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
