import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired } from '../../utils/validation';

const ITEMS_PER_PAGE = 15;

export function PaymentTermsMaster() {
  const { paymentTerms, addPaymentTerm, updatePaymentTerm, deletePaymentTerm } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('titleAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  const filteredTerms = useMemo(() => {
    let result = paymentTerms || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'titleAsc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'titleDesc') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });
  }, [paymentTerms, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredTerms.length / ITEMS_PER_PAGE) || 1;
  const paginatedTerms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTerms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTerms, currentPage]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ title: '', description: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete payment term "${item.title}"?`)) {
      deletePaymentTerm(item.id);
      success('Payment Term Deleted', `${item.title} removed.`);
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
    if (!isRequired(formData.title)) errs.title = 'Payment term title is required';
    if (!isRequired(formData.description)) errs.description = 'Clause description is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Missing Information', 'Please complete required fields marked in red.');
      return;
    }

    if (editingItem) {
      updatePaymentTerm(editingItem.id, formData);
      success('Payment Term Updated', `${formData.title} updated.`);
    } else {
      addPaymentTerm({ ...formData, status: 'Active' });
      success('Payment Term Created', `${formData.title} added.`);
    }

    setIsModalOpen(false);
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
              placeholder="Search payment terms..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 180 }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            title="Sort payment terms"
          >
            <option value="titleAsc">Sort: Title (A to Z)</option>
            <option value="titleDesc">Sort: Title (Z to A)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Payment Term
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Payment Terms Master (${filteredTerms.length})`}
          description="Preset payment milestone options selectable during quotation creation"
        />

        {filteredTerms.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={searchTerm ? 'No payment terms found' : 'No payment terms configured'}
            description="Create reusable payment conditions like 50% advance, 30 days credit, etc."
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Payment Term'}
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
              <Table style={{ minWidth: '700px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th>Term Title</th>
                    <th>Detailed Description / Terms</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTerms.map((pt, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={pt.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                        <td className="text-bold">{pt.title}</td>
                        <td>{pt.description}</td>
                        <td>
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(pt)}
                              aria-label="Edit payment term"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(pt)}
                              aria-label="Delete payment term"
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

            {filteredTerms.length > ITEMS_PER_PAGE && (
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredTerms.length)} of{' '}
                  {filteredTerms.length} payment terms
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
        title={editingItem ? 'Edit Payment Term' : 'Add Payment Term'}
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
          <Input
            label="Term Title"
            name="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="e.g. 50% Adv + 50% Against Delivery"
            required
            error={formErrors.title}
          />
          <Input
            label="Detailed Clause Text"
            name="description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="e.g. 50% advance along with order, balance 50% against delivery/dispatch."
            required
            multiline
            rows={3}
            error={formErrors.description}
          />
        </form>
      </Modal>
    </div>
  );
}
