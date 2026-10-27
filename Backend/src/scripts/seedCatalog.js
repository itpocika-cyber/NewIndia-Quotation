import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company } from '../models/Company.js';
import { Settings } from '../models/Settings.js';
import { Product } from '../models/Product.js';
import { MasterItem } from '../models/MasterItem.js';
import { Sequence } from '../models/Sequence.js';

dotenv.config();

const SEED_COMPANY = {
  name: "POCIKA FIRE AND SAFETY PRODUCTS LLP",
  llpin: "ABA-3518",
  logoUrl: "/logo.png",
  address: "1st Floor, Plot - M, RJD Textile Park, Ichchhapore, Chorasi",
  city: "Surat",
  state: "Gujarat",
  country: "India",
  pincode: "394510",
  phone: "+91 70965 64828",
  altPhone: "+91 84605 64828",
  email: "sales@pocikafireandsafety.com",
  website: "www.pocikafireandsafety.com",
  gstin: "24ABAFP3518F1Z4",
  pan: "ABAFP3518F",
  bankName: "HDFC Bank Ltd.",
  accountNo: "50200084605648",
  ifsc: "HDFC0000256",
  branch: "Ring Road, Surat, Gujarat",
  upiId: "pocikafire@hdfcbank",
  signatoryName: "Jaydip Pipariya (Authorized Signatory)",
  signatureUrl: ""
};

const DEFAULT_SETTINGS = {
  quotationPrefix: 'QT',
  quotationStartNumber: 1,
  quotationYearFormat: 'YYYY',
  defaultValidityDays: 30,
  currencySymbol: '₹',
  decimalPrecision: 2,
  showBankDetailsOnPDF: true,
  showSignatureOnPDF: true,
  customFooterText: 'Thank you for your business! | This is a Computer Generated Quotation | Regd. Office: Surat, Gujarat | Subject to Surat Jurisdiction.'
};

const SEED_CATEGORIES = [
  { id: "CAT-1", name: "Fire Protection Equipment", description: "Extinguishers, automatic sprinklers, deluge valves, wet alarm valves", status: "Active" },
  { id: "CAT-2", name: "Fire Hydrant & Valves", description: "Single/double landing valves, butterfly valves, branch pipes, hose drums", status: "Active" },
  { id: "CAT-3", name: "Industrial Safety & PPE", description: "Safety helmets, protective workwear, safety goggles, gloves, fall harness", status: "Active" },
  { id: "CAT-4", name: "Road Safety Infrastructure", description: "Traffic cones, convex mirrors, speed breakers, road studs/cat eyes, signage", status: "Active" },
  { id: "CAT-5", name: "Fire Alarm & Detection", description: "Smoke detectors, conventional & addressable control panels, hooters, MCP", status: "Active" },
  { id: "CAT-6", name: "Maintenance & AMC Services", description: "Periodic inspection, hydraulic testing, refilling & annual maintenance", status: "Active" }
];

const SEED_UNITS = [
  { id: "UNT-1", name: "Nos", symbol: "Nos", description: "Numbers / Individual units", status: "Active" },
  { id: "UNT-2", name: "Sets", symbol: "Sets", description: "Complete assemblies or pairs", status: "Active" },
  { id: "UNT-3", name: "Mtrs", symbol: "Mtr", description: "Meters for hose pipes / cabling", status: "Active" },
  { id: "UNT-4", name: "Lot", symbol: "Lot", description: "Job work / AMC consolidated package", status: "Active" },
  { id: "UNT-5", name: "Pairs", symbol: "Prs", description: "Pairs of safety gloves / boots", status: "Active" }
];

const SEED_TAXES = [
  { id: "TAX-1", name: "18% GST (Standard)", rate: 18, description: "Standard rate for fire equipment, valves, and electronics", status: "Active" },
  { id: "TAX-2", name: "12% GST (Concessional)", rate: 12, description: "Rate for textile hose pipes, safety blankets, and helmets", status: "Active" },
  { id: "TAX-3", name: "28% GST (Specific Machinery)", rate: 28, description: "Heavy industrial suppression machinery", status: "Active" },
  { id: "TAX-4", name: "5% GST", rate: 5, description: "Basic raw safety and rubber components", status: "Active" },
  { id: "TAX-5", name: "0% (Exempted)", rate: 0, description: "Government/educational exempt supplies", status: "Active" }
];

