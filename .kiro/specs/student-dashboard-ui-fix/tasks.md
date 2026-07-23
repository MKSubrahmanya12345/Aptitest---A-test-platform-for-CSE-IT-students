# Implementation Plan

- [-] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Harsh Styling, Broken Hamburger, and CSS Conflicts
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing cases

  **Bug 1 — Harsh Styling (B1):**
  - Mount `StudentDashboard` in a Vitest + React Testing Library (jsdom) harness
  - Assert `getComputedStyle(avatarEl).borderRadius !== "0px"` — expect FAIL (avatar is a square, not a circle)
  - Assert `getComputedStyle(templateCardEl).borderRadius !== "0px"` — expect FAIL (sharp card corners)
  - Assert that `.student-sidebar` computed background does NOT contain `#1e1b4b` — expect FAIL (harsh dark-navy)
  - Assert `getComputedStyle(timerBoxEl).borderRadius !== "0px"` — expect FAIL
  - Assert `getComputedStyle(modalEl).borderRadius !== "0px"` — expect FAIL
  - Assert `getComputedStyle(buttonEl).borderRadius !== "0px"` — expect FAIL (all buttons sharp)
  - isBugCondition_B1: any render of the student dashboard where `student.css` sets `border-radius: 0` on cards/buttons/avatar OR uses `#1e1b4b`/`#312e81` sidebar gradient

  **Bug 2 — Broken Hamburger Menu (B2):**
  - Set viewport to 375 px, render `StudentDashboard` with `currentView = "test_environment"`
  - Assert a `.mobile-header` containing a "Test In Progress" label is present in the DOM — expect FAIL (no such label)
  - Assert the hamburger `<button>` is absent or disabled in test_environment view — expect FAIL (hamburger is active but pointless)
  - isBugCondition_B2: viewport ≤ 768 px AND `currentView === "test_environment"` → sidebar removed from DOM, hamburger is a dead control

  **Bug 3 — CSS Conflicts (B3):**
  - Parse (or read) loaded stylesheets; assert `* { margin: 0 }` appears in at most one CSS file — expect FAIL (duplicated in auth.css, login.css, signup.css)
  - Render `Login.jsx`; assert `.login-card` computed `border-radius` is NOT `0px` — expect FAIL (auth.css overrides to 0)
  - Render `Signup.jsx`; assert `.signup-card` has a single consistent non-zero `border-radius` — expect FAIL (conflicting 16px vs 0)
  - isBugCondition_B3: signup page → competing `border-radius: 16px` (signup.css) vs `border-radius: 0` (auth.css); login page → duplicate `* { margin:0 }` resets

  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found:
    - B1: `borderRadius` of avatar = "0px", sidebar background contains "#1e1b4b"
    - B2: No "Test In Progress" label in DOM; hamburger button is clickable with no sidebar target
    - B3: `* { margin: 0 }` found in 3 CSS files; `.login-card` borderRadius = "0px"
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [~] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Existing Behaviors Unchanged Across Desktop, Test Logic, Auth, and Admin
  - **IMPORTANT**: Follow observation-first methodology
  - **Observe behavior on UNFIXED code for non-buggy inputs, then write property tests**

  **Observe and record on unfixed code:**
  - Observe: Desktop viewport (> 768 px) + `currentView = "test_environment"` → `.mobile-header` has `display: none`, `.test-layout` grid renders with two columns — record this baseline
  - Observe: `handleSelectOption(qId, optKey)` → calls `saveAnswerToServer` and updates `answers` state — record this baseline
  - Observe: `timeLeft` countdown reaches 0 → `handleForceSubmit` is called, `currentView` changes to `"results"` — record baseline
  - Observe: `handleLogout()` → `localStorage` cleared, `navigate("/login")` called — record baseline
  - Observe: `user.status === "banned"` → `showBannedModal` is `true` on mount; test-launch attempts blocked — record baseline
  - Observe: Admin pages render with `admin.css` styles intact; `admin-sidebar` has `#1e1b4b` gradient — record baseline
  - Observe: Click `.sidebar-overlay` on mobile → `setSidebarOpen(false)` called, `body.sidebar-open` class removed — record baseline
  - Observe: `keydown` with `key = "Escape"` → `setSidebarOpen(false)` called — record baseline

  **Write property-based tests capturing observed behavior:**
  - **Pres-1**: Property-based test generates random `currentView` × viewport > 768 px combinations; asserts `.mobile-header` has `display: none` in all cases (CSS media query behavior)
  - **Pres-2**: Property-based test generates random (qId, optionKey) pairs; asserts `handleSelectOption` always calls `saveAnswerToServer` with matching args and updates `answers` state
  - **Pres-3**: Property-based test simulates timer reaching 0; asserts `handleForceSubmit` is invoked and `currentView` transitions to `"results"`
  - **Pres-4**: Asserts `handleLogout` clears `localStorage` and triggers navigation to `/login`
  - **Pres-5**: Given `user.status = "banned"`, asserts `showBannedModal = true` on mount; asserts `handleLaunchChecklist` does NOT start a test
  - **Pres-6**: Property-based test generates random sidebar open/close sequences; asserts `body.sidebar-open` class always tracks `sidebarOpen` state; asserts clicking `.sidebar-overlay` sets `sidebarOpen = false`
  - **Pres-7**: Simulates `keydown Escape`; asserts `sidebarOpen` becomes `false`
  - **Pres-8**: Renders `AdminLayout`; asserts `admin.css` custom properties (e.g., `--a-primary`) are applied and `admin-sidebar` gradient still uses `#1e1b4b`

  - Run all preservation tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 3. Fix for harsh styling, broken hamburger menu, and CSS conflicts

  - [~] 3.1 Update `client/src/styles/student.css` — add border-radius tokens and soft palette
    - Add border-radius CSS custom properties to `:root`:
      ```css
      --s-radius-sm: 6px;
      --s-radius-md: 10px;
      --s-radius-lg: 14px;
      --s-radius-xl: 18px;
      --s-radius-full: 9999px;
      ```
    - Add softened sidebar palette tokens to `:root`:
      ```css
      --s-sidebar-from: #3b3a8f;
      --s-sidebar-to:   #4f48d0;
      ```
    - Soften primary accent tokens:
      ```css
      --s-primary: #6366f1;
      --s-primary-dark: #4f46e5;
      --s-primary-darker: #4338ca;
      ```
    - Replace `.student-sidebar` gradient: `background: linear-gradient(180deg, var(--s-sidebar-from) 0%, var(--s-sidebar-to) 100%)`; update `border-right-color` to `var(--s-sidebar-from)`
    - Apply `border-radius: 50%` to `.user-avatar-circle`
    - Apply `var(--s-radius-lg)` to: `.template-card`, `.category-card`, `.stat-widget`, `.stats-card`, `.checklist-modal`, `.checklist-modal-header`, `.dashboard-welcome`, `.history-table-container`, `.leaderboard-container`, `.review-question-card`, `.test-main-content`, `.test-sidebar`
    - Apply `var(--s-radius-md)` to: `.timer-box`, `.session-id-text`, `.passage-section`, `.answer-comparison-box`, `.solution-box-student`, `.alert-banner-error`, `.banned-banner`, `.sidebar-hint-text`
    - Apply `var(--s-radius-sm)` to: `.btn-launch-template`, `.btn-nav-action`, `.btn-submit-test`, `.btn-checklist-start`, `.btn-checklist-cancel`, `.btn-history-action`, `.btn-start-test`, `.logout-button`, `.grid-btn`, `.ranking-toggle-btn`, `.hamburger`, `.checklist-close`, `.option-btn-student`, `.option-badge-student`, `.fraction-input-box`, `.ratio-input-box`, `.student-input-text`, `.tag`, `.template-badge`, `.status-badge`, `.category-status-badge`, `.you-badge`, `.rank-badge`, `.tag-reattempt`, `.tag-fresh`, `.tag-status-completed`, `.tag-status-pending`
    - Apply `var(--s-radius-full)` to `.category-progress-track` and `.category-progress-fill`
    - Fix z-index stacking: add `isolation: isolate` to `.student-main`
    - In the `@media (max-width: 768px)` block, raise `.student-sidebar` z-index from `1000` to `1100`; set `.sidebar-overlay` to `z-index: 1050`
    - Add `.mobile-test-label` style:
      ```css
      .mobile-test-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--s-warning);
        background: var(--s-warning-soft);
        border: 1px solid var(--s-warning);
        padding: 4px 10px;
        border-radius: var(--s-radius-sm);
      }
      ```
    - _Bug_Condition: isBugCondition_B1 — student.css border-radius: 0 on all elements OR sidebar uses #1e1b4b/#312e81 gradient OR --s-primary is #4f46e5_
    - _Expected_Behavior: Property 1 — soft rounded corners (cards 14px, buttons/inputs 6px, avatar 50%) and muted sidebar gradient (#3b3a8f → #4f48d0)_
    - _Preservation: student.css changes must not affect admin.css, AdminLayout.jsx, or any admin page — only student-facing selectors are touched_
    - _Requirements: 2.1, 2.2_

  - [~] 3.2 Update `client/src/pages/StudentDashboard.jsx` — fix mobile header for test_environment view
    - Locate the `.mobile-header` JSX block (currently renders hamburger button unconditionally)
    - Replace the hamburger button with a conditional:
      - When `currentView !== "test_environment"`: render the hamburger `<button>` as-is (existing SVG, `onClick`, `aria-label`, `aria-expanded`)
      - When `currentView === "test_environment"`: render `<span className="mobile-test-label">Test In Progress</span>` instead of the hamburger button
    - Update the `<h2>` inside `.mobile-header` to show `"Practice Test"` when `currentView === "test_environment"`, and `"AptiTest Hub"` otherwise
    - The `.mobile-header` div itself remains unconditional (always rendered) — no change to the wrapping element
    - The sidebar conditional `{currentView !== "test_environment" && <div className="student-sidebar">…</div>}` remains unchanged — sidebar is intentionally absent during test
    - The `.sidebar-overlay` conditional remains unchanged
    - _Bug_Condition: isBugCondition_B2 — viewport ≤ 768 px AND currentView === "test_environment" → hamburger is present but sidebar is not in DOM, and no test-mode label is shown_
    - _Expected_Behavior: Property 2 — mobile header always visible; in test_environment shows "Test In Progress" label and hides hamburger; in all other views shows hamburger as before_
    - _Preservation: Hamburger behavior for all non-test_environment views must be identical to before; sidebar open/close, overlay, Escape key, and body scroll lock logic must be untouched_
    - _Requirements: 2.3, 2.4_

  - [~] 3.3 Update `client/src/styles/auth.css` — soft indigo palette, unified card radius, remove gridline overlay
    - Replace page background gradient on `.login-page` and `.signup-page`:
      - From: `background: linear-gradient(180deg, #0f2c5e 0%, #1a4ba0 60%, #1a4ba0 100%)`
      - To: `background: linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)`
    - Remove the `.login-page::before, .signup-page::before` gridline pseudo-element block entirely (the `repeating-linear-gradient` overlay)
    - Update `.login-card, .signup-card` shared rules:
      - `border-radius: 14px` (was `border-radius: 0`)
      - `border-top: 4px solid #6366f1` (replace amber `#fbbf24` with soft indigo)
      - `box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12)` (replace the dark shadow)
    - Update `.login-card h1, .signup-card h1` heading strip gradient:
      - From: `background: linear-gradient(180deg, #0f2c5e 0%, #1a4ba0 100%)`
      - To: `background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)`
    - Add border-radius to inputs and button:
      - `.login-card input, .signup-card input { border-radius: 8px; }`
      - `.login-card button, .signup-card button { border-radius: 8px; }`
    - _Bug_Condition: isBugCondition_B3 — auth.css border-radius: 0 on cards conflicts with signup.css border-radius: 16px; dark-navy gradient is visually incompatible with dashboard; gridline overlay is harsh_
    - _Expected_Behavior: Property 3 — single authoritative card style (border-radius: 14px, soft indigo accent) applied from auth.css; cohesive light palette compatible with student dashboard_
    - _Preservation: auth.css continues to be the shared stylesheet for both Login.jsx and Signup.jsx; body reset and font-family declarations remain; responsive breakpoints unchanged_
    - _Requirements: 2.5, 2.6_

  - [~] 3.4 Update `client/src/styles/login.css` — strip duplicate reset and body block
    - Remove the entire `* { margin: 0; padding: 0; box-sizing: border-box; }` block at the top
    - Remove the entire `body { font-family: …; background: …; min-height: … }` block
    - Remove all `.login-card` and `.login-page` rules that are already covered by `auth.css` (card layout, border, border-radius, box-shadow, flex-direction, gap, animation)
    - If the consolidated file becomes empty or only has responsive `@media` overrides that are now redundant, replace the entire file content with a single comment: `/* Styles consolidated into auth.css — this file is intentionally minimal */`
    - The `import` of `login.css` in `Login.jsx` may remain; an empty or comment-only CSS file is harmless
    - _Bug_Condition: isBugCondition_B3 — login.css defines its own * reset and body block that conflict with auth.css; dark glassmorphism card is visually incompatible with the dashboard_
    - _Expected_Behavior: Property 3 — single * reset in auth.css; login page card styled entirely by auth.css with no overrides from login.css_
    - _Preservation: Login.jsx import of login.css may remain; no logic or JSX changes in Login.jsx_
    - _Requirements: 2.5, 2.6_

  - [~] 3.5 Update `client/src/styles/signup.css` — strip duplicate reset, body block, and competing border-radius
    - Remove the entire `* { margin: 0; padding: 0; box-sizing: border-box; }` block
    - Remove the entire `body { font-family: …; background: … }` block
    - Remove `.signup-card { border-radius: 16px; … }` and all other `.signup-card` rules already present in `auth.css` (background, box-shadow, flex-direction, gap, padding, width)
    - Remove `.signup-page` layout rules already handled by `auth.css` (width, height, display, justify-content, align-items)
    - If the consolidated file becomes empty, replace the entire file content with: `/* Styles consolidated into auth.css — this file is intentionally minimal */`
    - _Bug_Condition: isBugCondition_B3 — signup.css border-radius: 16px conflicts with auth.css border-radius: 0 on .signup-card; duplicate * reset causes cascade-order dependency_
    - _Expected_Behavior: Property 3 — single border-radius declaration on .signup-card from auth.css (14px); no duplicate resets_
    - _Preservation: Signup.jsx import of signup.css may remain; no logic or JSX changes in Signup.jsx_
    - _Requirements: 2.5, 2.6_

  - [~] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Soft Styling, Fixed Hamburger, No CSS Conflicts
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Re-run B1 assertions: avatar `border-radius` = `50%`; template card `border-radius` ≥ 10px; sidebar background does not contain `#1e1b4b`; timer box and modal `border-radius` > 0
    - Re-run B2 assertions: mobile + test_environment → "Test In Progress" label in DOM; hamburger button absent or disabled
    - Re-run B3 assertions: `* { margin: 0 }` in at most one CSS file; `.login-card` and `.signup-card` `border-radius` > 0
    - **EXPECTED OUTCOME**: All tests PASS (confirms all three bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [~] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - All Existing Behaviors Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all Pres-1 through Pres-8 property tests
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Key checks:
      - Desktop test layout still renders two-column grid with no mobile-header intrusion (Pres-1, req 3.1)
      - MCQ option selection still calls `saveAnswerToServer` (Pres-2, req 3.2)
      - Timer auto-submit still fires `handleForceSubmit` (Pres-3, req 3.3)
      - Logout still clears localStorage (Pres-4, req 3.4)
      - Banned user modal still blocks tests (Pres-5, req 3.5)
      - Admin pages unaffected — `admin.css` and `AdminLayout.jsx` untouched (Pres-8, req 3.6)
      - Sidebar overlay still closes drawer (Pres-6, req 3.7)
      - Escape key still closes sidebar (Pres-7, req 3.8)

- [~] 4. Checkpoint — Ensure all tests pass
  - Run the full test suite (`vitest --run` or equivalent) and verify all tests are green
  - Confirm no TypeScript or ESLint errors in the five modified files:
    - `client/src/styles/student.css`
    - `client/src/pages/StudentDashboard.jsx`
    - `client/src/styles/auth.css`
    - `client/src/styles/login.css`
    - `client/src/styles/signup.css`
  - Confirm no admin files were modified: `admin.css` and `AdminLayout.jsx` must be unchanged
  - Do a visual spot-check (or snapshot test) of the student dashboard, login page, and signup page to confirm the soft-indigo palette, rounded corners, and test-mode mobile header all render correctly
  - Ask the user if any questions or edge cases arise before closing the spec
