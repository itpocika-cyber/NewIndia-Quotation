import express from 'express';
import { Company } from '../models/Company.js';
import { Settings } from '../models/Settings.js';
import { MasterItem } from '../models/MasterItem.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Quotation } from '../models/Quotation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Sequence } from '../models/Sequence.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();
router.use(authenticate);

// === 1. COMPANY ===
router.get('/company', async (req, res, next) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({});
    }
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
});

const updateCompanyHandler = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;

    let company = await Company.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};
router.put('/company', requireRole('admin'), updateCompanyHandler);
router.patch('/company', requireRole('admin'), updateCompanyHandler);

// === 2. SETTINGS ===
router.get('/settings', async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

const updateSettingsHandler = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;

    let settings = await Settings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};
router.put('/settings', requireRole('admin'), updateSettingsHandler);
router.patch('/settings', requireRole('admin'), updateSettingsHandler);

// === 3. CONSOLIDATED INITIAL LOAD ===
router.get('/all', async (req, res, next) => {
  try {
    // Non-admin staff only receive their own quotations & logs, admin sees all
    let quotationFilter = {};
    let logFilter = {};
    if (req.user && req.user.role !== 'admin') {
      const userId = req.user.userId || req.user._id;
      const userEmail = req.user.email;
      const userName = req.user.name;
      quotationFilter = {
        $or: [
          ...(userId ? [{ createdBy: userId }] : []),
          ...(userEmail ? [{ createdByEmail: userEmail }] : []),
          ...(userName ? [{ createdByName: userName }, { preparedBy: userName }, { salesPerson: userName }] : [])
        ]
      };
      logFilter = {
        $or: [
          ...(userId ? [{ userId: userId }] : []),
          ...(userName ? [{ user: userName }] : []),
          ...(userEmail ? [{ user: userEmail }] : [])
        ]
      };
    }

    const [
      company,
      settings,
      customers,
      products,
      categories,
      units,
      taxes,
      paymentTerms,
      termsConditions,
      quotations,
      activityLogs
    ] = await Promise.all([
      Company.findOne().then(c => c || Company.create({})),
      Settings.findOne().then(s => s || Settings.create({})),
      Customer.find().sort({ createdAt: -1 }),
      Product.find().sort({ createdAt: -1 }),
      MasterItem.find({ type: 'category' }).sort({ order: 1, createdAt: 1 }),
      MasterItem.find({ type: 'unit' }).sort({ order: 1, createdAt: 1 }),
      MasterItem.find({ type: 'tax' }).sort({ order: 1, createdAt: 1 }),
      MasterItem.find({ type: 'payment_term' }).sort({ order: 1, createdAt: 1 }),
      MasterItem.find({ type: 'term_condition' }).sort({ order: 1, createdAt: 1 }),
      Quotation.find(quotationFilter).sort({ createdAt: -1 }),
      ActivityLog.find(logFilter).sort({ timestamp: -1 }).limit(100)
    ]);

    res.json({
      success: true,
      data: {
        company,
        settings,
        customers,
        products,
        categories,
        units,
        taxes,
        paymentTerms,
        termsConditions,
        quotations,
        activityLogs
      }
    });
  } catch (err) {
    next(err);
  }
});

// === 4. AUXILIARY MASTER ITEMS CRUD (Categories, Units, Taxes, Terms) ===
function createMasterSubRouter(itemType, idPrefix) {
  const subRouter = express.Router();

  subRouter.get('/', async (req, res, next) => {
    try {
      const items = await MasterItem.find({ type: itemType }).sort({ order: 1, createdAt: 1 });
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  });

  subRouter.post('/', async (req, res, next) => {
    try {
      const data = req.body;
      const id = data.id || `${idPrefix}-${Date.now()}`;
      const newItem = new MasterItem({
        ...data,
        id,
        type: itemType
      });
      await newItem.save();
      res.status(201).json({ success: true, data: newItem });
    } catch (err) {
      next(err);
    }
  });

  const updateSubItemHandler = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      delete updateData._id;
      delete updateData.type;

      const updated = await MasterItem.findOneAndUpdate(
        { id, type: itemType },
        { $set: updateData },
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  subRouter.put('/:id', updateSubItemHandler);
  subRouter.patch('/:id', updateSubItemHandler);

  subRouter.delete('/:id', requireRole('admin'), async (req, res, next) => {
    try {
      const { id } = req.params;
      const deleted = await MasterItem.findOneAndDelete({ id, type: itemType });
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, message: 'Item deleted' });
    } catch (err) {
      next(err);
    }
  });

  return subRouter;
}