const SEED_PRODUCTS = [
  {
    id: "PRD-0001",
    name: "ABC Dry Chemical Powder Fire Extinguisher (4 Kg, IS:15683)",
    make: "POCIKA",
    description: "IS:15683 certified MAP 50% powder fire extinguisher with pressure gauge and wall bracket.",
    category: "Fire Protection Equipment",
    unit: "Nos",
    rate: 1850,
    gstRate: 18,
    hsnCode: "84241000",
    status: "Active"
  },
  {
    id: "PRD-0002",
    name: "CO2 Fire Extinguisher Portable (4.5 Kg Cylinder, IS:15683)",
    make: "POCIKA",
    description: "Seamless carbon steel cylinder with high-pressure discharge bend horn for electrical panels.",
    category: "Fire Protection Equipment",
    unit: "Nos",
    rate: 4200,
    gstRate: 18,
    hsnCode: "84241000",
    status: "Active"
  },
  {
    id: "PRD-0003",
    name: "Pendent Quartzoid Bulb Automatic Fire Sprinkler (68°C, 1/2\" BSP)",
    make: "POCIKA / HD FIRE",
    description: "UL/FM standard response brass automatic sprinkler with thermo-sensitive red quartzoid bulb.",
    category: "Fire Protection Equipment",
    unit: "Nos",
    rate: 220,
    gstRate: 18,
    hsnCode: "84248990",
    status: "Active"
  },
  {
    id: "PRD-0004",
    name: "Single Landing Gunmetal Fire Hydrant Valve (63mm, IS:5290 Type A)",
    make: "POCIKA",
    description: "IS:5290 Type A Gunmetal oblique landing valve with instantaneous coupling and blank cap with chain.",
    category: "Fire Hydrant & Valves",
    unit: "Nos",
    rate: 3450,
    gstRate: 18,
    hsnCode: "84818090",
    status: "Active"
  },
  {
    id: "PRD-0005",
    name: "ISI Marked Swinging Fire Hose Reel Drum with 30m Thermoplastic Hose",
    make: "POCIKA",
    description: "IS:884 certified heavy gauge MS drum with 30-meter PVC braided hose and shut-off jet/spray nozzle.",
    category: "Fire Hydrant & Valves",
    unit: "Sets",
    rate: 4600,
    gstRate: 18,
    hsnCode: "84241000",
    status: "Active"
  },
  {
    id: "PRD-0006",
    name: "Deluge Valve & Wet Alarm Valve Assembly (100mm Flanged)",
    make: "POCIKA / HD FIRE",
    description: "Hydraulically operated differential latch type deluge valve with water motor gong bell and trim.",
    category: "Fire Protection Equipment",
    unit: "Sets",
    rate: 38500,
    gstRate: 18,
    hsnCode: "84818090",
    status: "Active"
  },
  {
    id: "PRD-0007",
    name: "Industrial Safety Helmet with Ratchet Suspension (IS:2925 Certified)",
    make: "POCIKA / KARAM",
    description: "High-density polymer impact-resistant shell with 6-point textile cradle and chin strap.",
    category: "Industrial Safety & PPE",
    unit: "Nos",
    rate: 320,
    gstRate: 12,
    hsnCode: "65061090",
    status: "Active"
  },
  {
    id: "PRD-0008",
    name: "Full Body Fall Protection Safety Harness (IS:3521 Certified)",
    make: "POCIKA / KARAM",
    description: "Polyester webbing full body harness with dorsal D-ring, double lanyard, and scaffold hooks.",
    category: "Industrial Safety & PPE",
    unit: "Sets",
    rate: 1450,
    gstRate: 12,
    hsnCode: "63072090",
    status: "Active"
  },
  {
    id: "PRD-0009",
    name: "Heavy Duty Rubber Speed Breaker (50mm x 350mm x 500mm, Black/Yellow)",
    make: "POCIKA / 3M",
    description: "UV-stabilized virgin vulcanized rubber with high-reflectivity cat-eye reflectors.",
    category: "Road Safety Infrastructure",
    unit: "Nos",
    rate: 650,
    gstRate: 18,
    hsnCode: "40169990",
    status: "Active"
  },
  {
    id: "PRD-0010",
    name: "Outdoor Polycarbonate Convex Traffic Safety Mirror (800mm Diameter)",
    make: "POCIKA",
    description: "Wide-angle unbreakable polycarbonate mirror with orange ABS hood and pole-mounting bracket.",
    category: "Road Safety Infrastructure",
    unit: "Nos",
    rate: 2800,
    gstRate: 18,
    hsnCode: "70099200",
    status: "Active"
  }
];

