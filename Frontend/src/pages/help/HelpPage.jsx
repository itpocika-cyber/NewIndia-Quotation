import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  HelpCircle,
  BookOpen,
  ArrowRight,
  Building2,
  Package,
  Users,
  FileText,
  Percent,
  CreditCard,
  Settings,
  Download,
  Copy,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  DatabaseBackup,
  Layers,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export function HelpPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('setup-order');

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex-col gap-24">
      {/* Top Banner */}
      <div className="page-header">
        <div>
          <h1 className="heading-main" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <HelpCircle size={24} style={{ color: 'var(--color-primary)' }} />
            System User Guide &amp; Onboarding
          </h1>
          <p className="text-caption text-muted" style={{ marginTop: 4 }}>
            Step-by-step setup walkthrough, daily quotation workflows, GST tax rules, and system best practices.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="secondary"
            icon={Settings}
            onClick={() => navigate('/settings')}
          >
            System Settings
          </Button>
          <Button
            variant="primary"
            icon={FileText}
            onClick={() => navigate('/quotations/create')}
          >
            Create Quotation
          </Button>
        </div>
      </div>

      {/* Main Layout: Left Sticky TOC + Right Content Area */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          alignItems: 'start'
        }}
      >
        {/* Left Sticky Table of Contents (TOC) */}
        <div style={{ position: 'sticky', top: '80px', zIndex: 10 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-8">
                <BookOpen size={16} className="text-muted" />
                <h3 className="heading-sub" style={{ fontSize: '14px' }}>Guide Navigation</h3>
              </div>
            </CardHeader>
            <CardBody style={{ padding: '8px' }}>
              <div className="flex-col gap-4">
                {[
                  { id: 'setup-order', label: '1. First-Time Setup Order', icon: Layers },
                  { id: 'quotation-workflow', label: '2. Creating a Quotation', icon: FileText },
                  { id: 'managing-quotations', label: '3. Managing Quotations & Actions', icon: CheckCircle2 },
                  { id: 'dashboard-reports', label: '4. Dashboard & Reports Guide', icon: TrendingUp },
                  { id: 'settings-data', label: '5. Settings, Backups & Safety', icon: DatabaseBackup },
                  { id: 'glossary-terms', label: '6. Key Terms & GST Glossary', icon: BookOpen }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        textAlign: 'left',
                        backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div className="flex items-center gap-8">
                        <Icon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Content Sections (Spans 2 columns on wide view) */}
        <div className="flex-col gap-24" style={{ gridColumn: 'span 2' }}>

          {/* =========================================================================
              SECTION 1: FIRST-TIME SETUP ORDER
              ========================================================================= */}
          <div id="setup-order" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 1: First-Time Setup Order (Setup Sequence)</h2>
                      <p className="text-caption text-muted">Complete these initial steps once to populate your system masters and automated PDF letterhead.</p>
                    </div>
                  </div>
                  <Badge variant="primary">Setup Sequence</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-16">
                  {/* Step 1 */}
                  <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <span className="badge badge-primary" style={{ minWidth: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>1</span>
                        <h4 className="text-bold" style={{ fontSize: '14px' }}>My Company Profile</h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/masters/company')} icon={ExternalLink}>Configure</Button>
                    </div>
                    <p className="text-caption text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                      <strong>Why it matters:</strong> Fill your official business name, registered address, GSTIN, PAN, Bank settlement details (Bank Name, A/C No, IFSC, Branch), and upload your Company Logo &amp; Authorized Signature. These details are automatically embedded on every quotation PDF and letterhead.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <span className="badge badge-primary" style={{ minWidth: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>2</span>
                        <h4 className="text-bold" style={{ fontSize: '14px' }}>Reference Masters (Units, Categories, Tax, Terms)</h4>
                      </div>
                    </div>
                    <p className="text-caption text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                      <strong>Why it matters:</strong> Ye basic dropdown options hain jo har product aur quotation me use hote hain:
                    </p>
                    <div className="flex-col gap-10" style={{ marginTop: 10 }}>
                      <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                        <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Units of Measurement (UOM) — Ginti / Naap Ka Tarika:</div>
                        <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                          Jab aap koi item quote karte hain, toh wo kis unit me count hota hai?
                          <br />• <strong>NOS / PCS (Numbers / Pieces):</strong> Fire Extinguishers, Hydrant Valves, Smoke Detectors.
                          <br />• <strong>MTR (Meters):</strong> Fire Hose Pipes, Delivery Hoses, Cables.
                          <br />• <strong>SET / KIT:</strong> Fire Alarm Control Panel + Hooter + Manual Call Point combo.
                          <br />• <strong>LOT / JOB:</strong> Installation service, Annual Maintenance Contract (AMC), Refilling work.
                          <br />• <strong>LTR / KG (Liters / Kilograms):</strong> Foam concentrate liquid, CO2 gas refilling.
                          <br /><em>PDF par Quantity ke sath ye print hota hai (e.g. <code>Qty: 10 NOS</code>, <code>Qty: 30 MTR</code>).</em>
                        </p>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                        <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Categories (Item Groups):</div>
                        <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                          Products ko organize karne ke liye (jaise <em>Fire Extinguishers, Hydrant System, Fire Suppression, Safety PPE</em>).
                        </p>
                      </div>

                      <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                        <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-primary)' }}>Tax / GST Slabs &amp; Payment Terms:</div>
                        <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                          • <strong>GST Rates:</strong> 0%, 5%, 12%, 18%, 28% standard Indian GST slabs.<br />
                          • <strong>Payment Terms:</strong> Advance vs Delivery payment conditions (e.g. <em>50% Advance, 50% on Delivery</em>).<br />
                          • <strong>Terms &amp; Conditions:</strong> Standard warranty, freight, and validity clauses.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <span className="badge badge-primary" style={{ minWidth: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>3</span>
                        <h4 className="text-bold" style={{ fontSize: '14px' }}>Product / Equipment Master</h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/masters/products')} icon={ExternalLink}>Manage Products</Button>
                    </div>
                    <p className="text-caption text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                      <strong>Why it matters:</strong> Add your fire safety products with standard selling prices, HSN/SAC codes, and default GST rates. When creating a quote, choosing a product will auto-fill its price, HSN, and GST%.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-8">
                        <span className="badge badge-primary" style={{ minWidth: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>4</span>
                        <h4 className="text-bold" style={{ fontSize: '14px' }}>Customer Master (Client Database)</h4>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/masters/customers')} icon={ExternalLink}>Manage Customers</Button>
                    </div>
                    <p className="text-caption text-muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
                      <strong>Why it matters:</strong> Save client contact details, billing addresses, GSTIN numbers, and <strong>State</strong>.
                    </p>
                    <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, backgroundColor: 'var(--color-chrome-bg)', border: '1px solid var(--color-border)', fontSize: '12px' }}>
                      <strong>Crucial GST Rule:</strong> If the customer's state matches your company's state (e.g. Gujarat), the system automatically applies <strong>Intrastate CGST + SGST (50/50 split)</strong>. If the customer is in a different state, the system automatically applies <strong>Interstate IGST</strong>.
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* =========================================================================
              SECTION 2: CREATING A QUOTATION
              ========================================================================= */}
          <div id="quotation-workflow" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 2: Creating a Quotation (Daily Workflow)</h2>
                      <p className="text-caption text-muted">Step-by-step guide to generating GST-compliant commercial estimates.</p>
                    </div>
                  </div>
                  <Badge variant="neutral">Daily Workflow</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-12">
                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>1. Customer Selection &amp; Quote Header</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Select an existing client from the dropdown or click <em>"+ New Customer"</em>. The system automatically populates the billing address, contact person, email, phone, and GSTIN. Quotation Number is generated automatically (e.g., <code>QT-2026-0001</code>) and Validity Days calculates the expiry date automatically.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>2. Adding Product Line Items</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Click <em>"+ Add Item"</em> to select equipment from your master catalog. Quantity, Unit Rate, Line Item Discount %, HSN/SAC code, and GST Rate can be adjusted directly per item. Total taxable and tax amounts calculate in real-time.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>3. Global Discounts &amp; Extra Charges</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Apply overall commercial discounts (as % or fixed ₹ amount) and add additional freight, packaging, or installation charges if applicable.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>4. Automatic GST Split &amp; Round Off</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Tax is calculated per line item and summarized into CGST + SGST (Intrastate) or IGST (Interstate). The <strong>Round Off adjustment</strong> automatically eliminates decimal paise fractions to ensure exact integer Grand Totals.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>5. Save as Draft vs. Save &amp; Finalize Quotation</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      <strong>Save as Draft:</strong> Saves quotation in Draft mode allowing you to return and make structural modifications at any time.<br />
                      <strong>Save Quotation:</strong> Confirms quotation and assigns active tracking status. You can generate PDFs, print, or share immediately.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* =========================================================================
              SECTION 3: MANAGING QUOTATIONS & ACTIONS
              ========================================================================= */}
          <div id="managing-quotations" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 3: Quotation Register &amp; Lifecycle Management</h2>
                      <p className="text-caption text-muted">Status definitions, duplicate workflow, and document export actions.</p>
                    </div>
                  </div>
                  <Badge variant="neutral">Register &amp; Actions</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-12">
                  <h4 className="text-bold" style={{ fontSize: '14px' }}>Status Lifecycle Definitions:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                      <Badge variant="neutral">Draft</Badge>
                      <div className="text-caption text-muted" style={{ marginTop: 4 }}>Quote under preparation. Fully editable.</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <Badge variant="info">Sent</Badge>
                      <div className="text-caption" style={{ color: '#1d4ed8', marginTop: 4 }}>Formally issued to the client for commercial review.</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
                      <Badge variant="warning">Pending</Badge>
                      <div className="text-caption" style={{ color: '#a16207', marginTop: 4 }}>In negotiation or awaiting customer purchase order.</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <Badge variant="success">Accepted</Badge>
                      <div className="text-caption" style={{ color: '#15803d', marginTop: 4 }}>Commercial victory! Client confirmed and approved.</div>
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 6, backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                      <Badge variant="danger">Rejected</Badge>
                      <div className="text-caption" style={{ color: '#b91c1c', marginTop: 4 }}>Deal closed without purchase order or lost to competitor.</div>
                    </div>
                  </div>

                  <h4 className="text-bold" style={{ fontSize: '14px', marginTop: 12 }}>Register Actions:</h4>
                  <ul className="text-caption text-muted" style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                    <li><strong>View Preview:</strong> Opens interactive PDF preview modal with 1-click Download &amp; Print shortcuts.</li>
                    <li><strong>Duplicate:</strong> Clones customer and all line items into a fresh quotation with a newly incremented quotation number. Historical snapshots remain 100% unaltered.</li>
                    <li><strong>Download PDF:</strong> Generates crisp A4 PDF using the standard filename format (e.g. <code>QT-2026-0001-Reliance-Industries.pdf</code>).</li>
                    <li><strong>Direct Print:</strong> Triggers browser print stylesheet optimized for pure A4 printing without sidebar or header buttons.</li>
                  </ul>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* =========================================================================
              SECTION 4: DASHBOARD & REPORTS GUIDE
              ========================================================================= */}
          <div id="dashboard-reports" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 4: Dashboard &amp; Analytics Reports</h2>
                      <p className="text-caption text-muted">Understand your pipeline metrics, conversion rates, and spreadsheet exports.</p>
                    </div>
                  </div>
                  <Badge variant="neutral">Analytics &amp; KPI</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-12">
                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>Executive KPI Cards</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      <strong>Total Pipeline:</strong> Cumulative rupee value of all issued proposals.<br />
                      <strong>Confirmed Orders:</strong> Rupee revenue won from <em>Accepted</em> quotations with real-time conversion rate %.<br />
                      <strong>In Review Pipeline:</strong> Active deals currently in <em>Pending</em> and <em>Sent</em> stages.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>Detailed 3-Tab Reports Module</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      <strong>Quotation Report:</strong> Date-filtered breakdown (Today, This Week, This Month, This Year, Custom Range) with instant CSV export.<br />
                      <strong>Customer Report:</strong> Client billing totals, conversion success rates, and active transaction count.<br />
                      <strong>Product Report:</strong> Fast-moving equipment rankings, units quoted, and total revenue contribution.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* =========================================================================
              SECTION 5: SETTINGS, BACKUPS & DATA SAFETY
              ========================================================================= */}
          <div id="settings-data" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <DatabaseBackup size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 5: Settings, Data Backup &amp; Safety</h2>
                      <p className="text-caption text-muted">Numbering prefixes, PDF layout customization, and database JSON backup management.</p>
                    </div>
                  </div>
                  <Badge variant="neutral">System &amp; Safety</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-12">
                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>Quotation Prefix &amp; Numbering Rules</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Customize your quotation prefix (e.g. <code>QT-2026-</code>) and next sequence number in <strong>Settings &gt; Quotation Configuration</strong>.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '13.5px' }}>PDF Letterhead Toggles</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      Enable or disable Bank Settlement wire details, Authorized Signatory box, or custom legal declaration text directly from the PDF Options tab.
                    </p>
                  </div>

                  <div style={{ padding: '14px 16px', borderRadius: 8, backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div className="flex items-center gap-8" style={{ color: '#B91C1C' }}>
                      <AlertTriangle size={18} />
                      <span className="text-bold" style={{ fontSize: '14px' }}>Data Safety &amp; Backup Best Practices</span>
                    </div>
                    <p className="text-caption" style={{ color: '#991B1B', marginTop: 6, lineHeight: 1.5 }}>
                      Your quotations and masters are safely stored locally in your browser storage. We recommend downloading a <strong>Full JSON Backup</strong> weekly from <em>Settings &gt; Data Management</em>. You can restore this file at any time on any device.
                    </p>
                    <div className="text-caption" style={{ color: '#991B1B', marginTop: 4 }}>
                      <strong>Warning on Clear Data:</strong> Performing a System Reset permanently clears all stored quotations and resets to default seed records. Always keep a downloaded JSON backup!
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* =========================================================================
              SECTION 6: KEY TERMS & GST GLOSSARY
              ========================================================================= */}
          <div id="glossary-terms" style={{ scrollMarginTop: '90px' }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-10">
                    <div style={{ padding: 6, borderRadius: 6, backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h2 className="heading-sub" style={{ fontSize: '16px' }}>Section 6: Commercial &amp; GST Terms Glossary (Samjhein Har Term Ka Matlab)</h2>
                      <p className="text-caption text-muted">Aasan Hinglish aur English me business &amp; GST terms ki saral paribhashayein.</p>
                    </div>
                  </div>
                  <Badge variant="primary">Glossary &amp; Terms</Badge>
                </div>
              </CardHeader>
              <CardBody className="flex-col gap-16">
                <div className="flex-col gap-12">
                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>Units of Measurement (UOM) — Ginti Ka Tarika</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      Har product ko bechte waqt ginte ya naapne ka tareeqa alag hota hai.
                      <br />• <strong>NOS / PCS:</strong> Fire Extinguishers, Hydrant Valves, Smoke Detectors (Count by numbers/pieces).
                      <br />• <strong>MTR (Meters):</strong> Fire Hose Pipe, Delivery Hose, Cables (Measure by length).
                      <br />• <strong>SET:</strong> Complete Fire Alarm Kit / Panel System (Combo set).
                      <br />• <strong>LOT / JOB:</strong> Installation, Refilling, Maintenance Service (Lump-sum service work).
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>HSN / SAC Code — Government GST Product Code</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      • <strong>HSN (Harmonized System of Nomenclature):</strong> Goods/Products ke liye 4 ya 6 digit ka Indian standard GST code (e.g. Fire Extinguisher: <code>8424</code>).<br />
                      • <strong>SAC (Services Accounting Code):</strong> Services aur labour work ke liye code (e.g. Fire Refilling/Audit service: <code>9987</code>).<br />
                      <em>Government GST rules ke mutabiq invoice/quotation par HSN/SAC code hona zaroori hai.</em>
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>Intra-State vs Inter-State GST (CGST+SGST vs IGST)</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      • <strong>Intra-State (Same State):</strong> Agar aapki company Gujarat me hai aur customer bhi Gujarat ka hai, toh tax 2 barabar hisso me split hota hai (e.g. 18% GST = 9% CGST Central Govt + 9% SGST Gujarat Govt).<br />
                      • <strong>Inter-State (Different State):</strong> Agar customer Maharashtra, Rajasthan, Delhi ya kisi aur state ka hai, toh pura tax <strong>IGST (18%)</strong> ke roop me Central Govt ko jata hai.<br />
                      <em>System customer select karte hi unke state ke mutabiq automatic sahi tax formula apply kar deta hai!</em>
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>Round Off Adjustment — Paise Fractions Ka Rounding</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      Discount aur GST calculation ke baad jab total me decimal paise aate hain (jaise ₹ 65,902.60), toh system automatic usko nearest whole rupee (₹ 65,903.00) par round off kar deta hai taaki bank settlement aur billing integer amount me saaf rahe.
                    </p>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 6, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-bold" style={{ fontSize: '14px', color: 'var(--color-primary)' }}>Historical Snapshot Rule — Purana Data Surakshit Rehna</div>
                    <p className="text-caption text-muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                      Ek baar jab quotation ban jati hai, toh uska data (prices, customer details, tax) ek snapshot ke roop me freeze ho jata hai. Agar aap baad me Product Master me price ya Customer ka address badal bhi dete hain, toh purani quotation ka data kabhi nahi badalta.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
