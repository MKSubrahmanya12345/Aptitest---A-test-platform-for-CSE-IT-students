import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { reviewService } from '../services/review.service';
import '../styles/admin.css';

// Question type definitions with default structures
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
    id: 'mcq_multiple',
    label: 'MCQ (Multiple Answers)',
    defaultCorrectAnswer: { value: ['A', 'B'] },
    defaultGradingConfig: { type: 'mcq_multiple', marks: 1, negativeMarks: 0 },
    defaultOptions: [
      { key: 'A', text: 'Option A' },
      { key: 'B', text: 'Option B' },
      { key: 'C', text: 'Option C' },
      { key: 'D', text: 'Option D' }
    ]
  },
  {
    id: 'numeric_integer',
    label: 'Numeric (Integer)',
    defaultCorrectAnswer: { value: 0 },
    defaultGradingConfig: { type: 'numeric_integer', marks: 1, negativeMarks: 0, tolerance: 0 },
    defaultOptions: null
  },
  {
    id: 'numeric_decimal',
    label: 'Numeric (Decimal)',
    defaultCorrectAnswer: { value: 0.0 },
    defaultGradingConfig: { type: 'numeric_decimal', marks: 1, negativeMarks: 0, tolerance: 0.01 },
    defaultOptions: null
  },
  {
    id: 'numeric_with_unit',
    label: 'Numeric with Unit',
    defaultCorrectAnswer: { value: 0, unit: '' },
    defaultGradingConfig: { type: 'numeric_with_unit', marks: 1, negativeMarks: 0, tolerance: 0.01 },
    defaultOptions: null
  },
  {
    id: 'matrix',
    label: 'Matrix (Grid)',
    defaultCorrectAnswer: { rows: 2, cols: 2, values: [[0, 0], [0, 0]] },
    defaultGradingConfig: { type: 'matrix', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  },
  {
    id: 'fill_in_blanks',
    label: 'Fill in the Blanks',
    defaultCorrectAnswer: { blanks: [{ id: 1, answer: '' }] },
    defaultGradingConfig: { type: 'fill_in_blanks', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  },
  {
    id: 'assertion_reason',
    label: 'Assertion-Reason',
    defaultCorrectAnswer: { assertion: true, reason: true, relation: true },
    defaultGradingConfig: { type: 'assertion_reason', marks: 1, negativeMarks: 0 },
    defaultOptions: null
  },
  {
    id: 'comprehension',
    label: 'Comprehension',
    defaultCorrectAnswer: { value: 'A' },
    defaultGradingConfig: { type: 'comprehension', marks: 1, negativeMarks: 0 },
    defaultOptions: [
      { key: 'A', text: 'Option A' },
      { key: 'B', text: 'Option B' },
      { key: 'C', text: 'Option C' },
      { key: 'D', text: 'Option D' }
    ]
  }
];

// Default categories and subcategories - FIXED from actual database
const CATEGORIES = [
  {
    id: 'Abstract Reasoning',
    label: 'Abstract Reasoning',
    subcategories: ['Analogy Questions', 'Matrix Pattern Questions', 'Number Sequence Questions', 'Odd One Out Questions', 'Shape Pattern Questions']
  },
  {
    id: 'Data Interpretation and Analysis',
    label: 'Data Interpretation and Analysis',
    subcategories: ['Bar Graph-Based Questions', 'Caselet-Based Questions', 'Combination Chart-Based Questions', 'Line Graph-Based Questions', 'Multiple Table-Based Questions', 'Pie Chart with Secondary Data-Based Questions', 'Pie Chart-Based Questions', 'Stacked Bar Graph-Based Questions', 'Table-Based Questions']
  },
  {
    id: 'Logical Reasoning',
    label: 'Logical Reasoning',
    subcategories: ['Additional Basic Questions', 'Analogies', 'Blood Relations', 'Coding-Decoding', 'Critical Reasoning', 'Data Sufficiency', 'Directions', 'Non-Verbal Reasoning', 'Puzzles', 'Series', 'Syllogisms']
  },
  {
    id: 'Quantitative Aptitude',
    label: 'Quantitative Aptitude',
    subcategories: ['Averages', 'Miscellaneous', 'Number Systems', 'Percentages', 'Permutations and Combinations', 'Probability', 'Profit and Loss', 'Ratios and Proportions', 'Simple and Compound Interest', 'Simple Interest', 'Time and Distance', 'Time and Work']
  },
  {
    id: 'Technical Aptitude',
    label: 'Technical Aptitude',
    subcategories: ['AI/ML Foundations', 'Algorithms', 'Computer Networks', 'Data Structures', 'Database Basics', 'Operating Systems', 'Programming Fundamentals']
  },
  {
    id: 'Verbal Ability',
    label: 'Verbal Ability',
    subcategories: ['Antonyms', 'Cloze Test', 'Idioms/Phrases', 'Jumbled Sentences', 'Reading Comprehension', 'Sentence Completion', 'Sentence Correction', 'Spotting Errors', 'Synonyms', 'Verbal Analogies']
  }
];

const DIFFICULTIES = ['Basic', 'Intermediate', 'Advanced'];

function ManageQuestions() {
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
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch questions on mount and when tab changes
  useEffect(() => {
    fetchQuestions();
  }, [currentTab]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (currentTab === 'pending') {
        const data = await reviewService.getPending();
        // API returns array directly, not wrapped in object
        setPendingQuestions(Array.isArray(data) ? data : data.questions || []);
      } else if (currentTab === 'approved') {
        const data = await reviewService.getQuestions();
        // API returns array directly, not wrapped in object
        setApprovedQuestions(Array.isArray(data) ? data : data.questions || []);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
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
        const response = await fetch('/api/questions/create', {
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
        if (!editingQuestion.id || editingQuestion.id.startsWith('temp_')) {
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
      await fetchQuestions();
    } catch (err) {
      console.error('Error approving question:', err);
      setError('Failed to approve question.');
    }
  };

  // Handle reject
  const handleReject = async (questionId) => {
    try {
      await reviewService.reject(questionId);
      setPendingQuestions(prev => prev.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Error rejecting question:', err);
      setError('Failed to reject question.');
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
          Pending Review ({pendingQuestions.length})
        </button>
        <button
          className={`tab-btn ${currentTab === 'approved' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'approved' })}
        >
          Approved Questions ({approvedQuestions.length})
        </button>
        <button
          className="btn btn-approve"
          style={{ marginLeft: 'auto' }}
          onClick={handleAddQuestion}
        >
          + Add New Question
        </button>
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
          {CATEGORIES.map(cat => (
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
                    {(typeof question.options === 'string' ? JSON.parse(question.options) : question.options).map((opt, idx) => (
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
                    onChange={(e) => setEditingQuestion(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map(cat => (
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
                    {editingQuestion.category && CATEGORIES.find(c => c.id === editingQuestion.category)?.subcategories.map(sub => (
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

              {/* Correct Answer - Numeric Integer */}
              {editingQuestion.type === 'numeric_integer' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editingQuestion.correct_answer?.value || 0}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      correct_answer: { ...prev.correct_answer, value: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              )}

              {/* Correct Answer - Numeric Decimal */}
              {editingQuestion.type === 'numeric_decimal' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={editingQuestion.correct_answer?.value || 0.0}
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
                      step="0.01"
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

              {/* Correct Answer - MCQ Single */}
              {editingQuestion.type === 'mcq_single' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer *</label>
                  <select
                    className="form-select"
                    value={editingQuestion.correct_answer?.value || 'A'}
                    onChange={(e) => setEditingQuestion(prev => ({
                      ...prev,
                      correct_answer: { ...prev.correct_answer, value: e.target.value }
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
