import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Table } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, FolderTree, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMasters } from '../../context/MastersContext';
import { useToast } from '../../context/ToastContext';
import { isRequired } from '../../utils/validation';

const ITEMS_PER_PAGE = 15;

export function CategoryMaster() {
  const { categories, addCategory, updateCategory, deleteCategory } = useMasters();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('nameAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const filteredCategories = useMemo(() => {
    let result = categories || [];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) => c.name?.toLowerCase().includes(term) || c.description?.toLowerCase().includes(term)
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'nameAsc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'nameDesc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
  }, [categories, searchTerm, sortBy]);

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE) || 1;
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCategories, currentPage]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setNameError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setName(item.name || '');
    setDescription(item.description || '');
    setNameError('');
    setIsModalOpen(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete category "${item.name}"?`)) {
      deleteCategory(item.id);
      success('Category Deleted', `${item.name} removed from categories.`);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!isRequired(name)) {
      setNameError('Category name is required');
      error('Missing Information', 'Category name is required.');
      return;
    }

    if (editingItem) {
      updateCategory(editingItem.id, { name, description });
      success('Category Updated', `${name} updated successfully.`);
    } else {
      addCategory({ name, description, status: 'Active' });
      success('Category Created', `${name} added to categories.`);
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
              placeholder="Search categories..."
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
            title="Sort categories"
          >
            <option value="nameAsc">Sort: Name (A to Z)</option>
            <option value="nameDesc">Sort: Name (Z to A)</option>
          </select>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenAdd}>
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader
          title={`Product Categories (${filteredCategories.length})`}
          description="Classification for fire equipment, alarms, hydrants, and maintenance services"
        />

        {filteredCategories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={searchTerm ? 'No categories found' : 'No categories configured'}
            description="Organize your fire safety catalog into clean business categories."
            actionLabel={searchTerm ? 'Clear Search' : '+ Add Category'}
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
                    <th>Category Name</th>
                    <th>Description / Scope</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map((cat, index) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    return (
                      <tr key={cat.id}>
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          {rowNumber}
                        </td>
                        <td className="text-bold">{cat.name}</td>
                        <td>{cat.description || '-'}</td>
                        <td>
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td>
                          <div className="table-actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit2}
                              onClick={() => handleOpenEdit(cat)}
                              aria-label="Edit category"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleDelete(cat)}
                              aria-label="Delete category"
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

            {filteredCategories.length > ITEMS_PER_PAGE && (
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
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredCategories.length)} of{' '}
                  {filteredCategories.length} categories
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
        title={editingItem ? 'Edit Category' : 'Add Category'}
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
            label="Category Name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="e.g. Fire Suppression Systems"
            required
            error={nameError}
          />
          <Input
            label="Description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief scope of items in this category"
            multiline
            rows={3}
          />
        </form>
      </Modal>
    </div>
  );
}
