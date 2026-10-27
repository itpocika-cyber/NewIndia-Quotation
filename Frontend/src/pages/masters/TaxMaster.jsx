import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, Percent, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired, isNonNegative } from '../../utils/validation';

const ITEMS_PER_PAGE = 15;

export function TaxMaster() {
  const { taxes, addTax, updateTax, deleteTax } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rateAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', rate: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  const filteredTaxes = useMemo(() => {
    let result = taxes || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.name?.toLowerCase().includes(term) ||
          String(t.rate).includes(term) ||
          t.description?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'rateAsc') return (parseFloat(a.rate) || 0) - (parseFloat(b.rate) || 0);
      if (sortBy === 'rateDesc') return (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0);
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'nameDesc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
  }, [taxes, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredTaxes.length / ITEMS_PER_PAGE) || 1;
  const paginatedTaxes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTaxes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTaxes, currentPage]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', rate: '', description: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      rate: item.rate ?? '',
      description: item.description || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete tax rate "${item.name}"?`)) {
      try {
        await deleteTax(item.id || item._id);
        success('Tax Rate Deleted', `${item.name} removed.`);
      } catch (err) {
        error('Delete Failed', err?.message || 'Could not delete tax slab.');
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!isRequired(formData.name)) errs.name = 'Tax slab label is required';
    if (!isRequired(formData.rate) || !isNonNegative(formData.rate)) {
      errs.rate = 'Tax rate % must be a valid non-negative number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Missing Information', 'Please fill in required fields marked in red.');
      return;
    }

    const payload = {
      ...formData,
      rate: parseFloat(formData.rate) || 0
    };

    try {
      if (editingItem) {
        await updateTax(editingItem.id || editingItem._id, payload);
        success('Tax Slab Updated', `${formData.name} updated.`);
      } else {
        await addTax({ ...payload, status: 'Active' });
        success('Tax Slab Created', `${formData.name} added.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      error('Save Failed', err?.message || 'Could not save tax slab.');
    }
  };

  return (
    <div className="flex-col gap-24">
      <div className="master-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          <div className="search-box" style={{ flex: 1, maxWidth: 360 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search tax rates or slabs..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 190 }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            title="Sort tax slabs"
          >
            <option value="rateAsc">Sort: Rate (Low to High)</option>
            <option value="rateDesc">Sort: Rate (High to Low)</option>
            <option value="nameAsc">Sort: Name (A to Z)</option>
            <option value="nameDesc">Sort: Name (Z to A)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Tax Slab
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Tax & GST Slabs (${filteredTaxes.length})`}
          description="GST rate percentages applied automatically on line items and split into CGST/SGST or IGST"
        />

        {filteredTaxes.length === 0 ? (
          <EmptyState
            icon={Percent}
            title={searchTerm ? 'No tax slabs found' : 'No tax slabs configured'}
            description="Configure statutory GST slabs such as 18%, 12%, 5%, 28%, and 0%."
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Tax Slab'}
            onAction={searchTerm ? () => setSearchTerm('') : handleOpenAdd}
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
              <Table style={{ minWidth: '780px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th>Tax Slab Name</th>
                    <th>GST Rate %</th>
                    <th>Intra-State Split</th>
                    <th>Inter-State (IGST)</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTaxes.map((t, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={t.id || t._id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                        <td className="text-bold">{t.name}</td>
                        <td>
                          <Badge variant="info">{t.rate}%</Badge>
                        </td>
                        <td>
                          <span className="text-caption">
                            CGST {t.rate / 2}% + SGST {t.rate / 2}%
                          </span>
                        </td>
                        <td>
                          <span className="text-caption">IGST {t.rate}%</span>
                        </td>
                        <td>{t.description || '-'}</td>
                        <td>
                          <div className="table-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(t)}
                              aria-label="Edit tax slab"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(t)}
                              aria-label="Delete tax slab"
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

            {filteredTaxes.length > ITEMS_PER_PAGE && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div className="text-caption text-muted">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredTaxes.length)} of{' '}
                  {filteredTaxes.length} tax slabs
                </div>

                <div className="flex items-center gap-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-caption" style={{ padding: '0 8px' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronRight}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Tax Slab' : 'Add Tax Slab'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingItem ? 'Update' : 'Save'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="flex-col gap-16">
          <div className="form-grid-2">
            <Input
              label="Tax Slab Label"
              name="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. 18% GST (Standard)"
              required
              error={formErrors.name}
            />
            <Input
              label="Tax Rate Percentage (%)"
              name="rate"
              type="number"
              step="0.01"
              value={formData.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              placeholder="18"
              required
              error={formErrors.rate}
            />
          </div>

          <Input
            label="Description / Category Coverage"
            name="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="e.g. Applicable for fire fighting machinery and detection panels"
            multiline
            rows={2}
          />
        </form>
      </Modal>
    </div>
  );
}
