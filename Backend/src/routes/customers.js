import express from 'express';
import { Customer } from '../models/Customer.js';
import { Sequence } from '../models/Sequence.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateGSTIN } from '../utils/gstValidation.js';

const router = express.Router();
router.use(authenticate);

// GET /api/v1/customers
router.get('/', async (req, res, next) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: customers
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/customers
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      siteName,
      contactPerson,
      phone,
      email,
      country,
      city,
      state,
      pincode,
      taxId,
      foreignRegNo,
      gstin,
      pan,
      billingAddress,
      shippingAddress,
      notes,
      status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required.'
      });
    }

    const isForeign = country && country.trim().toLowerCase() !== 'india';

    // Only strictly validate Indian GSTIN if country is India or unspecified
    if (!isForeign && gstin && gstin.trim()) {
      const gstCheck = validateGSTIN(gstin);
      if (!gstCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: gstCheck.reason
        });
      }
    }

    // Atomic sequence allocation for customer ID (CUS-0001)
    const nextId = await Sequence.getNext('customer', 'CUS-', 4);

    const newCustomer = new Customer({
      id: nextId,
      name: name.trim(),
      siteName: siteName?.trim() || '',
      contactPerson: contactPerson?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      country: country?.trim() || 'India',
      city: city?.trim() || '',
      state: state?.trim() || (isForeign ? 'Foreign' : 'Gujarat'),
      pincode: pincode?.trim() || '',
      taxId: taxId?.trim() || '',
      foreignRegNo: foreignRegNo?.trim() || '',
      gstin: !isForeign ? (gstin?.trim().toUpperCase() || '') : (gstin?.trim() || ''),
      pan: !isForeign ? (pan?.trim().toUpperCase() || '') : '',
      billingAddress: billingAddress?.trim() || '',
      shippingAddress: shippingAddress?.trim() || '',
      notes: notes?.trim() || '',
      status: status || 'Active'
    });

    await newCustomer.save();

    res.status(201).json({
      success: true,
      data: newCustomer
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT / PATCH /api/v1/customers/:id
 */
const updateCustomerHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    const isForeign = updateData.country && updateData.country.trim().toLowerCase() !== 'india';

    if (!isForeign && updateData.gstin && updateData.gstin.trim()) {
      const gstCheck = validateGSTIN(updateData.gstin);
      if (!gstCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: gstCheck.reason
        });
      }
      updateData.gstin = updateData.gstin.trim().toUpperCase();
    }

    delete updateData.id; // Prevent updating business key ID
    delete updateData._id;

    const updated = await Customer.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Customer with ID '${id}' not found.`
      });
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

router.put('/:id', updateCustomerHandler);
router.patch('/:id', updateCustomerHandler);

// DELETE /api/v1/customers/:id
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Customer.findOneAndDelete({ id });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Customer with ID '${id}' not found.`
      });
    }

    res.json({
      success: true,
      message: `Customer ${id} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