const SEED_PAYMENT_TERMS = [
  { id: "PAY-1", title: "100% Advance", description: "100% advance payment along with confirmed Purchase Order.", isDefault: false, status: "Active" },
  { id: "PAY-2", title: "50% Adv + 50% Against Delivery", description: "50% advance with order, balance 50% against delivery / dispatch.", isDefault: true, status: "Active" },
  { id: "PAY-3", title: "30 Days Credit", description: "100% payment within 30 days from the date of invoice submission.", isDefault: false, status: "Active" },
  { id: "PAY-4", title: "Against Delivery & Testing", description: "100% payment upon delivery, installation, and joint site testing.", isDefault: false, status: "Active" }
];

const SEED_TERMS_CONDITIONS = [
  { id: "TC-1", title: "Quotation Validity", text: "This quotation is valid for 30 days from the date of issue and subject to confirmation thereafter.", isDefault: true, status: "Active" },
  { id: "TC-2", title: "Delivery Period", text: "Materials will be dispatched from our Surat warehouse within 3 to 7 working days upon receipt of confirmed PO.", isDefault: true, status: "Active" },
  { id: "TC-3", title: "Warranty & Guarantee", text: "All fire protection and safety equipment carries a 12-month standard OEM/brand warranty against manufacturing defects.", isDefault: true, status: "Active" },
  { id: "TC-4", title: "Taxes & Statutory Levies", text: "GST is charged extra as specified. Any statutory government tax revision shall be charged as applicable at the time of invoicing.", isDefault: true, status: "Active" },
  { id: "TC-5", title: "Freight & Delivery", text: "Prices are Ex-Surat. Freight & transit insurance to be borne by the buyer unless agreed otherwise.", isDefault: true, status: "Active" }
];

async function seedCatalog() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Catalog Seed Error] MONGODB_URI not defined in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('[Catalog Seed] Connected to MongoDB. Seeding initial catalog and company defaults...');

  // Company
  await Company.findOneAndUpdate({}, { $set: SEED_COMPANY }, { upsert: true });
  console.log('[Catalog Seed] Company profile seeded');

  // Settings
  await Settings.findOneAndUpdate({}, { $set: DEFAULT_SETTINGS }, { upsert: true });
  console.log('[Catalog Seed] Default settings seeded');

  // Categories
  for (const c of SEED_CATEGORIES) {
    await MasterItem.findOneAndUpdate(
      { id: c.id, type: 'category' },
      { $set: { ...c, type: 'category' } },
      { upsert: true }
    );
  }
  console.log(`[Catalog Seed] Seeded ${SEED_CATEGORIES.length} Categories`);

  // Units
  for (const u of SEED_UNITS) {
    await MasterItem.findOneAndUpdate(
      { id: u.id, type: 'unit' },
      { $set: { ...u, type: 'unit' } },
      { upsert: true }
    );
  }
  console.log(`[Catalog Seed] Seeded ${SEED_UNITS.length} Units`);

  // Taxes
  for (const t of SEED_TAXES) {
    await MasterItem.findOneAndUpdate(
      { id: t.id, type: 'tax' },
      { $set: { ...t, type: 'tax' } },
      { upsert: true }
    );
  }
  console.log(`[Catalog Seed] Seeded ${SEED_TAXES.length} Tax rates`);

  // Payment Terms
  for (const pt of SEED_PAYMENT_TERMS) {
    await MasterItem.findOneAndUpdate(
      { id: pt.id, type: 'payment_term' },
      { $set: { ...pt, type: 'payment_term' } },
      { upsert: true }
    );
  }
  console.log(`[Catalog Seed] Seeded ${SEED_PAYMENT_TERMS.length} Payment terms`);

  // Terms & Conditions
  for (const tc of SEED_TERMS_CONDITIONS) {
    await MasterItem.findOneAndUpdate(
      { id: tc.id, type: 'term_condition' },
      { $set: { ...tc, type: 'term_condition' } },
      { upsert: true }
    );
  }
  console.log(`[Catalog Seed] Seeded ${SEED_TERMS_CONDITIONS.length} Terms & conditions`);

  // Products
  for (const p of SEED_PRODUCTS) {
    await Product.findOneAndUpdate({ id: p.id }, { $set: p }, { upsert: true });
  }
  await Sequence.setCount('product', SEED_PRODUCTS.length);
  console.log(`[Catalog Seed] Seeded ${SEED_PRODUCTS.length} Products and set sequence`);

  console.log('\n[Catalog Seed] Catalog seed finished successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

seedCatalog().catch((err) => {
  console.error('[Catalog Seed Error] Catalog seed failed:', err);
  process.exit(1);
});
