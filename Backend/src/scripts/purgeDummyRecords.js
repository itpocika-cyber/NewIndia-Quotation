import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function purgeDummyRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('Connected to MongoDB for purging dummy records...');

    // 1. Delete all non-admin users (keep ONLY admin@pocika.com)
    const userDeleteResult = await db.collection('users').deleteMany({
      email: { $ne: 'admin@pocika.com' }
    });
    console.log(`1. Purged ${userDeleteResult.deletedCount} non-admin user(s).`);

    // 2. Delete all dummy quotations
    const quoteDeleteResult = await db.collection('quotations').deleteMany({});
    console.log(`2. Purged ${quoteDeleteResult.deletedCount} dummy quotation(s).`);

    // 3. Delete all dummy customers
    const custDeleteResult = await db.collection('customers').deleteMany({});
    console.log(`3. Purged ${custDeleteResult.deletedCount} dummy customer(s).`);

    // 4. Delete all dummy activity logs
    const actDeleteResult = await db.collection('activitylogs').deleteMany({});
    console.log(`4. Purged ${actDeleteResult.deletedCount} dummy activity log(s).`);

    // 5. Reset sequence counters to 0
    await db.collection('sequences').updateOne({ key: 'quotation' }, { $set: { seq: 0 } }, { upsert: true });
    await db.collection('sequences').updateOne({ key: 'customer' }, { $set: { seq: 0 } }, { upsert: true });
    await db.collection('sequences').updateOne({ key: 'inquiry' }, { $set: { seq: 0 } }, { upsert: true });
    console.log('5. Sequence counters reset to 0 (next quote will start cleanly at QT-2026-0001).');

    // 6. Ensure superadmin user exists and is properly configured
    const adminUser = await db.collection('users').findOne({ email: 'admin@pocika.com' });
    if (adminUser) {
      await db.collection('users').updateOne(
        { email: 'admin@pocika.com' },
        {
          $set: {
            role: 'admin',
            isSuperAdmin: true,
            isActive: true,
            name: adminUser.name || 'Pocika Admin'
          }
        }
      );
      console.log('6. Verified admin@pocika.com is active Super-Admin.');
    }

    // 7. Add single clean initialization audit log
    await db.collection('activitylogs').insertOne({
      id: 'act-init-clean',
      quotationNo: '',
      action: 'SETTINGS_UPDATED',
      oldStatus: '',
      newStatus: '',
      note: 'System database cleared of all dummy records. Ready for production quotations.',
      user: adminUser?.name || 'Pocika Admin',
      userId: adminUser?._id || null,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('7. Initialized clean system audit entry.');

    // 8. Verification summary
    const remainingUsers = await db.collection('users').find({}, { projection: { passwordHash: 0, password: 0 } }).toArray();
    const remainingQuotes = await db.collection('quotations').countDocuments();
    const remainingCusts = await db.collection('customers').countDocuments();
    const remainingActs = await db.collection('activitylogs').countDocuments();
    const remainingProducts = await db.collection('products').countDocuments();

    console.log('\n================ FINAL CLEAN DATABASE STATE ================');
    console.log(`- Users (${remainingUsers.length}):`, remainingUsers.map(u => `${u.name} <${u.email}> [${u.role}${u.isSuperAdmin ? ' - SUPERADMIN' : ''}]`));
    console.log(`- Quotations remaining: ${remainingQuotes}`);
    console.log(`- Customers remaining: ${remainingCusts}`);
    console.log(`- Activity logs remaining: ${remainingActs}`);
    console.log(`- Product catalog items remaining: ${remainingProducts} (Pocika product catalog intact)`);
    console.log('============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error purging dummy records:', err);
    process.exit(1);
  }
}

purgeDummyRecords();
