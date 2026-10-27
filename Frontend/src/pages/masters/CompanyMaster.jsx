import React, { useState } from 'react';
import { Card, CardHeader, CardBody, CardFooter } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired, isValidEmail, isValidPhone, isValidGSTIN, isValidPAN } from '../../utils/validation';

export function CompanyMaster() {
  const { company, updateCompany } = useMasters();
  const { success, error } = useToast();

  const [formData, setFormData] = useState({ ...company, logoUrl: company.logoUrl || '/logo.png' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      error('File too large', 'Please upload an image smaller than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, [field]: reader.result }));
      success('Image Loaded', `${field === 'logoUrl' ? 'Logo' : 'Signature'} updated.`);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};

    if (!isRequired(formData.name)) newErrors.name = 'Company name is required';
    if (!isRequired(formData.city)) newErrors.city = 'City is required';
    if (!isRequired(formData.state)) newErrors.state = 'State is required (determines CGST/SGST vs IGST)';
    if (!isRequired(formData.phone)) newErrors.phone = 'Phone is required';
    else if (!isValidPhone(formData.phone)) newErrors.phone = 'Enter a valid phone number';

    if (formData.email && !isValidEmail(formData.email)) newErrors.email = 'Enter a valid email address';
    if (formData.gstin && !isValidGSTIN(formData.gstin)) newErrors.gstin = 'Enter a valid 15-digit GSTIN';
    if (formData.pan && !isValidPAN(formData.pan)) newErrors.pan = 'Enter a valid 10-digit PAN';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Missing Information', 'Please correct all highlighted fields marked in red.');
      return;
    }

    setIsSaving(true);
    try {
      await updateCompany(formData);
      success('Company Profile Saved', 'Company profile information has been successfully updated.');
    } catch (err) {
      error('Save Failed', err?.message || 'Failed to save company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-col gap-24">
      {/* Basic & Contact Information */}
      <Card>
        <CardHeader
          title="Company Identity &amp; Contact Details"
          description="Official profile used in quotation headers, letterheads, and GST tax filings"
        />
        <CardBody className="flex-col gap-16">
          <div className="form-grid-2">
            <Input
              label="Company Legal Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="POCIKA FIRE AND SAFETY PRODUCTS LLP"
              required
              error={errors.name}
            />
            <Input
              label="LLPIN / Registration No."
              name="llpin"
              value={formData.llpin}
              onChange={handleChange}
              placeholder="e.g. ABA-3518"
            />
          </div>

          <div className="form-grid-3">
            <Input
              label="Primary Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 70965 64828"
              required
              error={errors.phone}
            />
            <Input
              label="Alternate Phone Number"
              name="altPhone"
              value={formData.altPhone}
              onChange={handleChange}
              placeholder="+91 84605 64828"
            />
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="sales@pocikafireandsafety.com"
              error={errors.email}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="www.pocikafireandsafety.com"
            />
            <Input
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="India"
            />
          </div>

          <Input
            label="Registered Office Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="1st Floor, Plot - M, RJD Textile Park, Ichchhapore, Chorasi"
            multiline
            rows={2}
          />

          <div className="form-grid-3">
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Surat"
              required
              error={errors.city}
            />
            <Input
              label="State (Base Location for GST)"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Gujarat"
              required
              hint="Crucial: Sales within Gujarat = CGST+SGST, outside Gujarat = IGST"
              error={errors.state}
            />
            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="394510"
            />
          </div>
        </CardBody>
      </Card>

      {/* Statutory & Tax Details */}
      <Card>
        <CardHeader
          title="Tax &amp; Statutory Registration"
          description="GSTIN and PAN are printed on compliant tax quotations."
        />
        <CardBody className="flex-col gap-16">
          <div className="form-grid-2">
            <Input
              label="GSTIN (15 Digits)"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="24ABAFP3518F1Z4"
              error={errors.gstin}
            />
            <Input
              label="PAN Number (10 Digits)"
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              placeholder="ABAFP3518F"
              error={errors.pan}
            />
          </div>
        </CardBody>
      </Card>

      {/* Banking & Settlement Details */}
      <Card>
        <CardHeader
          title="Bank Details &amp; Payment Settlement"
          description="Bank and UPI details printed on quotations for direct wire transfers."
        />
        <CardBody className="flex-col gap-16">
          <div className="form-grid-3">
            <Input
              label="Bank Name"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="HDFC Bank Ltd."
            />
            <Input
              label="Account Number"
              name="accountNo"
              value={formData.accountNo}
              onChange={handleChange}
              placeholder="50200084605648"
            />
            <Input
              label="IFSC Code"
              name="ifsc"
              value={formData.ifsc}
              onChange={handleChange}
              placeholder="HDFC0000256"
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Bank Branch"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              placeholder="Ring Road, Surat, Gujarat"
            />
            <Input
              label="UPI ID / VPA"
              name="upiId"
              value={formData.upiId}
              onChange={handleChange}
              placeholder="pocikafire@hdfcbank"
            />
          </div>
        </CardBody>
      </Card>

      {/* Signatory & Branding */}
      <Card>
        <CardHeader
          title="Authorized Signatory &amp; Branding"
          description="Official logo and signatory attached to finalized quotations."
        />
        <CardBody className="flex-col gap-16">
          <div className="form-grid-2">
            <div>
              <label className="form-label">Company Brand Logo</label>
              <div className="flex items-center gap-16" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload('logoUrl', e)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Upload}
                  onClick={() => document.getElementById('logo-upload').click()}
                >
                  Upload New Logo
                </Button>
              </div>
              <div style={{ marginTop: 10, padding: 10, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-button)', display: 'inline-flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--color-surface-hover)' }}>
                <img
                  src={formData.logoUrl || '/logo.png'}
                  alt="Company Logo"
                  style={{ maxHeight: 44, maxWidth: 120, objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="text-caption text-muted">Active in Header &amp; Quotation Letterhead</span>
              </div>
            </div>

            <div className="flex-col gap-14">
              <div className="form-grid">
                <div>
                  <label className="form-label">Authorized Signatory Title / Designation</label>
                  <Input
                    name="signatoryTitle"
                    value={formData.signatoryTitle ?? 'Authorized Signatory'}
                    onChange={handleChange}
                    placeholder="e.g. Authorized Signatory / Designated Partner"
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 3 }}>
                    Appears directly under the signature line on PDF.
                  </div>
                </div>

                <div>
                  <label className="form-label">Signatory Individual Name (Optional)</label>
                  <Input
                    name="signatoryName"
                    value={formData.signatoryName || ''}
                    onChange={handleChange}
                    placeholder="Leave blank for generic stamp or physical signing"
                  />
                  <div className="text-caption text-muted" style={{ marginTop: 3 }}>
                    If empty, PDF prints generic "Authorized Signatory".
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Digital Signature / Official Seal</label>
                <div className="flex items-center gap-16" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    id="sig-upload"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload('signatureUrl', e)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={Upload}
                    onClick={() => document.getElementById('sig-upload').click()}
                  >
                    Upload Signature / Seal
                  </Button>
                  {formData.signatureUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData((p) => ({ ...p, signatureUrl: '' }))}
                    >
                      Remove Seal
                    </Button>
                  )}
                </div>
                <div className="text-caption text-muted" style={{ marginTop: 4 }}>
                  Upload your seal or signature once to stamp automatically, or leave blank to physically sign paper copies.
                </div>

                {/* PDF Signatory Box Live Preview */}
                <div
                  style={{
                    marginTop: 12,
                    padding: '12px 16px',
                    border: '1px dashed var(--color-border)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--color-surface-hover)',
                    maxWidth: '280px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                    PDF Signature Box Preview
                  </div>
                  {formData.signatureUrl ? (
                    <img
                      src={formData.signatureUrl}
                      alt="Signature Preview"
                      style={{ maxHeight: 40, margin: '0 auto 6px auto', display: 'block' }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 36,
                        border: '1px dashed #cbd5e1',
                        borderRadius: 4,
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        color: '#94a3b8'
                      }}
                    >
                      Physical Sign &amp; Stamp Area
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: 4, fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>
                    {formData.signatoryName?.trim() ? formData.signatoryName : (formData.signatoryTitle || 'Authorized Signatory')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                    For {formData.name || 'POCIKA FIRE AND SAFETY PRODUCTS LLP'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
        <CardFooter>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={Save}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Company Details'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
