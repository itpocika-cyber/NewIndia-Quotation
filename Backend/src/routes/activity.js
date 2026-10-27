import express from 'express';
import { ActivityLog } from '../models/ActivityLog.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/v1/activity
router.get('/', async (req, res, next) => {
  try {
    const { user, action, quotationNo, search, startDate, endDate } = req.query;
    const filter = {};

    if (user && user !== 'ALL') {
      filter.$or = [
        { user: { $regex: user, $options: 'i' } }
      ];
    }

    if (action && action !== 'ALL') {
      filter.action = action;
    }

    if (quotationNo) {
      filter.quotationNo = { $regex: quotationNo, $options: 'i' };
    }

    if (search) {
      const s = search.trim();
      filter.$or = [
        { quotationNo: { $regex: s, $options: 'i' } },
        { note: { $regex: s, $options: 'i' } },
        { user: { $regex: s, $options: 'i' } },
        { action: { $regex: s, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'email name role');

    const total = await ActivityLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      total
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/activity
router.post('/', async (req, res, next) => {
  try {
    const { quotationNo, action, oldStatus, newStatus, note, user } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Activity action is required.'
      });
    }

    const resolvedUser = req.user?.name || req.user?.email || user || 'System';
    const resolvedUserId = req.user?.userId || req.user?._id || req.user?.id || null;

    const logEntry = new ActivityLog({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      quotationNo: quotationNo || '',
      action,
      oldStatus: oldStatus || '',
      newStatus: newStatus || '',
      note: note || '',
      user: resolvedUser,
      userId: resolvedUserId,
      timestamp: new Date()
    });

    await logEntry.save();

    res.status(201).json({
      success: true,
      data: logEntry
    });
  } catch (err) {
    next(err);
  }
});

export default router;
