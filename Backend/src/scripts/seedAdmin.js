import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Admin Seed Error] MONGODB_URI not set in .env');
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@pocika.com').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Pocika System Administrator';

  if (!password) {
    console.error('[Admin Seed Error] ADMIN_PASSWORD is required in .env for seedAdmin script');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('[Admin Seed] Connected to MongoDB for admin seeding...');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isSuperAdmin) {
        existingUser.isSuperAdmin = true;
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`[Admin Seed Info] Updated existing admin user "${email}" with isSuperAdmin: true.`);
      } else {
        console.log(`[Admin Seed Info] Admin user with email "${email}" already exists (Role: ${existingUser.role}, SuperAdmin: true).`);
      }
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const adminUser = new User({
        email,
        passwordHash,
        name,
        role: 'admin',
        isSuperAdmin: true,
        isActive: true
      });
      await adminUser.save();
      console.log(`[Admin Seed Success] Admin user "${email}" created successfully.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Admin Seed Error] Error seeding admin user:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

seedAdmin();
