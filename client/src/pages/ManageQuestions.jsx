import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import { reviewService } from '../services/review.service';
import '../styles/admin.css';

const safeJsonParse = (val) => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return val;
  }
};

function ManageQuestions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pending';
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Collapsible guide panel state
  const [guideExpanded, setGuideExpanded] = useState(() => {
    const saved = localStorage.getItem('guideExpanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [modalError, setModalError] = useState('');

  // Categories list and Types list for filter options
  const categoriesList = [
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Verbal Ability",
    "Data Interpretation and Analysis",
    "Abstract Reasoning",
    "Technical Aptitude"
  ];

  const typesList = [
    "mcq_single",
    "mcq_multiple",
    "numeric",
    "numeric_with_unit",
    "fraction",
    "ratio",
    "boolean",
    "ordering",
    "sentence_correction",
    "reading_comprehension",
    "data_interpretation",
    "code_output",
    "short_text"
  ];

  useEffect(() => {
    localStorage.setItem('guideExpanded', JSON.stringify(guideExpanded));
  }, [guideExpanded]);

  // Fetch questions when active tab or filters change
  useEffect(() => {
    fetchData();
  }, [activeTab, categoryFilter, typeFilter]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const filters = {
        category: categoryFilter || undefined,
        type: typeFilter || undefined,
      };
      
      let data = [];
      if (activeTab === 'pending') {
        data = await reviewService.getPending(filters);
      } else {
        data = await reviewService.getQuestions(filters);
      }

      // Local search filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        data = data.filter(q => 
          q.question_text.toLowerCase().includes(query) ||
          (q.solution && q.solution.toLowerCase().includes(query)) ||
          q.subcategory.toLowerCase().includes(query)
        );
      }

      setQuestions(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load questions database.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    // Reset filters when switching tabs
    setCategoryFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

  // Actions
  const handleApprove = async (id) => {
    try {
      await reviewService.approve(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to approve question: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this question?')) return;
    try {
      await reviewService.reject(id);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to reject question.');
    }
  };

  // Open Edit Modal
  const openEditModal = (q) => {
    setEditingQuestion({
      ...q,
      // Parse JSON strings to objects if they are strings
      options: safeJsonParse(q.options),
      correct_answer: safeJsonParse(q.correct_answer),
      grading_config: safeJsonParse(q.grading_config),
      data_block: safeJsonParse(q.data_block),
    });
    setModalError('');
    setIsEditModalOpen(true);
  };

  // Save Edits
  const handleSaveEdits = async (approveAfter = false) => {
    setModalError('');
    try {
      // Validate correct_answer and grading_config
      if (!editingQuestion.correct_answer) {
        setModalError('Correct Answer config cannot be empty.');
        return;
      }
      if (!editingQuestion.grading_config) {
        setModalError('Grading Config cannot be empty.');
        return;
      }

      const payload = {
        ...editingQuestion,
        // Send stringified versions for database
        options: editingQuestion.options ? JSON.stringify(editingQuestion.options) : null,
        correct_answer: JSON.stringify(editingQuestion.correct_answer),
        grading_config: JSON.stringify(editingQuestion.grading_config),
        data_block: editingQuestion.data_block ? JSON.stringify(editingQuestion.data_block) : null,
      };

      if (approveAfter) {
        // Save and approve in one step
        await reviewService.approve(editingQuestion.id, payload);
        setIsEditModalOpen(false);
        setQuestions(prev => prev.filter(q => q.id !== editingQuestion.id));
      } else {
        // Just save edits
        await reviewService.updatePending(editingQuestion.id, payload);
        setIsEditModalOpen(false);
        // Refresh data
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to save question details. Ensure format is correct.');
    }
  };

  // Helper to render parsed JSON correct_answer fields for user readability
  const renderCorrectAnswer = (q) => {
    let ans = q.correct_answer;
    if (typeof ans === 'string') {
      try { ans = JSON.parse(ans); } catch { return q.correct_answer; }
    }
    if (!ans) return 'N/A';

    switch (q.detected_question_type || q.question_type) {
      case 'mcq_single':
        return `Option: ${ans.value || 'N/A'}`;
      case 'numeric':
        return `Value: ${ans.value}`;
      case 'numeric_with_unit':
        return `Value: ${ans.value} ${ans.unit || ''}`;
      case 'fraction':
        return `Fraction: ${ans.numerator}/${ans.denominator}`;
      case 'ratio':
        return `Ratio: ${ans.values ? ans.values.join(':') : 'N/A'}`;
      case 'boolean':
        return `Boolean: ${ans.value ? 'True' : 'False'}`;
      case 'ordering':
        return `Order: ${ans.order ? ans.order.join(' → ') : 'N/A'}`;
      case 'sentence_correction':
      case 'reading_comprehension':
      case 'code_output':
      case 'short_text':
        return `Answer(s): ${ans.answers ? ans.answers.join(' | ') : ans.value || 'N/A'}`;
      default:
        return JSON.stringify(ans);
    }
  };

  /* old code */
  const legacyRender = () => {
    return (
      <AdminLayout title="Manage Questions">
        {/* Top Tabs */}
      <div className="tabs-nav">
        <button 
          onClick={() => handleTabChange('pending')} 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
        >
          Review Pending
        </button>
        <button 
          onClick={() => handleTabChange('approved')} 
          className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
        >
          Approved Questions
        </button>
      </div>

      {/* Guide Panel */}
      <div className="guide-panel">
        <div className="guide-header" onClick={() => setGuideExpanded(!guideExpanded)}>
          <h3>📖 How to Review Each Question Type</h3>
          <span className="guide-header-toggle">
            {guideExpanded ? 'Collapse' : 'Expand'}
          </span>
        </div>
        
        {guideExpanded && (
          <div className="guide-content">
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Verify that the automatically classified type matches the question structure, and that correct answer format is valid JSON.
            </p>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Question Type</th>
                  <th>Correct Answer Schema</th>
                  <th>Grading Config</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>mcq_single</code></td>
                  <td><code>{"{ \"value\": \"B\" }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td>Multiple choice option key</td>
                </tr>
                <tr>
                  <td><code>numeric</code></td>
                  <td><code>{"{ \"value\": 15 }"}</code></td>
                  <td><code>{"{ \"tolerance\": 0.01 }"}</code></td>
                  <td>Plain number answer</td>
                </tr>
                <tr>
                  <td><code>numeric_with_unit</code></td>
                  <td><code>{"{ \"value\": 60, \"unit\": \"km/h\" }"}</code></td>
                  <td><code>{"{ \"tolerance\": 0.01 }"}</code></td>
                  <td>Numbers with symbols or text units</td>
                </tr>
                <tr>
                  <td><code>fraction</code></td>
                  <td><code>{"{ \"numerator\": 3, \"denominator\": 8 }"}</code></td>
                  <td><code>{"{ \"allow_decimal\": true }"}</code></td>
                  <td>Fractions like 3/8</td>
                </tr>
                <tr>
                  <td><code>ratio</code></td>
                  <td><code>{"{ \"values\": [8, 15] }"}</code></td>
                  <td><code>{"{ \"allow_scaled\": true }"}</code></td>
                  <td>Ratios like 8:15</td>
                </tr>
                <tr>
                  <td><code>boolean</code></td>
                  <td><code>{"{ \"value\": true }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td>Yes/No or True/False</td>
                </tr>
                <tr>
                  <td><code>ordering</code></td>
                  <td><code>{"{ \"order\": [\"C\", \"D\", \"A\", \"B\"] }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td>Rearranging sentences or items</td>
                </tr>
                <tr>
                  <td><code>sentence_correction</code></td>
                  <td><code>{"{ \"answers\": [\"She sings beautifully.\"] }"}</code></td>
                  <td><code>{"{ \"ignore_punctuation\": true }"}</code></td>
                  <td>Grammatical correction tasks</td>
                </tr>
                <tr>
                  <td><code>code_output</code></td>
                  <td><code>{"{ \"answers\": [\"10\"] }"}</code></td>
                  <td><code>{"{ \"case_sensitive\": true }"}</code></td>
                  <td>Output logs or compiler prints</td>
                </tr>
                <tr>
                  <td><code>short_text</code></td>
                  <td><code>{"{ \"answers\": [\"Utensils\"] }"}</code></td>
                  <td><code>{"{ \"case_sensitive\": false }"}</code></td>
                  <td>Fill-in-the-blanks, vocabulary, etc.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="filter-bar">
        <input 
          type="text" 
          placeholder="Search questions, solutions, subcategories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categoriesList.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          {typesList.map((t, i) => (
            <option key={i} value={t}>{t}</option>
          ))}
        </select>

        <button type="submit" className="btn btn-approve">
          Apply Search
        </button>
      </form>

      {/* Error Message */}
      {error && <div style={{ color: 'var(--error-color)', marginBottom: '20px', fontWeight: '600' }}>{error}</div>}

      {/* Main List */}
      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <h3>No Questions Found</h3>
          <p>No questions matched your current filters or search term.</p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q) => {
            const warnings = safeJsonParse(q.warnings);
            const options = safeJsonParse(q.options);
            const db = safeJsonParse(q.data_block);

            return (
              <div key={q.id} className="question-card">
                <div className="card-header">
                  <div className="meta-tags">
                    <span className="tag tag-category">{q.category}</span>
                    <span className="tag tag-category" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      {q.subcategory}
                    </span>
                    <span className={`tag tag-difficulty ${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                    <span className="tag tag-type">
                      {q.detected_question_type || q.question_type}
                    </span>
                  </div>
                  
                  {activeTab === 'pending' && q.parser_confidence !== undefined && (
                    <div className="confidence-badge">
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Parser Confidence:</span>
                      <span className={`confidence-score ${q.parser_confidence >= 0.9 ? 'score-high' : q.parser_confidence >= 0.7 ? 'score-medium' : 'score-low'}`}>
                        {Math.round(q.parser_confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  {/* Passage */}
                  {q.passage && (
                    <div className="passage-box">
                      <strong>Passage / Context:</strong><br />
                      {q.passage}
                    </div>
                  )}

                  {/* Data block (Tables/Graphs) */}
                  {db && db.markdown && (
                    <div className="data-block-box">
                      <strong>Dataset Matrix:</strong>
                      <pre style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {db.markdown}
                      </pre>
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="question-text">
                    {q.source_question_no}. {q.question_text}
                  </div>

                  {/* MCQ Options */}
                  {options && options.length > 0 && (
                    <div className="options-grid">
                      {options.map((opt, i) => (
                        <div key={i} className="option-item">
                          <span className="option-key">{opt.key}:</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="answer-box">
                    <span className="answer-label">Correct Answer:</span>
                    <span>{renderCorrectAnswer(q)}</span>
                  </div>

                  {/* Solution */}
                  {q.solution && (
                    <div className="solution-box">
                      <div className="solution-label">Solution Breakdown:</div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{q.solution}</div>
                    </div>
                  )}

                  {/* Warnings (Admin Pending only) */}
                  {activeTab === 'pending' && warnings && warnings.length > 0 && (
                    <div className="warnings-box">
                      <div style={{ fontWeight: '700', marginBottom: '4px' }}>⚠️ Ingestion Warnings:</div>
                      {warnings.map((warn, i) => (
                        <div key={i} className="warning-item">• {warn}</div>
                      ))}
                    </div>
                  )}
                </div>

                {activeTab === 'pending' && (
                  <div className="card-actions">
                    <button onClick={() => openEditModal(q)} className="btn btn-edit">
                      Edit Question
                    </button>
                    <button onClick={() => handleReject(q.id)} className="btn btn-reject">
                      Reject
                    </button>
                    <button onClick={() => handleApprove(q.id)} className="btn btn-approve">
                      Approve & Make Live
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingQuestion && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Edit Pending Question (ID: {editingQuestion.id})</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {modalError && (
                <div style={{ color: 'var(--error-color)', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '8px', fontWeight: '600' }}>
                  {modalError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    value={editingQuestion.category || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                    className="form-select"
                  >
                    {categoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subcategory</label>
                  <input 
                    type="text" 
                    value={editingQuestion.subcategory || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subcategory: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select 
                    value={editingQuestion.difficulty || 'basic'} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    className="form-select"
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select 
                    value={editingQuestion.detected_question_type || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, detected_question_type: e.target.value })}
                    className="form-select"
                  >
                    {typesList.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Passage / Context (Optional)</label>
                <textarea 
                  value={editingQuestion.passage || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, passage: e.target.value || null })}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dataset Table (Optional Markdown)</label>
                <textarea 
                  value={editingQuestion.data_block?.markdown || ''} 
                  onChange={(e) => setEditingQuestion({ 
                    ...editingQuestion, 
                    data_block: e.target.value ? { type: 'table', markdown: e.target.value } : null 
                  })}
                  className="form-textarea"
                  placeholder="| Header 1 | Header 2 |"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea 
                  value={editingQuestion.question_text || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {/* MCQ Options Editor */}
              {editingQuestion.detected_question_type === 'mcq_single' && (
                <div className="form-group">
                  <label className="form-label">MCQ Options</label>
                  <div className="options-editor">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const opt = editingQuestion.options?.find(o => o.key === key) || { key, text: '' };
                      return (
                        <div key={key} className="option-edit-row">
                          <span className="option-label">{key}</span>
                          <input 
                            type="text" 
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...(editingQuestion.options || [])];
                              const idx = newOpts.findIndex(o => o.key === key);
                              if (idx !== -1) {
                                newOpts[idx] = { key, text: e.target.value };
                              } else {
                                newOpts.push({ key, text: e.target.value });
                              }
                              setEditingQuestion({ ...editingQuestion, options: newOpts });
                            }}
                            className="form-input"
                            placeholder={`Option ${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correct Answer (JSON Format)</label>
                  <textarea 
                    value={JSON.stringify(editingQuestion.correct_answer, null, 2) || ''} 
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditingQuestion({ ...editingQuestion, correct_answer: parsed });
                        setModalError('');
                      } catch {
                        // Keep text as-is, display validation error when saving
                        setModalError('Correct Answer is not valid JSON.');
                      }
                    }}
                    className="form-textarea"
                    rows={3}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <small style={{ color: '#64748b' }}>
                    Verify type compatibility. E.g. {"{ \"value\": \"B\" }"} for mcq_single.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Grading Config (JSON Format)</label>
                  <textarea 
                    value={JSON.stringify(editingQuestion.grading_config, null, 2) || ''} 
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditingQuestion({ ...editingQuestion, grading_config: parsed });
                        setModalError('');
                      } catch {
                        setModalError('Grading Config is not valid JSON.');
                      }
                    }}
                    className="form-textarea"
                    rows={3}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <small style={{ color: '#64748b' }}>
                    E.g. {"{}"} or {"{ \"tolerance\": 0.01 }"}.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Solution Breakdown</label>
                <textarea 
                  value={editingQuestion.solution || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, solution: e.target.value })}
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-reject">
                Cancel
              </button>
              <button onClick={() => handleSaveEdits(false)} className="btn btn-edit">
                Save Changes Only
              </button>
              <button onClick={() => handleSaveEdits(true)} className="btn btn-approve">
                Save & Approve Live
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
  };

  // ??$$$
  return (
    <AdminLayout title="Manage Questions">
      {/* Top Tabs */}
      <div className="tabs-nav">
        <button 
          onClick={() => handleTabChange('pending')} 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
        >
          Review Pending
        </button>
        <button 
          onClick={() => handleTabChange('approved')} 
          className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
        >
          Approved Questions
        </button>
      </div>

      {/* Guide Panel */}
      <div className="guide-panel">
        <div className="guide-header" onClick={() => setGuideExpanded(!guideExpanded)}>
          <h3>📖 How to Review Each Question Type</h3>
          <span className="guide-header-toggle">
            {guideExpanded ? 'Collapse' : 'Expand'}
          </span>
        </div>
        
        {guideExpanded && (
          <div className="guide-content">
            <p className="guide-instruction">
              Verify that the automatically classified type matches the question structure, and that correct answer format is valid JSON.
            </p>
            <table className="guide-table">
              <thead>
                <tr className="table-header-row">
                  <th className="bold-header">Question Type</th>
                  <th className="bold-header">Correct Answer Schema</th>
                  <th className="bold-header">Grading Config</th>
                  <th className="bold-header">Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>mcq_single</code></td>
                  <td><code>{"{ \"value\": \"B\" }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td className="cell-muted">Multiple choice option key</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>numeric</code></td>
                  <td><code>{"{ \"value\": 15 }"}</code></td>
                  <td><code>{"{ \"tolerance\": 0.01 }"}</code></td>
                  <td className="cell-muted">Plain number answer</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>numeric_with_unit</code></td>
                  <td><code>{"{ \"value\": 60, \"unit\": \"km/h\" }"}</code></td>
                  <td><code>{"{ \"tolerance\": 0.01 }"}</code></td>
                  <td className="cell-muted">Numbers with symbols or text units</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>fraction</code></td>
                  <td><code>{"{ \"numerator\": 3, \"denominator\": 8 }"}</code></td>
                  <td><code>{"{ \"allow_decimal\": true }"}</code></td>
                  <td className="cell-muted">Fractions like 3/8</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>ratio</code></td>
                  <td><code>{"{ \"values\": [8, 15] }"}</code></td>
                  <td><code>{"{ \"allow_scaled\": true }"}</code></td>
                  <td className="cell-muted">Ratios like 8:15</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>boolean</code></td>
                  <td><code>{"{ \"value\": true }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td className="cell-muted">Yes/No or True/False</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>ordering</code></td>
                  <td><code>{"{ \"order\": [\"C\", \"D\", \"A\", \"B\"] }"}</code></td>
                  <td><code>{"{}"}</code></td>
                  <td className="cell-muted">Rearranging sentences or items</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>sentence_correction</code></td>
                  <td><code>{"{ \"answers\": [\"She sings beautifully.\"] }"}</code></td>
                  <td><code>{"{ \"ignore_punctuation\": true }"}</code></td>
                  <td className="cell-muted">Grammatical correction tasks</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>code_output</code></td>
                  <td><code>{"{ \"answers\": [\"10\"] }"}</code></td>
                  <td><code>{"{ \"case_sensitive\": true }"}</code></td>
                  <td className="cell-muted">Output logs or compiler prints</td>
                </tr>
                <tr className="table-body-row">
                  <td className="cell-main-bold"><code>short_text</code></td>
                  <td><code>{"{ \"answers\": [\"Utensils\"] }"}</code></td>
                  <td><code>{"{ \"case_sensitive\": false }"}</code></td>
                  <td className="cell-muted">Fill-in-the-blanks, vocabulary, etc.</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <form onSubmit={handleSearchSubmit} className="filter-bar">
        <input 
          type="text" 
          placeholder="Search questions, solutions, subcategories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categoriesList.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>

        <select 
          value={typeFilter} 
          onChange={(e) => setTypeFilter(e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          {typesList.map((t, i) => (
            <option key={i} value={t}>{t}</option>
          ))}
        </select>

        <button type="submit" className="btn btn-approve">
          Apply Search
        </button>
      </form>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Main List */}
      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="empty-state">
          <h3>No Questions Found</h3>
          <p>No questions matched your current filters or search term.</p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((q) => {
            const warnings = safeJsonParse(q.warnings);
            const options = safeJsonParse(q.options);
            const db = safeJsonParse(q.data_block);

            return (
              <div key={q.id} className="question-card">
                <div className="card-header">
                  <div className="meta-tags">
                    <span className="tag tag-category">{q.category}</span>
                    <span className="tag tag-category tag-gray-bg">
                      {q.subcategory}
                    </span>
                    <span className={`tag tag-difficulty ${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                    <span className="tag tag-type">
                      {q.detected_question_type || q.question_type}
                    </span>
                  </div>
                  
                  {activeTab === 'pending' && q.parser_confidence !== undefined && (
                    <div className="confidence-badge">
                      <span className="confidence-label">Parser Confidence:</span>
                      <span className={`confidence-score ${q.parser_confidence >= 0.9 ? 'score-high' : q.parser_confidence >= 0.7 ? 'score-medium' : 'score-low'}`}>
                        {Math.round(q.parser_confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  {/* Passage */}
                  {q.passage && (
                    <div className="passage-box">
                      <strong>Passage / Context:</strong><br />
                      {q.passage}
                    </div>
                  )}

                  {/* Data block (Tables/Graphs) */}
                  {db && db.markdown && (
                    <div className="data-block-box">
                      <strong>Dataset Matrix:</strong>
                      <pre className="matrix-block">
                        {db.markdown}
                      </pre>
                    </div>
                  )}

                  {/* Question Text */}
                  <div className="question-text">
                    {q.source_question_no}. {q.question_text}
                  </div>

                  {/* MCQ Options */}
                  {options && options.length > 0 && (
                    <div className="options-grid">
                      {options.map((opt, i) => (
                        <div key={i} className="option-item">
                          <span className="option-key">{opt.key}:</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div className="answer-box">
                    <span className="answer-label">Correct Answer:</span>
                    <span>{renderCorrectAnswer(q)}</span>
                  </div>

                  {/* Solution */}
                  {q.solution && (
                    <div className="solution-box">
                      <div className="solution-label">Solution Breakdown:</div>
                      <div className="solution-body">{q.solution}</div>
                    </div>
                  )}

                  {/* Warnings (Admin Pending only) */}
                  {activeTab === 'pending' && warnings && warnings.length > 0 && (
                    <div className="warnings-box">
                      <div className="warning-title">⚠️ Ingestion Warnings:</div>
                      {warnings.map((warn, i) => (
                        <div key={i} className="warning-item">• {warn}</div>
                      ))}
                    </div>
                  )}
                </div>

                {activeTab === 'pending' && (
                  <div className="card-actions">
                    <button onClick={() => openEditModal(q)} className="btn btn-edit">
                      Edit Question
                    </button>
                    <button onClick={() => handleReject(q.id)} className="btn btn-reject">
                      Reject
                    </button>
                    <button onClick={() => handleApprove(q.id)} className="btn btn-approve">
                      Approve & Make Live
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingQuestion && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Edit Pending Question (ID: {editingQuestion.id})</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="modal-close">
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              {modalError && (
                <div className="error-banner">
                  {modalError}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    value={editingQuestion.category || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                    className="form-select"
                  >
                    {categoriesList.map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Subcategory</label>
                  <input 
                    type="text" 
                    value={editingQuestion.subcategory || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subcategory: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select 
                    value={editingQuestion.difficulty || 'basic'} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    className="form-select"
                  >
                    <option value="basic">Basic</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Type</label>
                  <select 
                    value={editingQuestion.detected_question_type || ''} 
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, detected_question_type: e.target.value })}
                    className="form-select"
                  >
                    {typesList.map((t, i) => (
                      <option key={i} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Passage / Context (Optional)</label>
                <textarea 
                  value={editingQuestion.passage || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, passage: e.target.value || null })}
                  className="form-textarea"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dataset Table (Optional Markdown)</label>
                <textarea 
                  value={editingQuestion.data_block?.markdown || ''} 
                  onChange={(e) => setEditingQuestion({ 
                    ...editingQuestion, 
                    data_block: e.target.value ? { type: 'table', markdown: e.target.value } : null 
                  })}
                  className="form-textarea monospace-field"
                  placeholder="| Header 1 | Header 2 |"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea 
                  value={editingQuestion.question_text || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {/* MCQ Options Editor */}
              {editingQuestion.detected_question_type === 'mcq_single' && (
                <div className="form-group">
                  <label className="form-label">MCQ Options</label>
                  <div className="options-editor">
                    {['A', 'B', 'C', 'D'].map((key) => {
                      const opt = editingQuestion.options?.find(o => o.key === key) || { key, text: '' };
                      return (
                        <div key={key} className="option-edit-row">
                          <span className="option-label">{key}</span>
                          <input 
                            type="text" 
                            value={opt.text}
                            onChange={(e) => {
                              const newOpts = [...(editingQuestion.options || [])];
                              const idx = newOpts.findIndex(o => o.key === key);
                              if (idx !== -1) {
                                newOpts[idx] = { key, text: e.target.value };
                              } else {
                                newOpts.push({ key, text: e.target.value });
                              }
                              setEditingQuestion({ ...editingQuestion, options: newOpts });
                            }}
                            className="form-input"
                            placeholder={`Option ${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Correct Answer (JSON Format)</label>
                  <textarea 
                    value={JSON.stringify(editingQuestion.correct_answer, null, 2) || ''} 
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditingQuestion({ ...editingQuestion, correct_answer: parsed });
                        setModalError('');
                      } catch {
                        // Keep text as-is, display validation error when saving
                        setModalError('Correct Answer is not valid JSON.');
                      }
                    }}
                    className="form-textarea monospace-field"
                    rows={3}
                  />
                  <small className="text-muted-small">
                    Verify type compatibility. E.g. {"{ \"value\": \"B\" }"} for mcq_single.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Grading Config (JSON Format)</label>
                  <textarea 
                    value={JSON.stringify(editingQuestion.grading_config, null, 2) || ''} 
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setEditingQuestion({ ...editingQuestion, grading_config: parsed });
                        setModalError('');
                      } catch {
                        setModalError('Grading Config is not valid JSON.');
                      }
                    }}
                    className="form-textarea monospace-field"
                    rows={3}
                  />
                  <small className="text-muted-small">
                    E.g. {"{}"} or {"{ \"tolerance\": 0.01 }"}.
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Solution Breakdown</label>
                <textarea 
                  value={editingQuestion.solution || ''} 
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, solution: e.target.value })}
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setIsEditModalOpen(false)} className="btn btn-reject">
                Cancel
              </button>
              <button onClick={() => handleSaveEdits(false)} className="btn btn-edit">
                Save Changes Only
              </button>
              <button onClick={() => handleSaveEdits(true)} className="btn btn-approve">
                Save & Approve Live
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default ManageQuestions;
