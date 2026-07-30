# AptiTest - Complete Testing Documentation

## Table of Contents
1. [Core Infrastructure](#core-infrastructure)
2. [Authentication & Authorization](#authentication--authorization)
3. [Student Dashboard](#student-dashboard)
4. [Admin Dashboard](#admin-dashboard)
5. [Common Components](#common-components)
6. [Services & APIs](#services--apis)

---

## 1. Core Infrastructure

### 1.1 App.jsx - Main Router
**File:** client/src/App.jsx

#### Routes Configured
| Path | Component | Access |
|------|-----------|--------|
| / | Redirect to /login | All |
| /login | Login | Public |
| /signup | Signup | Public |
| /forgot-password | ForgotPassword | Public |
| /reset-password | ResetPassword | Public (token) |
| /verify-email | VerifyEmail | Public (token) |
| /profile | Profile | Authenticated |
| /admin | AdminDashboard | Admin only |
| /admin/manage-questions | ManageQuestions | Admin only |
| /dashboard | StudentDashboard | Student only |
| /payment/success | PaymentSuccess | Authenticated |
| /admin/view-students | ViewStudents | Admin only |
| /admin/rankings | AdminRankings | Admin only |
| /admin/test-templates | TestTemplates | Admin only |
| * | NotFound | All |

#### Test Cases
- [ ] **Route Access Control**
  - [ ] Redirect root / to /login
  - [ ] Access /admin as student - redirects to login
  - [ ] Access /dashboard as admin - redirects to admin
  - [ ] Access protected route without token - redirect to login
- [ ] **404 Handling** - Visit non-existent route /xyz - shows NotFound page

---

### 1.2 Contexts

#### ThemeContext.jsx
**File:** client/src/contexts/ThemeContext.jsx

#### Features
- Light/Dark theme toggle
- LocalStorage persistence (	heme key)
- CSS attribute data-theme injection

#### Test Cases
- [ ] First visit defaults to 'light'
- [ ] Reload page preserves selected theme
- [ ] Toggle changes theme immediately
- [ ] localStorage updates on toggle

#### ToastContext.jsx
**File:** client/src/contexts/ToastContext.jsx

#### Features
- Global toast notification system
- Auto-dismiss after duration (default 3000ms)
- Types: success, error, warning, info

#### Test Cases
- [ ] Success toast shows checkmark icon
- [ ] Error toast shows X icon
- [ ] Toast auto-dismisses after duration
- [ ] Clicking X button dismisses immediately
- [ ] Multiple toasts stack correctly

---

## 2. Authentication & Authorization

### 2.1 Auth Service
**File:** client/src/services/auth.service.js

#### API Endpoints
| Function | Endpoint | Method |
|----------|----------|--------|
| login(email, password) | /auth/login | POST |
| signup(name, email, password) | /auth/signup | POST |
| orgotPassword(email) | /auth/forgot-password | POST |
| esetPassword(token, newPassword) | /auth/reset-password | POST |
| erifyResetToken(token) | /auth/verify-reset-token | GET |
| erifyEmail(token) | /auth/verify-email | GET |

---

### 2.2 Login Page
**File:** client/src/pages/Login.jsx

#### Features
- Split-screen layout (branding + form)
- Email/password validation
- Password visibility toggle
- Role-based redirect (admin vs student)

#### Validation Rules
| Field | Rules |
|-------|-------|
| Email | Required, valid email format |
| Password | Required, min 6 characters |

#### Test Cases
- [ ] **Form Validation**
  - [ ] Empty email shows "Email is required"
  - [ ] Invalid email format shows error
  - [ ] Empty password shows "Password is required"
  - [ ] Password < 6 chars shows error
- [ ] **Login Flow**
  - [ ] Valid login stores token in localStorage
  - [ ] Admin redirects to /admin
  - [ ] Student redirects to /dashboard
  - [ ] Loading state during submission
  - [ ] Error message on failed login

---

### 2.3 Signup Page
**File:** client/src/pages/Signup.jsx

#### Test Cases
- [ ] All fields required (name, email, password)
  - [ ] Password min 6 chars
  - [ ] Valid signup shows success state
  - [ ] Success shows email verification notice
  - [ ] Error on duplicate email

---

### 2.4 Forgot/Reset Password
**File:** client/src/pages/ForgotPassword.jsx, ResetPassword.jsx

#### Test Cases
- [ ] Valid email sends reset link
- [ ] Success confirmation message
- [ ] Token validation on page load
- [ ] Invalid token shows error
- [ ] Password and confirm must match
- [ ] Password min 6 chars
- [ ] Success redirects after 3 seconds

---

### 2.5 Verify Email
**File:** client/src/pages/VerifyEmail.jsx

#### Test Cases
- [ ] Auto-verifies on page load
- [ ] Shows spinner while verifying
- [ ] Success shows checkmark icon
- [ ] Error shows X icon with message
- [ ] "Go to Login" button present

---

### 2.6 Profile Page
**File:** client/src/pages/Profile.jsx

#### Features
- User profile display and editing
- Test statistics from history
- Password change form

#### Statistics Computed
- totalTests: Count of history items
- avgScore: Average of score_obtained
- highScore: Max score_obtained
- overallAccuracy: (totalCorrect/totalQuestions) * 100

#### Test Cases
- [ ] User name and email displayed
  - [ ] Statistics cards visible
  - [ ] Edit mode toggles form
  - [ ] Save updates localStorage
  - [ ] Statistics calculated correctly

---

## 3. Student Dashboard

### 3.1 StudentDashboard.jsx
**File:** client/src/pages/StudentDashboard.jsx

#### Views
| View | Description |
|------|-------------|
| dashboard | Main dashboard with templates |
| history | Past test attempts |
| leaderboard | Global rankings |
| 	est_environment | Active test taking |
| esults | Test results display |

#### Categories (6)
1. Quantitative Aptitude
2. Logical Reasoning
3. Verbal Ability
4. Data Interpretation and Analysis
5. Abstract Reasoning
6. Technical Aptitude

---

### 3.2 Dashboard View Test Cases
- [ ] Templates fetch on mount
- [ ] Free templates show "Start Test" button
- [ ] Paid templates show lock/price
- [ ] Checklist modal opens on Start
- [ ] At least one category required
- [ ] Payment modal opens for paid templates

---

### 3.3 Test Environment Test Cases

#### Question Types Support
| Type | Input Method |
|------|--------------|
| mcq_single | Radio buttons |
| boolean | Yes/No buttons |
| fraction | Numerator/Denominator inputs |
| ratio | Multiple value inputs |
| numeric | Number input |
| numeric_with_unit | Value + unit |

#### Test Cases
- [ ] Session created via API
- [ ] Timer synced with server_expires_at
- [ ] Auto-submit on timeout
- [ ] Next/Previous navigation
- [ ] Flag/Unflag questions
- [ ] Save answer on selection
- [ ] beforeunload warning during test
- [ ] Submit confirmation modal

---

### 3.4 Results View Test Cases
- [ ] Score displayed prominently
- [ ] Correct/Incorrect/Skipped counts
- [ ] Time taken vs allocated
- [ ] User answer vs correct answer
- [ ] Explanation shown if available
- [ ] Markdown table rendering for data questions
- [ ] Reattempt button creates new session

---

### 3.5 History View Test Cases
- [ ] Fetches on view switch
- [ ] Pagination works (page, limit)
- [ ] Test type/difficulty shown
- [ ] Score and date displayed
- [ ] View Details links to results
- [ ] Reattempt button functional

---

### 3.6 Leaderboard View Test Cases
- [ ] Fetches for selected type
- [ ] Types: easy_30, easy_60, hard_30, hard_60
- [ ] Rank numbers shown
- [ ] User names displayed
- [ ] Scores shown
- [ ] Pagination 20 items per page

---

## 4. Admin Dashboard

### 4.1 AdminDashboard.jsx
**File:** client/src/pages/AdminDashboard.jsx

#### Stats Displayed
- Pending Review count
- Live Approved Questions count
- Daily trends (last 30 days)

#### Test Cases
- [ ] Stats fetch on mount
- [ ] Pending count displays
- [ ] Approved count displays
- [ ] Review Questions button navigates
- [ ] Daily trends bar chart renders

---

### 4.2 ManageQuestions.jsx
**File:** client/src/pages/ManageQuestions.jsx

#### Question Types (8)
 mcq_single, boolean, fraction, ratio, numeric, numeric_with_unit, data_interpretation, fill_in_blank

#### Difficulty Levels
 Basic, Intermediate, Advanced

#### Test Cases
- [ ] Tab navigation (Pending/Approved)
- [ ] Filter by category, difficulty, type
- [ ] Search functionality
- [ ] Create question with type-specific form
- [ ] Edit question with pre-filled data
- [ ] Delete with confirmation
- [ ] Approve/Reject pending questions

---

### 4.3 ViewStudents.jsx
**File:** client/src/pages/ViewStudents.jsx

#### Test Cases
- [ ] Students list loads with pagination
- [ ] Search/filter functionality
- [ ] Ban/Unban with confirmation
- [ ] Student stats modal opens
- [ ] Toast notifications on actions

---

### 4.4 AdminRankings.jsx
**File:** client/src/pages/AdminRankings.jsx

#### Test Cases
- [ ] Rankings by type (easy_30, easy_60, hard_30, hard_60)
- [ ] Type toggle buttons work
- [ ] Time per correct question formatted
- [ ] Student modal on click

---

### 4.5 TestTemplates.jsx
**File:** client/src/pages/TestTemplates.jsx

#### Form Fields
name, description, difficulty, count, duration_minutes, categories[], question_types[], is_paid, price_rupees, is_active, allow_reattempt

#### Hardcoded Templates (Fallback)
| ID | Name | Difficulty | Count | Duration | Paid |
|----|------|------------|-------|----------|------|
| easy_30 | Easy Practice - 30 Qs | easy | 30 | 30min | No |
| easy_60 | Easy Practice - 60 Qs | easy | 60 | 60min | No |
| hard_30 | Hard Practice - 30 Qs | hard | 30 | 30min | No |
| hard_60 | Hard Practice - 60 Qs | hard | 60 | 60min | Yes (Rs 50) |

#### Test Cases
- [ ] All templates displayed
- [ ] Active/Inactive status badge
- [ ] Create template modal
- [ ] Category multi-select
- [ ] Question type multi-select
- [ ] Paid toggle shows price field
- [ ] Edit saves changes
- [ ] Delete with confirmation

---

## 5. Common Components

### 5.1 Pagination.jsx
**File:** client/src/components/common/Pagination.jsx

#### Test Cases
- [ ] Current page highlighted
- [ ] Previous/Next buttons
- [ ] Previous disabled on page 1
- [ ] Next disabled on last page

---

### 5.2 RazorpayPayment.jsx
**File:** client/src/components/RazorpayPayment.jsx

#### Test Cases
- [ ] Modal opens with amount (Rs 1.00)
- [ ] UPI payment option
- [ ] Card payment option
- [ ] Loading spinner while initiating
- [ ] Razorpay checkout opens
- [ ] Success verifies with backend
- [ ] Failure shows error message
- [ ] alreadyPaid flag skips payment

---

### 5.3 NotFound.jsx
**File:** client/src/pages/NotFound.jsx

#### Test Cases
- [ ] 404 message displayed
- [ ] Go Home button links to dashboard

---

## 6. Services & APIs

### 6.1 Test Service
**File:** client/src/services/test.service.js

| Method | Endpoint | Description |
|--------|----------|-------------|
| startTest(config) | POST /test/start | Start new session |
| saveAnswer(sessionId, qId, answer) | POST /test/answer | Save answer |
| submitTest(sessionId) | POST /test/submit | Submit test |
| getSessionDetail(sessionId) | GET /test/session/:id | Get results |
| getHistory(page, limit) | GET /test/history | Get history |
| reattempt(sessionId) | POST /test/reattempt/:id | Reattempt test |
| getLeaderboard(type, page, limit) | GET /leaderboard | Get rankings |
| markQuestionViewed(sessionId, qId) | POST /test/view-question | Track views |
| getCategoryPerformance() | GET /test/category-performance | Get analytics |

---

### 6.2 Payment Service
**File:** client/src/services/payment.service.js

| Method | Endpoint | Description |
|--------|----------|-------------|
| checkStatus(testType) | GET /payment/status | Check if paid |
| createIntent(key, testType, templateId) | POST /payment/create-intent | Create payment intent |
| confirmPayment(intentId) | POST /payment/confirm | Confirm payment |

---

### 6.3 Test Template Service
**File:** client/src/services/testTemplate.service.js

| Method | Endpoint | Description |
|--------|----------|-------------|
| getAllTemplates(filters) | GET /test-templates | List templates |
| getTemplateById(id) | GET /test-templates/:id | Get single template |
| createTemplate(data) | POST /test-templates | Create template |
| updateTemplate(id, data) | PUT /test-templates/:id | Update template |
| deleteTemplate(id) | DELETE /test-templates/:id | Delete template |
| getMyTemplateAccess() | GET /test-templates/my-access | User's paid access |

---

### 6.4 Review Service
**File:** client/src/services/review.service.js

| Method | Endpoint | Description |
|--------|----------|-------------|
| getPending(page, limit, filters) | GET /review-pending | Pending questions |
| updatePending(id, data) | PUT /review-pending/:id | Update pending |
| approve(id, data) | POST /review-pending/:id/approve | Approve question |
| reject(id) | POST /review-pending/:id/reject | Reject question |
| getQuestions(page, limit, filters) | GET /questions | All questions |
| getCategories() | GET /questions/categories | Categories list |
| getStats() | GET /stats | Dashboard stats |
| getStudents(page, limit) | GET /view-students | Student list |
| getStudentById(id) | GET /view-students/:id | Single student |
| updateStudentStatus(id, status) | PUT /view-students/:id/status | Ban/unban |
| getStudentHistory(id) | GET /view-students/:id/history | Student history |

---

## Priority Test Checklist

### Critical Path (Must Test)
- [ ] User Registration -> Email Verification -> Login
- [ ] Start Test -> Answer Questions -> Submit -> View Results
- [ ] Admin: Approve Questions -> Students See in Tests
- [ ] Payment Flow for Paid Tests
- [ ] Token Expiry Handling

### High Priority
- [ ] All Question Types Rendering
- [ ] Test Timer Accuracy
- [ ] Auto-submit on Timeout
- [ ] Leaderboard Rankings
- [ ] Student Ban/Unban

### Medium Priority
- [ ] Theme Toggle
- [ ] Toast Notifications
- [ ] Pagination
- [ ] Form Validations
- [ ] Mobile Responsive

### Low Priority
- [ ] Profile Edit
- [ ] Password Change
- [ ] Category Performance Analytics
- [ ] Daily Trends Chart
