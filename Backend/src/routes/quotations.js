import express from 'express';
import mongoose from 'mongoose';
import { Quotation } from '../models/Quotation.js';
import { Company } from '../models/Company.js';
import { Sequence } from '../models/Sequence.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { renderQuotationToPdf, buildFullHtmlPage } from '../utils/pdfRenderer.js';
import { calculateQuotationTotals } from '../utils/calculations.js';
import { getCurrencyConfig } from '../constants/currencies.js';

const router = express.Router();
router.use(authenticate);

// GET /api/v1/quotations
router.get('/', async (req, res, next) => {
  try {
    let filter = {};
    // Non-admin staff only see their own quotations, admin sees all
    if (req.user && req.user.role !== 'admin') {
      const userId = req.user.userId || req.user._id;
      const userEmail = req.user.email;
      const userName = req.user.name;
      filter = {
        $or: [
          ...(userId ? [{ createdBy: userId }] : []),
          ...(userEmail ? [{ createdByEmail: userEmail }] : []),
          ...(userName ? [{ createdByName: userName }, { preparedBy: userName }, { salesPerson: userName }] : [])
        ]
      };
    }

    const list = await Quotation.find(filter).populate('createdBy', 'name email role').sort({ createdAt: -1 });
    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/quotations/next-number?prefix=QT-2026-
router.get('/next-number', async (req, res, next) => {
  try {
    const prefix = req.query.prefix || 'QT-';
    const nextNumber = await Sequence.peekNext('quotation', prefix, 4);
    res.json({
      success: true,
      data: nextNumber
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/quotations/next-inquiry and /next-inquiry-number
const getNextInquiryHandler = async (req, res, next) => {
  try {
    const prefix = 'INQ-';
    const nextInq = await Sequence.peekNext('inquiry', prefix, 4);
    res.json({
      success: true,
      data: nextInq
    });
  } catch (err) {
    next(err);
  }
};
router.get('/next-inquiry', getNextInquiryHandler);
router.get('/next-inquiry-number', getNextInquiryHandler);

// GET /api/v1/quotations/:id/html & /:id/print
const renderQuotationHtmlHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = { quotationNo: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { quotationNo: id }] };
    }

    const quotation = await Quotation.findOne(query);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: `Quotation '${id}' not found.`
      });
    }

    let company = quotation.companySnapshot;
    if (!company || !company.name) {
      if (mongoose.connection.readyState === 1) {
        try {
          const companyDoc = await Company.findOne();
          if (companyDoc) {
            company = companyDoc.toObject();
          }
        } catch (e) {
          // Fall back to default company configuration in template
        }
      }
    }

    const quotationObj = quotation.toObject ? quotation.toObject() : quotation;
    const html = buildFullHtmlPage(quotationObj, company);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    next(err);
  }
};
router.get('/:id/html', renderQuotationHtmlHandler);
router.get('/:id/print', renderQuotationHtmlHandler);

// POST /api/v1/quotations/render-html
router.post('/render-html', async (req, res, next) => {
  try {
    const quotation = req.body;
    if (!quotation) {
      return res.status(400).json({ success: false, error: 'Quotation data is required.' });
    }

    let company = quotation.companySnapshot;
    if (!company || !company.name) {
      if (mongoose.connection.readyState === 1) {
        try {
          const companyDoc = await Company.findOne();
          if (companyDoc) {
            company = companyDoc.toObject();
          }
        } catch (e) {
          // Fall back to default company configuration in template
        }
      }
    }

    const html = buildFullHtmlPage(quotation, company);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/quotations/render-pdf
router.post('/render-pdf', async (req, res, next) => {
  try {
    const quotation = req.body;
    if (!quotation) {
      return res.status(400).json({ success: false, error: 'Quotation data is required.' });
    }

    let company = quotation.companySnapshot;
    if (!company || !company.name) {
      if (mongoose.connection.readyState === 1) {
        try {
          const companyDoc = await Company.findOne();
          if (companyDoc) {
            company = companyDoc.toObject();
          }
        } catch (e) {
          // Fall back to default company configuration in pdfRenderer
        }
      }
    }

    const pdfBuffer = await renderQuotationToPdf(quotation, company);
    const filename = `${quotation.quotationNo || 'Quotation'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF error in POST /render-pdf:', err);
    next(err);
  }
});

// GET /api/v1/quotations/:id/pdf
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = { quotationNo: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { quotationNo: id }] };
    }

    const quotation = await Quotation.findOne(query);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: `Quotation '${id}' not found.`
      });
    }

    // Security check: Staff cannot download PDF if quotation is not Approved/Accepted/Sent
    if (req.user && req.user.role !== 'admin') {
      const allowed = ['Approved', 'Accepted', 'Sent'];
      if (!allowed.includes(quotation.status)) {
        return res.status(403).json({
          success: false,
          error: 'PDF generation is locked. Quotation requires Admin approval first.'
        });
      }
    }

    let company = quotation.companySnapshot;
    if (!company || !company.name) {
      const companyDoc = await Company.findOne();
      if (companyDoc) {
        company = companyDoc.toObject();
      }
    }

    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : req.query.token;
    const quotationObj = quotation.toObject ? quotation.toObject() : quotation;
    const pdfBuffer = await renderQuotationToPdf(quotationObj, company, { token });
    const filename = `${quotation.quotationNo || 'Quotation'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err) {
    console.error('PDF error in GET /:id/pdf:', err);
    next(err);
  }
});

// GET /api/v1/quotations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = { quotationNo: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { quotationNo: id }] };
    }

    const quotation = await Quotation.findOne(query).populate('createdBy', 'name email role');
    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: `Quotation '${id}' not found.`
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (err) {
    next(err);
  }
});

// Save / Create / Update quotation handler
const saveQuotationHandler = async (req, res, next) => {
  try {
    const quotation = req.body;
    let finalQuotationNo = req.params?.quotationNo || quotation.quotationNo;

    const existing = finalQuotationNo
      ? await Quotation.findOne({ quotationNo: finalQuotationNo })
      : null;

    // Multi-currency & tax treatment configuration
    const currencyData = quotation.currency || {};
    const currencyCode = (currencyData.code || 'INR').toUpperCase();
    const currCfg = getCurrencyConfig(currencyCode);
    const exchangeRate = Math.max(0.000001, parseFloat(currencyData.exchangeRate) || currCfg.defaultExchangeRate || 1);

    const safeCurrency = {
      code: currCfg.code,
      symbol: currCfg.symbol,
      decimals: currCfg.decimals,
      exchangeRate: exchangeRate,
      baseCurrency: 'INR',
      rateDate: currencyData.rateDate || new Date().toISOString().split('T')[0],
      rateSource: currencyData.rateSource || 'Manual'
    };
    quotation.currency = safeCurrency;

    const taxTreatment = quotation.taxTreatment?.type || 'DOMESTIC_REGULAR';
    quotation.taxTreatment = {
      type: taxTreatment,
      lutNumber: quotation.taxTreatment?.lutNumber || '',
      note: quotation.taxTreatment?.note || ''
    };

    // Calculate totals server-side using the universal calculation engine
    const companyDoc = await Company.findOne();
    const companyState = companyDoc?.state || 'Gujarat';
    const customerState = quotation.customer?.state || '';

    const calcResult = calculateQuotationTotals({
      items: Array.isArray(quotation.items) ? quotation.items : [],
      overallDiscountPercent: parseFloat(quotation.overallDiscountPercent) || 0,
      overallGstRate: quotation.overallGstRate || null,
      companyState,
      customerState,
      currencyCode: safeCurrency.code,
      exchangeRate: safeCurrency.exchangeRate,
      taxTreatment
    });

    quotation.items = calcResult.items;
    quotation.overallDiscountPercent = parseFloat(quotation.overallDiscountPercent) || 0;
    quotation.overallGstRate = quotation.overallGstRate || '18';
    const totals = {
      materialTotal: calcResult.materialTotal,
      laborTotal: calcResult.laborTotal,
      subtotal: calcResult.subtotal,
      overallDiscountPercent: parseFloat(quotation.overallDiscountPercent) || 0,
      overallGstRate: quotation.overallGstRate || '18',
      totalDiscount: calcResult.totalDiscount,
      totalTaxable: calcResult.totalTaxable,
      taxableAmount: calcResult.totalTaxable,
      totalTax: calcResult.totalTax,
      isInterState: calcResult.isInterState,
      cgstAmount: calcResult.cgstAmount,
      sgstAmount: calcResult.sgstAmount,
      igstAmount: calcResult.igstAmount,
      roundOff: calcResult.roundOff,
      grandTotal: calcResult.grandTotal,
      currencyCode: safeCurrency.code,
      currencySymbol: safeCurrency.symbol,
      reporting: calcResult.reporting
    };
    quotation.totals = totals;
    quotation.financials = { ...totals };

    if (!existing) {
      if (!finalQuotationNo) {
        // Fallback atomic allocation
        finalQuotationNo = await Sequence.getNext('quotation', 'QT-', 4);
      } else {
        // Extract sequence number from finalQuotationNo
        const match = finalQuotationNo.match(/(\d{4})$/);
        if (match) {
          const savedNum = parseInt(match[1], 10);
          const seqDoc = await Sequence.findOne({ key: 'quotation' });
          if (!seqDoc || savedNum > seqDoc.seq) {
            await Sequence.setCount('quotation', savedNum);
          }
        }
      }

      // Increment inquiry sequence if first-time save with inquiry reference
      if (quotation.referenceNo && quotation.referenceNo.startsWith('INQ-')) {
        const inqMatch = quotation.referenceNo.match(/(\d{4})$/);
        if (inqMatch) {
          const inqNum = parseInt(inqMatch[1], 10);
          const inqSeqDoc = await Sequence.findOne({ key: 'inquiry' });
          if (!inqSeqDoc || inqNum > inqSeqDoc.seq) {
            await Sequence.setCount('inquiry', inqNum);
          }
        }
      }

      let creatorName = quotation.preparedBy || quotation.salesPerson;
      if (!creatorName || creatorName === 'Pocika Staff') {
        if (req.user?.name) {
          creatorName = req.user.name;
        } else if (req.user?.userId) {
          const dbUser = await User.findById(req.user.userId);
          if (dbUser && dbUser.name) creatorName = dbUser.name;
        }
      }
      if (!creatorName) creatorName = req.user?.email || 'Pocika Staff';

      const qRecord = new Quotation({
        ...quotation,
        quotationNo: finalQuotationNo,
        savedAt: quotation.savedAt || new Date(),
        createdBy: req.user?.userId || quotation.createdBy || null,
        createdByName: creatorName,
        createdByEmail: req.user?.email || quotation.createdByEmail || '',
        preparedBy: quotation.preparedBy || creatorName,
        salesPerson: quotation.salesPerson || quotation.preparedBy || creatorName
      });

      await qRecord.save();

      // Log creation to system audit trail
      try {
        await ActivityLog.create({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quotationNo: finalQuotationNo,
          action: 'CREATED',
          newStatus: qRecord.status || 'Draft',
          note: `Quotation ${finalQuotationNo} created for ${qRecord.customer?.name || 'Customer'} (₹${totals.grandTotal || 0}) by ${creatorName}`,
          user: creatorName,
          userId: req.user?.userId || null,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('[ActivityLog Error]', logErr.message);
      }

      return res.status(201).json({
        success: true,
        data: qRecord
      });
    } else {
      // Existing quotation: update
      const updateData = { ...quotation };
      delete updateData._id;
      delete updateData.quotationNo;
      delete updateData.createdBy; // Retain original creator
      delete updateData.createdByName; // Retain original creator
      delete updateData.createdByEmail; // Retain original creator
      updateData.updatedBy = req.user?.userId || null;
      updateData.updatedByName = req.user?.name || req.user?.email || 'Staff';
      updateData.totals = totals;
      updateData.financials = { ...totals };
      updateData.updatedAt = new Date();

      const updated = await Quotation.findOneAndUpdate(
        { quotationNo: finalQuotationNo },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      // Log update to system audit trail
      try {
        await ActivityLog.create({
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          quotationNo: finalQuotationNo,
          action: 'UPDATED',
          newStatus: updated?.status || 'Draft',
          note: `Quotation ${finalQuotationNo} updated by ${req.user?.name || req.user?.email || 'Staff'}`,
          user: req.user?.name || req.user?.email || 'Staff',
          userId: req.user?.userId || null,
          timestamp: new Date()
        });
      } catch (logErr) {
        console.error('[ActivityLog Error]', logErr.message);
      }

      return res.json({
        success: true,
        data: updated
      });
    }
  } catch (err) {
    next(err);
  }
};

router.post('/save', saveQuotationHandler);
router.post('/', saveQuotationHandler);
router.patch('/:quotationNo', saveQuotationHandler);

/**
 * PATCH /api/v1/quotations/:quotationNo/status
 */
router.patch('/:quotationNo/status', async (req, res, next) => {
  try {
    const { quotationNo } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required.'
      });
    }

    const prevQuotation = await Quotation.findOne({ quotationNo });
    const oldStatus = prevQuotation?.status || 'Draft';

    const updateFields = { status, updatedAt: new Date() };
    if (status === 'Approved') {
      updateFields.approvedBy = req.user?.name || req.user?.email || 'Admin';
      updateFields.approvedAt = new Date();
      if (note) updateFields.approvalNote = note;
    }

    const updated = await Quotation.findOneAndUpdate(
      { quotationNo },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: `Quotation '${quotationNo}' not found.`
      });
    }

    // Log status change to audit trail
    try {
      await ActivityLog.create({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        quotationNo,
        action: 'STATUS_CHANGE',
        oldStatus,
        newStatus: status,
        note: note || `Status changed from ${oldStatus} to ${status} by ${req.user?.name || req.user?.email || 'Staff'}`,
        user: req.user?.name || req.user?.email || 'Staff',
        userId: req.user?.userId || null,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('[ActivityLog Error]', logErr.message);
    }

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/quotations/:quotationNo
router.delete('/:quotationNo', requireRole('admin'), async (req, res, next) => {
  try {
    const { quotationNo } = req.params;
    const deleted = await Quotation.findOneAndDelete({ quotationNo });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Quotation '${quotationNo}' not found.`
      });
    }

    // Log deletion to audit trail
    try {
      await ActivityLog.create({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        quotationNo,
        action: 'DELETED',
        note: `Quotation ${quotationNo} deleted by ${req.user?.name || req.user?.email || 'Staff'}`,
        user: req.user?.name || req.user?.email || 'Staff',
        userId: req.user?.userId || null,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('[ActivityLog Error]', logErr.message);
    }

    res.json({
      success: true,
      message: `Quotation ${quotationNo} deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
