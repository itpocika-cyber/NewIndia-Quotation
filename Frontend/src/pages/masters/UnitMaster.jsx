import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired } from '../../utils/validation';

const ITEMS_PER_PAGE = 15;

export function UnitMaster() {
  const { units, addUnit, updateUnit, deleteUnit } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nameAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', symbol: '', description: '' });
  const [nameError, setNameError] = useState('');

  const filteredUnits = useMemo(() => {
    let result = units || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(term) ||
          u.symbol?.toLowerCase().includes(term) ||
          u.description?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'nameDesc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
  }, [units, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', symbol: '', description: '' });
    setNameError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      symbol: item.symbol || '',
      description: item.description || ''
    });
    setNameError('');
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete unit "${item.name}"?`)) {
      deleteUnit(item.id);
      success('Unit Deleted', `${item.name} removed from measurement units.`);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isRequired(formData.name)) {
      setNameError('Unit name is required');
      error('Missing Information', 'Unit name is required.');
      return;
    }

    if (editingItem) {
      updateUnit(editingItem.id, formData);
      success('Unit Updated', `${formData.name} updated.`);
    } else {
      addUnit({ ...formData, status: 'Active' });
      success('Unit Created', `${formData.name} added to units.`);
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
              placeholder="Search measurement units..."
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
            title="Sort units"
          >
            <option value="nameAsc">Sort: Name (A to Z)</option>
            <option value="nameDesc">Sort: Name (Z to A)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Unit
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Units of Measurement (${filteredUnits.length})`}
          description="Units for physical equipment, length of hoses, kits, and labor lots"
        />

        {filteredUnits.length === 0 ? (
          <EmptyState
            icon={Scale}
            title={searchTerm ? 'No units found' : 'No units configured'}
            description="Add standard measurement units like Nos, Sets, Meters, and Lots."
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Unit'}
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
              <Table style={{ minWidth: '650px', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-surface, #ffffff)' }}>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    <th>Unit Name</th>
                    <th>Symbol / Abbreviation</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUnits.map((u, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={u.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                        <td className="text-bold">{u.name}</td>
                        <td>
                          <Badge variant="neutral">{u.symbol || u.name}</Badge>
                        </td>
                        <td>{u.description || '-'}</td>
                        <td>
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(u)}
                              aria-label="Edit unit"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(u)}
                              aria-label="Delete unit"
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

            {filteredUnits.length > ITEMS_PER_PAGE && (
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)} of{' '}
                  {filteredUnits.length} measurement units
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
        title={editingItem ? 'Edit Measurement Unit' : 'Add Measurement Unit'}
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
              label="Unit Name"
              name="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (nameError) setNameError('');
              }}
              placeholder="e.g. Numbers / Pieces"
              required
              error={nameError}
            />
            <Input
              label="Symbol / Short Code"
              name="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="e.g. Nos"
            />
          </div>

          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Usage context for this unit"
            multiline
            rows={2}
          />
        </form>
      </Modal>
    </div>
  );
}
