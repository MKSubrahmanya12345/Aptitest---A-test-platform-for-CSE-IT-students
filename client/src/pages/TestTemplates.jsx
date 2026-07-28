import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { testTemplateService } from '../services/testTemplate.service';
import '../styles/admin.css';

function TestTemplates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());

  const categoriesList = [
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Verbal Ability",
    "Data Interpretation and Analysis",
    "Abstract Reasoning",
    "Technical Aptitude"
  ];

  const questionTypesList = [
    "mcq_single",
    "boolean",
    "fraction",
    "ratio",
    "numeric",
    "numeric_with_unit",
    "data_interpretation",
    "fill_in_blank"
  ];

  function getInitialFormData() {
    return {
      name: '',
      description: '',
      difficulty: 'easy',
      count: 30,
      duration_minutes: 30,
      categories: [],
      question_types: [],
      subcategories: [],
      is_paid: false,
      price_rupees: '',
      is_active: true,
      allow_reattempt: true,
    };
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const data = await testTemplateService.getAllTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      setError('Failed to load test templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    setEditingTemplate(null);
    setFormData(getInitialFormData());
    setShowModal(true);
  }

  function handleEdit(template) {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      description: template.description || '',
      difficulty: template.difficulty || 'easy',
      count: template.count || 30,
      duration_minutes: Math.round((template.duration_seconds || 1800) / 60),
      categories: template.categories || [],
      question_types: template.question_types || [],
      subcategories: template.subcategories || [],
      is_paid: template.is_paid || false,
      price_rupees: template.price_paise ? (template.price_paise / 100).toString() : '',
      is_active: template.is_active !== false,
      allow_reattempt: template.allow_reattempt !== false,
    });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      await testTemplateService.deleteTemplate(id);
      await fetchTemplates();
    } catch (err) {
      setError('Failed to delete template');
      console.error(err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const submitData = {
        ...formData,
        count: parseInt(formData.count),
        duration_minutes: parseInt(formData.duration_minutes),
        price_rupees: formData.price_rupees ? parseFloat(formData.price_rupees) : undefined,
      };

      if (editingTemplate) {
        await testTemplateService.updateTemplate(editingTemplate.id, submitData);
      } else {
        await testTemplateService.createTemplate(submitData);
      }

      setShowModal(false);
      await fetchTemplates();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save template');
      console.error(err);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleMultiSelectChange(e, field) {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setFormData(prev => ({ ...prev, [field]: options }));
  }

  function handleCategoryToggle(category) {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  }

  function handleQuestionTypeToggle(type) {
    setFormData(prev => ({
      ...prev,
      question_types: prev.question_types.includes(type)
        ? prev.question_types.filter(t => t !== type)
        : [...prev.question_types, type]
    }));
  }

  function formatDuration(seconds) {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  }

  function formatPrice(paise, currency) {
    if (!paise) return 'Free';
    const rupees = paise / 100;
    const symbol = currency === 'inr' ? '₹' : currency;
    return `${symbol}${rupees}`;
  }

  if (loading && templates.length === 0) {
    return (
      <AdminLayout title="Test Templates">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Test Templates">
      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Create and manage test templates. Students will see active templates on their dashboard.
        </p>
        <button className="btn btn-approve" onClick={handleCreateNew}>
          + Create New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <h3>No Test Templates Yet</h3>
          <p>Create your first test template to get started.</p>
          <button className="btn btn-primary" onClick={handleCreateNew} style={{ marginTop: '16px' }}>
            Create Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {templates.map(template => (
            <div 
              key={template.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                opacity: template.is_active ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{template.name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {template.is_paid && (
                    <span style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      ₹{template.price_paise / 100}
                    </span>
                  )}
                  <span style={{
                    background: template.difficulty === 'easy' || template.difficulty === 'basic' 
                      ? '#d1fae5' 
                      : template.difficulty === 'intermediate'
                      ? '#fef3c7'
                      : '#fee2e2',
                    color: template.difficulty === 'easy' || template.difficulty === 'basic'
                      ? '#065f46'
                      : template.difficulty === 'intermediate'
                      ? '#92400e'
                      : '#991b1b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {template.difficulty}
                  </span>
                  {!template.is_active && (
                    <span style={{
                      background: '#e5e7eb',
                      color: '#374151',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      INACTIVE
                    </span>
                  )}
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
                {template.description || 'No description provided.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)' }}>{template.count}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Questions</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)' }}>{formatDuration(template.duration_seconds)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary-color)' }}>
                    {template.categories?.length || 'All'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Categories</div>
                </div>
              </div>

              {template.categories && template.categories.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Categories:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {template.categories.map(cat => (
                      <span key={cat} style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '4px' }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {template.question_types && template.question_types.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Question Types:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {template.question_types.map(type => (
                      <span key={type} style={{ fontSize: '11px', background: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: '4px' }}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleEdit(template)}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-reject" 
                  onClick={() => handleDelete(template.id)}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2>{editingTemplate ? 'Edit Test Template' : 'Create Test Template'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Template Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Advanced Quant Practice"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Brief description of what this test covers..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Difficulty *
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="easy">Easy</option>
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Questions *
                  </label>
                  <input
                    type="number"
                    name="count"
                    value={formData.count}
                    onChange={handleChange}
                    min="1"
                    max="200"
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Duration (min) *
                  </label>
                  <input
                    type="number"
                    name="duration_minutes"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    min="5"
                    max="300"
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Categories (leave empty for all)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {categoriesList.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: formData.categories.includes(category) ? '#6366f1' : '#d1d5db',
                        background: formData.categories.includes(category) ? '#6366f1' : 'white',
                        color: formData.categories.includes(category) ? 'white' : '#374151',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Question Types (leave empty for all)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {questionTypesList.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleQuestionTypeToggle(type)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: formData.question_types.includes(type) ? '#6366f1' : '#d1d5db',
                        background: formData.question_types.includes(type) ? '#6366f1' : 'white',
                        color: formData.question_types.includes(type) ? 'white' : '#374151',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: formData.is_paid ? '16px' : '0' }}>
                  <input
                    type="checkbox"
                    id="is_paid"
                    name="is_paid"
                    checked={formData.is_paid}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_paid" style={{ fontWeight: '500', cursor: 'pointer' }}>
                    Require payment to access this test
                  </label>
                </div>

                {formData.is_paid && (
                  <div style={{ marginLeft: '30px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price_rupees"
                      value={formData.price_rupees}
                      onChange={handleChange}
                      min="1"
                      step="0.01"
                      required={formData.is_paid}
                      placeholder="50.00"
                      style={{ width: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_active" style={{ cursor: 'pointer' }}>
                    Active (visible to students)
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="allow_reattempt"
                    name="allow_reattempt"
                    checked={formData.allow_reattempt}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="allow_reattempt" style={{ cursor: 'pointer' }}>
                    Allow reattempts
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-approve"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default TestTemplates;
