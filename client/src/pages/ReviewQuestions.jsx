import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../components/common/Pagination";
import { testApiService } from "../services/test.service";
import "../styles/review-questions.css";

// Helper to render user answer based on question type
function renderUserAnswer(question) {
  const ans = question.user_answer;
  if (ans === undefined || ans === null) return <span className="skipped">Skipped</span>;

  switch (question.question_type) {
    case "mcq_single":
      return `Option ${ans}`;
    case "boolean":
      return ans === true ? "Yes / True" : "No / False";
    case "fraction":
      return `${ans.numerator || 0}/${ans.denominator || 0}`;
    case "ratio":
      return ans.values ? ans.values.join(":") : "N/A";
    case "numeric":
      return `${ans}`;
    case "numeric_with_unit":
      return `${ans.value || 0} ${ans.unit || ""}`;
    default:
      return typeof ans === "object" ? JSON.stringify(ans) : String(ans);
  }
}

// Helper to render correct answer
function renderCorrectAnswer(question) {
  const ans = question.correct_answer;
  if (!ans) return "N/A";

  switch (question.question_type) {
    case "mcq_single":
      return `Option ${ans.value || "N/A"}`;
    case "boolean":
      return ans.value ? "Yes / True" : "No / False";
    case "fraction":
      return `${ans.numerator}/${ans.denominator}`;
    case "ratio":
      return ans.values ? ans.values.join(":") : "N/A";
    case "numeric":
      return `${ans.value}`;
    case "numeric_with_unit":
      return `${ans.value} ${ans.unit || ""}`;
    default:
      return ans.value || JSON.stringify(ans);
  }
}

function ReviewQuestions() {
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch questions when filters or page change
  useEffect(() => {
    fetchQuestions();
  }, [selectedCategory, selectedSubcategory, page]);

  async function fetchFilterOptions() {
    try {
      const data = await testApiService.getQuestionFilterOptions();
      setCategories(data.categories || []);
      setSubcategories(data.subcategories || []);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
    }
  }

  async function fetchQuestions() {
    setLoading(true);
    setError("");
    try {
      const data = await testApiService.getSolvedQuestions(
        selectedCategory,
        selectedSubcategory,
        page,
        20
      );
      setQuestions(data.questions || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError("Failed to load questions. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(e) {
    setSelectedCategory(e.target.value);
    setPage(1);
  }

  function handleSubcategoryChange(e) {
    setSelectedSubcategory(e.target.value);
    setPage(1);
  }

  function handleBack() {
    navigate("/student");
  }

  return (
    <div className="review-questions-page">
      <div className="review-header">
        <button className="btn-back" onClick={handleBack}>
          ← Back to Dashboard
        </button>
        <h1>Question Review</h1>
        <p>Review all questions you've attempted, filtered by category</p>
      </div>

      <div className="review-filters">
        <div className="filter-group">
          <label htmlFor="category-filter">Category</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="subcategory-filter">Subcategory</label>
          <select
            id="subcategory-filter"
            value={selectedSubcategory}
            onChange={handleSubcategoryChange}
            className="filter-select"
          >
            <option value="all">All Subcategories</option>
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-stats">
          <span className="total-count">
            {pagination.total} question{pagination.total !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {loading ? (
        <div className="review-loading">
          <div className="loader"></div>
          <span>Loading questions...</span>
        </div>
      ) : error ? (
        <div className="review-error">
          <p>{error}</p>
          <button onClick={fetchQuestions}>Retry</button>
        </div>
      ) : questions.length === 0 ? (
        <div className="review-empty">
          <h3>No questions found</h3>
          <p>
            {selectedCategory !== "all" || selectedSubcategory !== "all"
              ? "Try adjusting your filters to see more questions."
              : "You haven't attempted any questions yet. Take a test to start building your review history!"}
          </p>
        </div>
      ) : (
        <>
          <div className="questions-list">
            {questions.map((q, index) => (
              <div
                key={q.question_id}
                className={`question-card ${q.is_correct ? "correct" : "incorrect"}`}
              >
                <div className="question-header">
                  <span className="question-number">
                    #{((page - 1) * 20) + index + 1}
                  </span>
                  <div className="question-badges">
                    <span className="badge category">{q.category}</span>
                    {q.subcategory && (
                      <span className="badge subcategory">{q.subcategory}</span>
                    )}
                    <span className="badge difficulty">{q.difficulty}</span>
                    <span className={`badge result ${q.is_correct ? "correct" : "wrong"}`}>
                      {q.is_correct ? "✓ Correct" : "✗ Wrong"}
                    </span>
                  </div>
                </div>

                <div className="question-content">
                  <p className="question-text">{q.question_text}</p>
                </div>

                <div className="question-answers">
                  <div className="answer-row">
                    <span className="answer-label">Your Answer:</span>
                    <span className={`answer-value ${q.is_correct ? "correct" : "wrong"}`}>
                      {renderUserAnswer(q)}
                    </span>
                  </div>
                  {!q.is_correct && (
                    <div className="answer-row">
                      <span className="answer-label">Correct Answer:</span>
                      <span className="answer-value correct">
                        {renderCorrectAnswer(q)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="question-meta">
                  <span className="meta-item">
                    ⏱️ {q.time_taken_seconds ? `${q.time_taken_seconds}s` : "N/A"}
                  </span>
                  <span className="meta-item">
                    📅 {new Date(q.session_date).toLocaleDateString()}
                  </span>
                  <span className="meta-item type">
                    {q.question_type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="review-pagination">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReviewQuestions;