router.use('/categories', createMasterSubRouter('category', 'CAT'));
router.use('/units', createMasterSubRouter('unit', 'UNT'));
router.use('/taxes', createMasterSubRouter('tax', 'TAX'));
router.use('/payment-terms', createMasterSubRouter('payment_term', 'PAY'));
router.use('/terms-conditions', createMasterSubRouter('term_condition', 'TC'));

// === 5. BACKUP IMPORT & RESET (Admin Only) ===
router.post('/backup/import', requireRole('admin'), async (req, res, next) => {
  try {
    const backupData = req.body;
    if (!backupData) {
      return res.status(400).json({ success: false, error: 'Invalid backup payload' });
    }

    if (backupData.company) {
      delete backupData.company._id;
      await Company.findOneAndUpdate({}, { $set: backupData.company }, { upsert: true });
    }
    if (backupData.settings) {
      delete backupData.settings._id;
      await Settings.findOneAndUpdate({}, { $set: backupData.settings }, { upsert: true });
    }

    if (Array.isArray(backupData.customers) && backupData.customers.length > 0) {
      for (const cus of backupData.customers) {
        delete cus._id;
        await Customer.findOneAndUpdate({ id: cus.id }, { $set: cus }, { upsert: true });
      }
      await Sequence.setCount('customer', backupData.customers.length);
    }

    if (Array.isArray(backupData.products) && backupData.products.length > 0) {
      for (const prd of backupData.products) {
        delete prd._id;
        await Product.findOneAndUpdate({ id: prd.id }, { $set: prd }, { upsert: true });
      }
      await Sequence.setCount('product', backupData.products.length);
    }

    const auxMaps = [
      { key: 'categories', type: 'category' },
      { key: 'units', type: 'unit' },
      { key: 'taxes', type: 'tax' },
      { key: 'paymentTerms', type: 'payment_term' },
      { key: 'termsConditions', type: 'term_condition' }
    ];

    for (const itemMap of auxMaps) {
      const items = backupData[itemMap.key];
      if (Array.isArray(items)) {
        for (const itm of items) {
          delete itm._id;
          await MasterItem.findOneAndUpdate(
            { id: itm.id, type: itemMap.type },
            { $set: { ...itm, type: itemMap.type } },
            { upsert: true }
          );
        }
      }
    }

    if (Array.isArray(backupData.quotations) && backupData.quotations.length > 0) {
      for (const q of backupData.quotations) {
        delete q._id;
        await Quotation.findOneAndUpdate({ quotationNo: q.quotationNo }, { $set: q }, { upsert: true });
      }
      await Sequence.setCount('quotation', backupData.quotations.length);
    }

    if (Array.isArray(backupData.activityLogs) && backupData.activityLogs.length > 0) {
      for (const act of backupData.activityLogs) {
        delete act._id;
        await ActivityLog.findOneAndUpdate({ id: act.id }, { $set: act }, { upsert: true });
      }
    }

    res.json({
      success: true,
      message: 'Full backup imported successfully into MongoDB.'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset', requireRole('admin'), async (req, res, next) => {
  try {
    await Promise.all([
      Customer.deleteMany({}),
      Product.deleteMany({}),
      Quotation.deleteMany({}),
      ActivityLog.deleteMany({}),
      Sequence.deleteMany({})
    ]);
    res.json({ success: true, message: 'All transaction data reset successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
