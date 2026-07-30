import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import Pagination from '../components/common/Pagination';
import { reviewService } from '../services/review.service';
import { useToast } from '../contexts/ToastContext';
import '../styles/admin.css';

// Question type definitions matching BACKEND grading logic (test.service.ts)
const QUESTION_TYPES = [
  {
    id: 'mcq_single',
    label: 'MCQ (Single Answer)',
    defaultCorrectAnswer: { value: 'A' },
    defaultGradingConfig: { type: 'mcq_single', marks: 1, negativeMarks: 0 },
    defaultOptions: [
      { key: 'A', text: 'Option A' },
      { key: 'B', text: 'Option B' },
      { key: 'C', text: 'Option C' },
      { key: 'D', text: 'Option D' }
    ]
  },
  {
    id: 'boolean',
    label: 'True/False (Boolean)',
    defaultCorrectAnswer: { value: true },
    defaultGradingConfig: { type: 'boolean', marks: 1, negativeMarks: 0 },
    defaultOptions: [
      { key: 'true', text: 'True' },
      { key: 'false', text: 'False' }
    ]
  },
  {
    id: 'fraction',
    label: 'Fraction (Numerator/Denominator)',
    defaultCorrectAnswer: { numerator: 0, denominator: 1 },
    defaultGradingConfig: { type: 'fraction', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  },
  {
    id: 'ratio',
    label: 'Ratio (Values like 3:4)',
    defaultCorrectAnswer: { values: [1, 2] },
    defaultGradingConfig: { type: 'ratio', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  },
  {
    id: 'numeric',
    label: 'Numeric (Integer/Decimal)',
    defaultCorrectAnswer: { value: 0 },
    defaultGradingConfig: { type: 'numeric', marks: 1, negativeMarks: 0, tolerance: 0.01 },
    defaultOptions: null
  },
  {
    id: 'numeric_with_unit',
    label: 'Numeric with Unit (e.g., 10 meters)',
    defaultCorrectAnswer: { value: 0, unit: '' },
    defaultGradingConfig: { type: 'numeric_with_unit', marks: 1, negativeMarks: 0, tolerance: 0.01, unit_required: true },
    defaultOptions: null
  },
  {
    id: 'data_interpretation',
    label: 'Data Interpretation',
    defaultCorrectAnswer: { value: 0 },
    defaultGradingConfig: { type: 'data_interpretation', marks: 1, negativeMarks: 0, tolerance: 0.01 },
    defaultOptions: null
  },
  {
    id: 'fill_in_blank',
    label: 'Fill in the Blank(s)',
    defaultCorrectAnswer: { answers: [''] },
    defaultGradingConfig: { type: 'fill_in_blank', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  }
];

const DIFFICULTIES = ['Basic', 'Intermediate', 'Advanced'];

function ManageQuestions() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'pending';
  
  // State management
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [approvedQuestions, setApprovedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false); // Track if adding new question

  // Categories from DB (fetched dynamically)
  const [categories, setCategories] = useState([]);
  const [guideExpanded, setGuideExpanded] = useState(() => {
    const saved = localStorage.getItem('guideExpanded');
    return saved ? JSON.parse(saved) : true;
  });

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination state
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [pendingPagination, setPendingPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [approvedPagination, setApprovedPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const limit = 10;

  // Save guide expanded state
  useEffect(() => {
    localStorage.setItem('guideExpanded', JSON.stringify(guideExpanded));
  }, [guideExpanded]);

  // Fetch categories from DB on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const data = await reviewService.getCategories();
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      // Fall back to empty array - component will still work
    }
  }

  // Fetch questions on mount, when tab or pagination changes
  useEffect(() => {
    fetchQuestions();
  }, [currentTab, pendingPage, approvedPage]);

  // Auto-update correct_answer, grading_config, options when question type changes
  useEffect(() => {
    if (!editingQuestion?.type) return;
    
    const typeConfig = getTypeConfig(editingQuestion.type);
    if (!typeConfig) return;

    // Check if we need to reset (only if the current structure doesn't match the type)
    const currentType = editingQuestion.type;
    const currentCorrectAnswer = editingQuestion.correct_answer;
    
    let needsReset = false;
    
    // Check if correct_answer structure matches the expected type
    switch (currentType) {
      case 'mcq_single':
        needsReset = !currentCorrectAnswer || typeof currentCorrectAnswer.value !== 'string';
        break;
      case 'boolean':
        needsReset = !currentCorrectAnswer || typeof currentCorrectAnswer.value !== 'boolean';
        break;
      case 'fraction':
        needsReset = !currentCorrectAnswer || 
                     typeof currentCorrectAnswer.numerator !== 'number' || 
                     typeof currentCorrectAnswer.denominator !== 'number';
        break;
      case 'ratio':
        needsReset = !currentCorrectAnswer || 
                     !Array.isArray(currentCorrectAnswer.values);
        break;
      case 'numeric':
      case 'data_interpretation':
        needsReset = !currentCorrectAnswer || 
                     typeof currentCorrectAnswer.value !== 'number';
        break;
      case 'numeric_with_unit':
        needsReset = !currentCorrectAnswer || 
                     typeof currentCorrectAnswer.value !== 'number' ||
                     typeof currentCorrectAnswer.unit !== 'string';
        break;
      case 'fill_in_blank':
        needsReset = !currentCorrectAnswer || 
                     !Array.isArray(currentCorrectAnswer.answers);
        break;
      default:
        needsReset = false;
    }

    if (needsReset) {
      const defaults = getDefaultsForType(currentType);
      if (defaults) {
        setEditingQuestion(prev => ({
          ...prev,
          correct_answer: defaults.correct_answer,
          grading_config: defaults.grading_config,
          options: defaults.options
        }));
      }
    }
  }, [editingQuestion?.type]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      if (currentTab === 'pending') {
        const data = await reviewService.getPending(pendingPage, limit);
        setPendingQuestions(data.questions || []);
        setPendingPagination(data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
      } else if (currentTab === 'approved') {
        const data = await reviewService.getQuestions(approvedPage, limit);
        setApprovedQuestions(data.questions || []);
        setApprovedPagination(data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (currentTab === 'pending') {
      setPendingPage(page);
    } else {
      setApprovedPage(page);
    }
  };

  // Get display type name
  const getTypeName = (typeId) => {
    const type = QUESTION_TYPES.find(t => t.id === typeId);
    return type ? type.label : typeId;
  };

  // Get question type config
  const getTypeConfig = (typeId) => {
    return QUESTION_TYPES.find(t => t.id === typeId);
  };

  // Get default values for a type
  const getDefaultsForType = (typeId) => {
    const typeConfig = getTypeConfig(typeId);
    if (!typeConfig) return null;
    
    return {
      correct_answer: JSON.parse(JSON.stringify(typeConfig.defaultCorrectAnswer)),
      grading_config: JSON.parse(JSON.stringify(typeConfig.defaultGradingConfig)),
      options: typeConfig.defaultOptions ? JSON.parse(JSON.stringify(typeConfig.defaultOptions)) : null
    };
  };

  // Handle edit button click
  const handleEdit = (question) => {
    // Map API field names to component field names
    const questionType = question.final_question_type || question.detected_question_type || question.question_type || question.type;
    
    setEditingQuestion({
      ...question,
      type: questionType, // Normalize type field
      original_type: questionType
    });
    setIsAddMode(false);
    setShowEditModal(true);
  };

  // Handle add button click
  const handleAddQuestion = () => {
    const defaults = getDefaultsForType('mcq_single');
    setEditingQuestion({
      id: `temp_${Date.now()}`, // Temporary ID for new question
      category: '',
      subcategory: '',
      difficulty: 'Basic',
      type: 'mcq_single',
      question_text: '',
      passage: '',
      data_block: '',
      solution: '',
      correct_answer: defaults.correct_answer,
      grading_config: defaults.grading_config,
      options: defaults.options
    });
    setIsAddMode(true);
    setShowEditModal(true);
  };

  // Handle type change - auto-reset related fields
  const handleTypeChange = (e) => {
    const newType = e.target.value;
    const defaults = getDefaultsForType(newType);
    
    setEditingQuestion(prev => ({
      ...prev,
      type: newType,
      correct_answer: defaults.correct_answer,
      grading_config: defaults.grading_config,
      options: defaults.options || prev.options
    }));
  };

  // Handle close edit modal
  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingQuestion(null);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      // Validation
      if (!editingQuestion.question_text?.trim()) {
        setError('Question text is required');
        return;
      }
      if (!editingQuestion.category) {
        setError('Category is required');
        return;
      }
      if (!editingQuestion.type) {
        setError('Question type is required');
        return;
      }

      // Prepare update data
      const questionData = {
        category: editingQuestion.category,
        subcategory: editingQuestion.subcategory || '',
        difficulty: editingQuestion.difficulty,
        type: editingQuestion.type,
        question_text: editingQuestion.question_text,
        passage: editingQuestion.passage || null,
        data_block: editingQuestion.data_block || null,
        correct_answer: editingQuestion.correct_answer,
        grading_config: editingQuestion.grading_config,
        solution: editingQuestion.solution || '',
        options: editingQuestion.options
      };

      if (isAddMode) {
        // Create new question
        const response = await fetch('/api/admin/questions/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(questionData)
        });

        if (!response.ok) {
          const err = await response.json();
          setError(err.message || 'Failed to create question');
          return;
        }

        const newQuestion = await response.json();
        setPendingQuestions(prev => [newQuestion, ...prev]);
        setError('');
      } else {
        // Update existing question
        const idStr = String(editingQuestion.id);
        if (!editingQuestion.id || idStr.startsWith('temp_')) {
          setError('Invalid question ID');
          return;
        }

        await reviewService.updatePending(editingQuestion.id, questionData);
        
        // Update local state
        if (currentTab === 'pending') {
          setPendingQuestions(prev =>
            prev.map(q => q.id === editingQuestion.id ? { ...editingQuestion, original_type: editingQuestion.type } : q)
          );
        }
        setError('');
      }

      handleCloseModal();
    } catch (err) {
      console.error('Error saving question:', err);
      setError(err.message || 'Failed to save question. Please try again.');
    }
  };

  // Handle approve
  const handleApprove = async (questionId) => {
    try {
      await reviewService.approve(questionId);
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
      // Update pagination total to reflect removed question
      setPendingPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success('Question approved successfully!');
    } catch (err) {
      console.error('Error approving question:', err);
      toast.error('Failed to approve question.');
    }
  };

  // Handle reject
  const handleReject = async (questionId) => {
    try {
      await reviewService.reject(questionId);
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
      // Update pagination total to reflect removed question
      setPendingPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success('Question rejected.');
    } catch (err) {
      console.error('Error rejecting question:', err);
      toast.error('Failed to reject question.');
    }
  };

  // Filter questions
  const filterQuestions = (questions) => {
    return questions.filter(q => {
      // Map API field names to component field names for compatibility
      const questionType = q.final_question_type || q.detected_question_type || q.question_type || q.type;
      const matchesSearch = !searchTerm || 
        q.question_text?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || q.category === categoryFilter;
      const matchesType = !typeFilter || questionType === typeFilter;
      return matchesSearch && matchesCategory && matchesType;
    });
  };

  const displayQuestions = currentTab === 'pending' 
    ? filterQuestions(pendingQuestions)
    : filterQuestions(approvedQuestions);

  if (loading) {
    return (
      <AdminLayout title="Manage Questions">
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Questions">
      {error && <div className="error-banner">{error}</div>}

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${currentTab === 'pending' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'pending' })}
        >
          Pending Review ({pendingPagination.total})
        </button>
        <button
          className={`tab-btn ${currentTab === 'approved' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'approved' })}
        >
          Approved Questions ({approvedPagination.total})
        </button>
        <button
          className="btn btn-approve"
          style={{ marginLeft: 'auto' }}
          onClick={handleAddQuestion}
        >
          + Add New Question
        </button>
      </div>

      {/* Guide Panel */}
      <div className="guide-panel" style={{ margin: '16px 24px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div 
          className="guide-header" 
          onClick={() => setGuideExpanded(!guideExpanded)}
          style={{ 
            padding: '12px 16px', 
            background: '#f9fafb', 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#374151' }}>📖 How to Review and Add Questions</h3>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {guideExpanded ? 'Collapse ▼' : 'Expand ▶'}
          </span>
        </div>
        
        {guideExpanded && (
          <div className="guide-content" style={{ padding: '16px', background: '#fff' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
              Verify that the question type matches the structure, and that correct_answer and grading_config are valid JSON.
              Categories and subcategories are loaded from your existing questions database.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>Question Type</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>Correct Answer Schema</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {QUESTION_TYPES.map(type => (
                    <tr key={type.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>{type.id}</code>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          {JSON.stringify(type.defaultCorrectAnswer)}
                        </code>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#4b5563' }}>{type.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {QUESTION_TYPES.map(type => (
            <option key={type.id} value={type.id}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Questions List */}
      {displayQuestions.length === 0 ? (
        <div className="empty-state">
          <h3>No Questions Found</h3>
          <p>
            {currentTab === 'pending'
              ? 'No questions pending review at this time.'
              : 'No approved questions found.'}
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {displayQuestions.map(question => {
            // Map API field names for compatibility
            const questionType = question.final_question_type || question.detected_question_type || question.question_type || question.type;
            
            return (
            <div key={question.id} className="question-card">
              <div className="card-header">
                <div className="meta-tags">
                  <span className="tag tag-category">{question.category}</span>
                  <span className="tag tag-type">{getTypeName(questionType)}</span>
                  <span className={`tag tag-difficulty ${question.difficulty?.toLowerCase()}`}>
                    {question.difficulty}
                  </span>
                </div>
                {currentTab === 'pending' && (
                  <span className="status-pill pending">Pending Review</span>
                )}
              </div>

              <div className="card-body">
                {/* Passage */}
                {question.passage && (
                  <div className="passage-box">
                    <strong>Passage:</strong>
                    <div style={{ marginTop: '8px' }}>{question.passage}</div>
                  </div>
                )}

                {/* Data Block */}
                {question.data_block && (
                  <div className="data-block-box">
                    <strong>Data Block:</strong>
                    <div className="matrix-block">
                      {typeof question.data_block === 'string' 
                        ? question.data_block 
                        : question.data_block.markdown || JSON.stringify(question.data_block)}
                    </div>
                  </div>
                )}

                {/* Question Text */}
                <div className="question-text">{question.question_text}</div>

                {/* Options for MCQ types */}
                {['mcq_single', 'mcq_multiple', 'comprehension'].includes(questionType) && question.options && (
                  <div className="options-grid">
                    {(typeof question.options === 'string' ? (() => {
                      try { return JSON.parse(question.options); } catch { return []; }
                    })() : question.options).map((opt, idx) => (
                      <div key={idx} className="option-item">
                        <span className="option-key">{opt.key}.</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Correct Answer */}
                {question.correct_answer && (
                  <div className="answer-box">
                    <span className="answer-label">Correct Answer:</span>
                    <span>
                      {typeof question.correct_answer === 'string' 
                        ? JSON.parse(question.correct_answer).value || JSON.parse(question.correct_answer)
                        : question.correct_answer.value || JSON.stringify(question.correct_answer)}
                      {question.correct_answer.unit && ` ${question.correct_answer.unit}`}
                    </span>
                  </div>
                )}

                {/* Solution */}
                {question.solution && (
                  <div className="solution-box">
                    <div className="solution-label">Solution:</div>
                    <div className="solution-body">{question.solution}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="card-actions">
                <button
                  className="btn btn-edit"
                  onClick={() => handleEdit(question)}
                >
                  Edit
                </button>
                {currentTab === 'pending' && (
                  <>
                    <button
                      className="btn btn-approve"
                      onClick={() => handleApprove(question.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => handleReject(question.id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {(currentTab === 'pending' ? pendingPagination : approvedPagination).totalPages > 1 && (
        <Pagination
          currentPage={currentTab === 'pending' ? pendingPage : approvedPage}
          totalPages={(currentTab === 'pending' ? pendingPagination : approvedPagination).totalPages}
          totalItems={(currentTab === 'pending' ? pendingPagination : approvedPagination).total}
          itemsPerPage={limit}
          onPageChange={handlePageChange}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingQuestion && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isAddMode ? 'Create New Question' : 'Edit Question'}</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              {/* Category Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={editingQuestion.category || ''}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subcategory</label>
                  <select
                    className="form-select"
                    value={editingQuestion.subcategory || ''}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, subcategory: e.target.value }))}
                  >
                    <option value="">Select Subcategory</option>
                    {editingQuestion.category && categories.find(c => c.id === editingQuestion.category)?.subcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Difficulty Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-select"
                    value={editingQuestion.difficulty || ''}
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, difficulty: e.target.value }))}
                  >
                    <option value="">Select Difficulty</option>
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select
                    className="form-select"
                    value={editingQuestion.type || ''}
                    onChange={handleTypeChange}
                  >
                    <option value="">Select Type</option>
                    {QUESTION_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Passage */}
              <div className="form-group">
                <label className="form-label">Passage (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={editingQuestion.passage || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, passage: e.target.value }))}
                  placeholder="Enter passage text if applicable..."
                />
              </div>

              {/* Data Block */}
              <div className="form-group">
                <label className="form-label">Data Block (Optional)</label>
                <textarea
                  className="form-textarea monospace-field"
                  value={editingQuestion.data_block || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, data_block: e.target.value }))}
                  placeholder="Enter data block (table, matrix, etc)..."
                />
              </div>

              {/* Question Text */}
              <div className="form-group">
                <label className="form-label">Question Text *</label>
                <textarea
                  className="form-textarea"
                  value={editingQuestion.question_text || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="Enter the question..."
                  required
                />
              </div>

              {/* Options Editor - Only for MCQ single */}
              {editingQuestion.type === 'mcq_single' && editingQuestion.options && (
                <div className="form-group">
                  <label className="form-label">MCQ Options</label>
                  <div className="options-editor">
                    {editingQuestion.options.map((opt, idx) => (
                      <div key={idx} className="option-edit-row">
                        <span className="option-label">{opt.key}.</span>
                        <input
                          type="text"
                          className="form-input"
                          value={opt.text || ''}
                          onChange={(e) => {
                            const newOptions = [...editingQuestion.options];
                            newOptions[idx].text = e.target.value;
                            setEditingQuestion(prev => ({ ...prev, options: newOptions }));
                          }}
                          placeholder={`Option ${opt.key} text`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer - Numeric / Data Interpretation */}
              {(editingQuestion.type === 'numeric' || editingQuestion.type === 'data_interpretation') && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={editingQuestion.correct_answer?.value || 0}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      correct_answer: { ...prev.correct_answer, value: parseFloat(e.target.value) }
                    }))}
                  />
                </div>
              )}

              {/* Correct Answer - Numeric with Unit */}
              {editingQuestion.type === 'numeric_with_unit' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Value *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      value={editingQuestion.correct_answer?.value || 0}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        correct_answer: { ...prev.correct_answer, value: parseFloat(e.target.value) }
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingQuestion.correct_answer?.unit || ''}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        correct_answer: { ...prev.correct_answer, unit: e.target.value }
                      }))}
                      placeholder="e.g., m, kg, s"
                    />
                  </div>
                </div>
              )}

              {/* Correct Answer - Boolean */}
              {editingQuestion.type === 'boolean' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <select
                    className="form-select"
                    value={String(editingQuestion.correct_answer?.value ?? true)}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      correct_answer: { value: e.target.value === 'true' }
                    }))}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {/* Correct Answer - Fraction */}
              {editingQuestion.type === 'fraction' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Numerator *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingQuestion.correct_answer?.numerator || 0}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        correct_answer: { ...prev.correct_answer, numerator: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Denominator *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingQuestion.correct_answer?.denominator || 1}
                      onChange={(e) => setEditingQuestion(prev => ({
                        ...prev,
                        correct_answer: { ...prev.correct_answer, denominator: parseInt(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              )}

              {/* Correct Answer - Ratio */}
              {editingQuestion.type === 'ratio' && (
                <div className="form-group">
                  <label className="form-label">Ratio Values (e.g., 3:4) *</label>
                  <div className="form-row">
                    <input
                      type="number"
                      className="form-input"
                      value={editingQuestion.correct_answer?.values?.[0] || 1}
                      onChange={(e) => {
                        const newValues = [...(editingQuestion.correct_answer?.values || [1, 1])];
                        newValues[0] = parseInt(e.target.value);
                        setEditingQuestion(prev => ({
                          ...prev,
                          correct_answer: { values: newValues }
                        }));
                      }}
                    />
                    <span style={{ padding: '0 10px' }}>:</span>
                    <input
                      type="number"
                      className="form-input"
                      value={editingQuestion.correct_answer?.values?.[1] || 1}
                      onChange={(e) => {
                        const newValues = [...(editingQuestion.correct_answer?.values || [1, 1])];
                        newValues[1] = parseInt(e.target.value);
                        setEditingQuestion(prev => ({
                          ...prev,
                          correct_answer: { values: newValues }
                        }));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Correct Answer - Fill in Blank */}
              {editingQuestion.type === 'fill_in_blank' && (
                <div className="form-group">
                  <label className="form-label">Answers (one per blank) *</label>
                  {(editingQuestion.correct_answer?.answers || ['']).map((answer, idx) => (
                    <div key={idx} className="option-edit-row" style={{ marginBottom: '8px' }}>
                      <span className="option-label">{idx + 1}.</span>
                      <input
                        type="text"
                        className="form-input"
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...(editingQuestion.correct_answer?.answers || [''])];
                          newAnswers[idx] = e.target.value;
                          setEditingQuestion(prev => ({
                            ...prev,
                            correct_answer: { answers: newAnswers }
                          }));
                        }}
                        placeholder={`Answer for blank ${idx + 1}`}
                      />
                      {idx > 0 && (
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => {
                            const newAnswers = editingQuestion.correct_answer.answers.filter((_, i) => i !== idx);
                            setEditingQuestion(prev => ({
                              ...prev,
                              correct_answer: { answers: newAnswers }
                            }));
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => {
                      const newAnswers = [...(editingQuestion.correct_answer?.answers || ['']), ''];
                      setEditingQuestion(prev => ({
                        ...prev,
                        correct_answer: { answers: newAnswers }
                      }));
                    }}
                  >
                    + Add Blank
                  </button>
                </div>
              )}

              {/* Correct Answer - MCQ Single */}
              {editingQuestion.type === 'mcq_single' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <select
                    className="form-select"
                    value={editingQuestion.correct_answer?.value || 'A'}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      correct_answer: { value: e.target.value }
                    }))}
                  >
                    {editingQuestion.options?.map((opt, idx) => (
                      <option key={idx} value={opt.key}>{opt.key}. {opt.text}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Solution */}
              <div className="form-group">
                <label className="form-label">Solution (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={editingQuestion.solution || ''}
                  onChange={(e) => setEditingQuestion(prev => ({ ...prev, solution: e.target.value }))}
                  placeholder="Enter solution/explanation..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-reject"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-approve"
                onClick={handleSaveChanges}
              >
                {isAddMode ? 'Create Question' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuestions;
