import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, Package, Tag, Image as ImageIcon, Upload, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired, isPositiveNumber, isNonNegative } from '../../utils/validation';
import { formatCurrency } from '../../utils/calculations';
import { compressImage } from '../../utils/imageCompressor';
import { ImageLightboxModal } from '../../components/common/ImageLightboxModal';

const ITEMS_PER_PAGE = 15;

const INITIAL_FORM = {
  name: '',
  make: '',
  description: '',
  category: '',
  unit: 'Nos',
  rate: '',
  gstRate: 18,
  hsnCode: '',
  status: 'Active'
};

export function ProductMaster() {
  const { products, categories, units, taxes, addProduct, updateProduct, deleteProduct } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  const [sortBy, setSortBy] = useState('nameAsc'); // 'nameAsc' (A-Z), 'nameDesc' (Z-A), 'idAsc' (1 to 10), 'priceAsc', 'priceDesc'
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered and sorted products list
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const matchCategory = !selectedCategoryFilter || p.category === selectedCategoryFilter;
      if (!matchCategory) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.id?.toLowerCase().includes(term) ||
        p.name?.toLowerCase().includes(term) ||
        p.make?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.hsnCode?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    });

    return list.sort((a, b) => {
      if (sortBy === 'nameAsc') {
        return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'nameDesc') {
        return (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' });
      }
      if (sortBy === 'idAsc') {
        return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
      }
      if (sortBy === 'priceAsc') {
        return (a.rate || 0) - (b.rate || 0);
      }
      if (sortBy === 'priceDesc') {
        return (b.rate || 0) - (a.rate || 0);
      }
      return 0;
    });
  }, [products, searchTerm, selectedCategoryFilter, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      ...INITIAL_FORM,
      make: '',
      category: categories[0]?.name || 'Fire Protection Equipment',
      unit: units[0]?.name || 'Nos',
      gstRate: taxes[0]?.rate ?? 18
    });
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      make: product.make || '',
      description: product.description || '',
      category: product.category || categories[0]?.name || '',
      unit: product.unit || 'Nos',
      rate: product.rate ?? '',
      gstRate: product.gstRate ?? 18,
      hsnCode: product.hsnCode || '',
      status: product.status || 'Active'
    });
    setImageFile(null);
    setImagePreview(product.imageUrl || '');
    setRemoveImage(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (product) => {
    if (window.confirm(`Are you sure you want to delete product "${product.name}" (${product.id})?`)) {
      try {
        await deleteProduct(product.id);
        success('Product Deleted', `${product.name} removed from product catalog.`);
      } catch (err) {
        error('Delete Failed', err.message || 'Could not delete product.');
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      error('Invalid Image Type', 'Please upload a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }

    try {
      // Automatic client-side compression without cropping
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
      setRemoveImage(false);
    } catch (err) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRemoveImage(true);
  };

  const validate = () => {
    const errs = {};
    if (!isRequired(formData.name)) errs.name = 'Product name is required';
    if (!isRequired(formData.category)) errs.category = 'Category is required';
    if (!isRequired(formData.unit)) errs.unit = 'Unit is required';
    if (!isRequired(formData.rate) || !isPositiveNumber(formData.rate)) {
      errs.rate = 'Rate must be a positive number greater than 0';
    }
    if (!isNonNegative(formData.gstRate)) errs.gstRate = 'Valid GST % is required';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Missing Information', 'Please complete all highlighted fields marked in red.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (imageFile || removeImage) {
        // Use FormData for Cloudinary multipart upload
        const fd = new FormData();
        fd.append('name', formData.name.trim());
        fd.append('make', formData.make?.trim() || 'POCIKA');
        fd.append('description', formData.description?.trim() || '');
        fd.append('category', formData.category?.trim() || '');
        fd.append('unit', formData.unit?.trim() || 'Nos');
        fd.append('rate', parseFloat(formData.rate) || 0);
        fd.append('gstRate', parseFloat(formData.gstRate) || 0);
        fd.append('hsnCode', formData.hsnCode?.trim() || '');
        fd.append('status', formData.status || 'Active');
        if (imageFile) fd.append('image', imageFile);
        if (removeImage) fd.append('removeImage', 'true');

        if (editingProduct) {
          await updateProduct(editingProduct.id, fd);
          success('Product Updated', `${formData.name} updated successfully.`);
        } else {
          const created = await addProduct(fd);
          success('Product Added', `${formData.name} created with ID ${created.id}.`);
        }
      } else {
        const payload = {
          ...formData,
          rate: parseFloat(formData.rate) || 0,
          gstRate: parseFloat(formData.gstRate) || 0
        };

        if (editingProduct) {
          await updateProduct(editingProduct.id, payload);
          success('Product Updated', `${formData.name} updated successfully.`);
        } else {
          const created = await addProduct(payload);
          success('Product Added', `${formData.name} created with ID ${created.id}.`);
        }
      }

      setIsModalOpen(false);
    } catch (err) {
      error('Save Failed', err.message || 'Failed to save product details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-col gap-24">
      {/* Search & Filter Header */}
      <div className="master-toolbar">
        <div className="product-search-group">
          <div className="search-box" style={{ flex: 1 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, name, HSN code, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sort Catalog"
          >
            <option value="nameAsc">Sort: A to Z (Name)</option>
            <option value="nameDesc">Sort: Z to A (Name)</option>
            <option value="idAsc">Sort: Item 1 to 10 (ID)</option>
            <option value="priceAsc">Sort: Rate (Low to High)</option>
            <option value="priceDesc">Sort: Rate (High to Low)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Product
        </Button>
      </div>

      {/* Products Table Card */}
      <Card>
        <CardHeader
          title={`Product & Equipment Catalog (${filteredProducts.length})`}
          description="Fire safety equipment, systems, and service items with HSN/SAC and GST rates"
        />

        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={searchTerm || selectedCategoryFilter ? 'No products match your criteria' : 'No products found'}
            description={
              searchTerm || selectedCategoryFilter
                ? 'Try resetting the category filter or searching for another term.'
                : 'Add fire extinguishers, valves, panels, or safety equipment to the master list.'
            }
            actionLabel={searchTerm || selectedCategoryFilter ? 'Reset Filters' : '+ Add Product'}
            onAction={
              searchTerm || selectedCategoryFilter
                ? () => {
                    setSearchTerm('');
                    setSelectedCategoryFilter('');
                  }
                : handleOpenAdd
            }
          />
        ) : (
          <>
            <div
              className="table-responsive-wrapper"
              style={{
                width: '100%',
                overflowX: 'auto',
                maxHeight: '580px',
                overflowY: 'auto'
              }}
            >
              <Table style={{ minWidth: '1200px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '50px', minWidth: '50px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th style={{ width: '64px', minWidth: '64px', textAlign: 'center' }}>Image</th>
                    <th style={{ width: '110px', minWidth: '100px' }}>Product ID</th>
                    <th style={{ minWidth: '280px' }}>Item Name &amp; Description</th>
                    <th style={{ width: '130px', minWidth: '120px' }}>Make / Brand</th>
                    <th style={{ width: '190px', minWidth: '170px' }}>Category</th>
                    <th style={{ width: '110px', minWidth: '100px', textAlign: 'center' }}>HSN / SAC</th>
                    <th style={{ width: '150px', minWidth: '140px', textAlign: 'right' }}>Base Rate (Unit)</th>
                    <th style={{ width: '90px', minWidth: '80px', textAlign: 'center' }}>GST %</th>
                    <th style={{ width: '170px', minWidth: '160px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={product.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                  <td style={{ textAlign: 'center', width: '64px' }}>
                    {product.imageUrl ? (
                      <div
                        onClick={() => setViewingImage({ url: product.imageUrl, title: product.name })}
                        title="Click to zoom / view full image"
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 6,
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--color-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.transform = 'scale(1.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--color-border)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: 2
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 6,
                          backgroundColor: 'var(--color-surface-hover)',
                          border: '1px dashed var(--color-border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-muted)',
                          margin: '0 auto'
                        }}
                        title="No image"
                      >
                        <Package size={18} />
                      </div>
                    )}
                  </td>
                  <td style={{ width: '110px', whiteSpace: 'nowrap' }}>
                    <Badge variant="neutral">{product.id}</Badge>
                  </td>
                  <td style={{ minWidth: '280px', maxWidth: '380px' }}>
                    <div className="text-bold" style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: '18px', wordBreak: 'break-word' }}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div
                        style={{
                          color: 'var(--color-text-muted)',
                          fontSize: '11.5px',
                          marginTop: 3,
                          lineHeight: '16px',
                          maxHeight: '48px',
                          overflowY: 'auto',
                          wordBreak: 'break-word',
                          paddingRight: '4px'
                        }}
                        title={product.description}
                      >
                        {product.description}
                      </div>
                    )}
                  </td>
                  <td style={{ width: '130px', whiteSpace: 'nowrap' }}>
                    {product.make && product.make.trim() ? (
                      <Badge variant="primary">{product.make.trim()}</Badge>
                    ) : (
                      <span className="text-subtle" style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                  <td style={{ width: '190px', whiteSpace: 'nowrap' }}>
                    <span
                      className="badge badge-neutral"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        fontSize: '11.5px',
                        lineHeight: 1.2
                      }}
                    >
                      <Tag size={12} style={{ flexShrink: 0, opacity: 0.85 }} />
                      <span>{product.category || 'General'}</span>
                    </span>
                  </td>
                  <td style={{ width: '110px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {product.hsnCode ? (
                      <code>{product.hsnCode}</code>
                    ) : (
                      <span className="text-subtle">-</span>
                    )}
                  </td>
                  <td style={{ width: '150px', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(product.rate)} / <span className="text-caption">{product.unit || 'Nos'}</span>
                  </td>
                  <td style={{ width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span className="badge badge-info">{product.gstRate ?? 18}%</span>
                  </td>
                  <td style={{ width: '170px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenEdit(product)}
                        aria-label="Edit product"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(product)}
                        aria-label="Delete product"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </Table>
        </div>

        {filteredProducts.length > ITEMS_PER_PAGE && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </Button>
              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                Page {currentPage} of {Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    )}
  </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingProduct ? `Edit Product (${editingProduct.id})` : 'Add New Product / Equipment'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-8">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </span>
              ) : editingProduct ? (
                'Update Product'
              ) : (
                'Save Product'
              )}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex-col gap-16">
          {/* Image Upload Field */}
          <div className="flex-col gap-8">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={16} />
              <span>Product Image (JPG, PNG, WebP — Max 2MB)</span>
            </label>

            {imagePreview ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-button)'
                }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    objectFit: 'cover',
                    border: '1px solid var(--color-border)'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div className="text-bold" style={{ fontSize: '13px' }}>
                    {imageFile ? imageFile.name : 'Current Cloudinary Photo'}
                  </div>
                  <div className="text-caption text-muted">
                    {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : 'Saved in pocika/quotation-products'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={X}
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-button)',
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface-hover)',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                onClick={() => !isSubmitting && document.getElementById('product-image-input').click()}
              >
                <input
                  id="product-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Upload size={22} style={{ color: 'var(--color-primary)' }} />
                  <div className="text-bold" style={{ fontSize: '13px' }}>
                    Click to select product image
                  </div>
                  <div className="text-caption text-muted">
                    JPG, PNG, or WebP up to 2MB (Uploaded to Cloudinary)
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-grid-2">
            <Input
              label="Product / Service Name"
              name="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. ABC Dry Chemical Powder Fire Extinguisher (4 Kg)"
              required
              error={formErrors.name}
            />

            <Input
              label="Make / Brand (Company)"
              name="make"
              value={formData.make}
              onChange={(e) => handleFieldChange('make', e.target.value)}
              placeholder="e.g. POCIKA, HD FIRE, KARAM, 3M"
            />
          </div>

          <Input
            label="Technical Specifications / Description"
            name="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="IS 15683 certified, suitable for Class A, B, C fires..."
            multiline
            rows={3}
          />

          <div className="form-grid-3">
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              required
              error={formErrors.category}
            />

            <Select
              label="Primary Unit"
              name="unit"
              value={formData.unit}
              onChange={(e) => handleFieldChange('unit', e.target.value)}
              options={units.map((u) => ({ value: u.name, label: `${u.name} (${u.symbol || u.name})` }))}
              required
              error={formErrors.unit}
            />

            <Input
              label="HSN / SAC Code"
              name="hsnCode"
              value={formData.hsnCode}
              onChange={(e) => handleFieldChange('hsnCode', e.target.value)}
              placeholder="e.g. 84241000"
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Unit Base Rate (INR ₹)"
              name="rate"
              type="number"
              step="0.01"
              value={formData.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              placeholder="1850.00"
              required
              error={formErrors.rate}
            />

            <Select
              label="GST Slab %"
              name="gstRate"
              value={formData.gstRate}
              onChange={(e) => handleFieldChange('gstRate', parseFloat(e.target.value))}
              options={taxes.map((t) => ({ value: t.rate, label: `${t.rate}% - ${t.name}` }))}
              required
              error={formErrors.gstRate}
            />
          </div>
        </form>
      </Modal>

      {/* Lightbox Zoom Preview Modal */}
      <ImageLightboxModal
        isOpen={Boolean(viewingImage)}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.url}
        title={viewingImage?.title || 'Equipment Preview'}
      />
    </div>
  );
}
