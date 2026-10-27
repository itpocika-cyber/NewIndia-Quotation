import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired } from '../../utils/validation';

const ITEMS_PER_PAGE = 15;

export function TermsConditionsMaster() {
  const { termsConditions, addTermCondition, updateTermCondition, deleteTermCondition } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('titleAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', text: '' });
  const [formErrors, setFormErrors] = useState({});

  const filteredTerms = useMemo(() => {
    let result = termsConditions || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(term) ||
          t.text?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'titleAsc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'titleDesc') return (b.title || '').localeCompare(a.title || '');
      return 0;
    });
  }, [termsConditions, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredTerms.length / ITEMS_PER_PAGE) || 1;
  const paginatedTerms = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTerms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTerms, currentPage]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ title: '', text: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      text: item.text || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete clause "${item.title}"?`)) {
      deleteTermCondition(item.id);
      success('Clause Deleted', `${item.title} removed.`);
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
    if (!isRequired(formData.title)) errs.title = 'Clause title is required';
    if (!isRequired(formData.text)) errs.text = 'Clause text is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) {
      error('Missing Information', 'Please fill in required fields marked in red.');
      return;
    }

    if (editingItem) {
      updateTermCondition(editingItem.id, formData);
      success('Clause Updated', `${formData.title} updated.`);
    } else {
      addTermCondition({ ...formData, status: 'Active' });
      success('Clause Created', `${formData.title} added.`);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex-col gap-24">
      <div className="master-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="master-toolbar-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: '240px', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360, minWidth: '180px' }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Search legal clauses..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="form-select master-sort-select"
            style={{ width: 'auto', minWidth: '180px', flex: '0 1 auto' }}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            title="Sort terms & conditions"
          >
            <option value="titleAsc">Sort: Heading (A to Z)</option>
            <option value="titleDesc">Sort: Heading (Z to A)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd} className="master-action-btn">
          Add Clause
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Terms & Conditions Clauses (${filteredTerms.length})`}
          description="Standard legal clauses for quotation validity, warranty, delivery, freight, and inspection"
        />

        {filteredTerms.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={searchTerm ? 'No terms found' : 'No terms configured'}
            description="Configure standard clauses like 30 days validity, warranty, site delivery terms, etc."
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Clause'}
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
              <Table style={{ minWidth: '600px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th style={{ width: '220px', minWidth: '160px' }}>Clause Heading</th>
                    <th style={{ minWidth: '220px' }}>Standard Clause Text</th>
                    <th style={{ width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ width: '140px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTerms.map((tc, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={tc.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {rowNumber}
                        </td>
                        <td className="text-bold" style={{ wordBreak: 'break-word', verticalAlign: 'top' }}>
                          {tc.title}
                        </td>
                        <td style={{ wordBreak: 'break-word', verticalAlign: 'top', lineHeight: '1.5' }}>
                          <div style={{ maxHeight: '72px', overflowY: 'auto', paddingRight: '4px' }}>
                            {tc.text}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: 6 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(tc)}
                              aria-label="Edit clause"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(tc)}
                              aria-label="Delete clause"
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
                  {filteredTerms.length} terms &amp; conditions
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
        title={editingItem ? 'Edit Clause' : 'Add Legal Clause'}
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
            label="Clause Heading"
            name="title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="e.g. Quotation Validity"
            required
            error={formErrors.title}
          />
          <Input
            label="Standard Clause Text"
            name="text"
            value={formData.text}
            onChange={(e) => handleFieldChange('text', e.target.value)}
            placeholder="e.g. This quotation is valid for 30 days from the date of issue..."
            required
            multiline
            rows={4}
            error={formErrors.text}
          />
        </form>
      </Modal>
    </div>
  );
}
