import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Quotation } from '../models/Quotation.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// All user management routes require valid authentication and 'admin' role
router.use(authenticate, requireRole('admin'));

// GET /api/v1/users
router.get('/', async (req, res, next) => {
  try {
    const [users, quotes] = await Promise.all([
      User.find().select('-passwordHash -password').sort({ createdAt: -1 }),
      Quotation.find({}, 'createdBy createdByEmail preparedBy salesPerson status totals financials')
    ]);

    const formatted = users.map((u) => {
      const uIdStr = u._id.toString();
      const uEmail = u.email?.toLowerCase();
      const uName = u.name?.trim().toLowerCase();

      const userQuotes = quotes.filter((q) => {
        const creatorId = q.createdBy?.toString();
        const creatorEmail = q.createdByEmail?.toLowerCase();
        const prep = q.preparedBy?.trim().toLowerCase();
        const sales = q.salesPerson?.trim().toLowerCase();
        return (
          (creatorId && creatorId === uIdStr) ||
          (creatorEmail && creatorEmail === uEmail) ||
          (prep && uName && prep === uName) ||
          (sales && uName && sales === uName)
        );
      });

      const quotationsCount = userQuotes.length;
      const totalValue = userQuotes.reduce(
        (acc, q) => acc + (q.totals?.grandTotal || q.financials?.grandTotal || 0),
        0
      );
      const acceptedCount = userQuotes.filter((q) => q.status === 'Accepted').length;

      return {
        id: u._id,
        _id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        isSuperAdmin: Boolean(u.isSuperAdmin),
        isActive: Boolean(u.isActive),
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        quotationsCount,
        totalValue,
        acceptedCount
      };
    });

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/users/:id/work
router.get('/:id/work', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash -password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    const quotations = await Quotation.find({
      $or: [
        { createdBy: user._id },
        { createdByEmail: user.email },
        { preparedBy: user.name },
        { salesPerson: user.name }
      ]
    }).sort({ createdAt: -1 });

    const activityLogs = await ActivityLog.find({
      $or: [
        { userId: user._id },
        { user: user.name },
        { user: user.email }
      ]
    }).sort({ timestamp: -1 }).limit(100);

    const totalValue = quotations.reduce((acc, q) => acc + (q.totals?.grandTotal || q.financials?.grandTotal || 0), 0);
    const draftCount = quotations.filter((q) => q.status === 'Draft').length;
    const sentCount = quotations.filter((q) => q.status === 'Sent').length;
    const acceptedCount = quotations.filter((q) => q.status === 'Accepted').length;
    const rejectedCount = quotations.filter((q) => q.status === 'Rejected').length;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        stats: {
          totalQuotations: quotations.length,
          totalValue,
          draftCount,
          sentCount,
          acceptedCount,
          rejectedCount,
          totalActivities: activityLogs.length
        },
        quotations,
        activityLogs
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users
router.post('/', async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address (e.g. user@pocika.com).'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters.'
      });
    }

    if (!role || !role.trim()) {
      return res.status(400).json({
        success: false,
        error: "Access role is required. Please select either 'admin' or 'staff'."
      });
    }

    const cleanRole = role.trim().toLowerCase();
    if (!['admin', 'staff'].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        error: "Invalid access role. Must be either 'admin' or 'staff'."
      });
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `User with email "${cleanEmail}" already exists.`
      });
    }

    const userRole = cleanRole;

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email: cleanEmail,
      name: (name || 'Pocika Staff').trim(),
      role: userRole,
      passwordHash,
      password: passwordHash,
      isSuperAdmin: false, // New users are never isSuperAdmin
      isActive: true
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      data: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isSuperAdmin: false,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/users/:id
 * Update user details or role. Blocked if target isSuperAdmin.
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Master admin protection: reject if target user is isSuperAdmin
    if (user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: The master super-admin account is protected and cannot be modified.'
      });
    }

    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) {
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Invalid role. Role must be 'admin' or 'staff'."
        });
      }
      user.role = role;
    }
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    // If updating password
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters.'
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      user.passwordHash = hash;
      user.password = hash;
    }

    // Ensure isSuperAdmin can never be set via API
    user.isSuperAdmin = false;

    await user.save();

    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: false,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete user account. Blocked if target isSuperAdmin.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      });
    }

    // Master admin protection: reject if target user is isSuperAdmin
    if (user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: The master super-admin account is protected and cannot be deleted.'
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.userId?.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request: You cannot delete your own currently logged-in account.'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `User account "${user.email}" deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
