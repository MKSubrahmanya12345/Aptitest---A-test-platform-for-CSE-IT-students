# Student Dashboard UI Fix — Bugfix Design

## Overview

Three interconnected UI bugs degrade the student experience in AptiTest. This design formalizes
the fix strategy, defines the bug conditions precisely, and plans the validation approach.

**Bug 1 — Harsh styling**: `student.css` hardcodes `border-radius: 0` everywhere and uses a
deep-navy/indigo gradient sidebar (`#1e1b4b → #312e81`) with high-saturation accents. The fix
replaces the color tokens and adds border-radius tokens throughout.

**Bug 2 — Broken hamburger menu**: The `.mobile-header` already renders unconditionally in the
JSX, but the sidebar itself is conditionally removed from the DOM when `currentView ===
"test_environment"`. On mobile this leaves the hamburger with nothing to toggle. Additionally,
the sidebar z-index (1000) can lose to `.student-main` stacking context on some browsers. The
fix keeps the mobile header always visible and adds a test-mode label when the sidebar is absent,
and hardens the z-index / `isolation` rules.

**Bug 3 — Cross-page CSS conflicts**: `login.css` and `signup.css` each define their own
`* { margin: 0; padding: 0 }` and `body { … }` resets that fight with `auth.css`. The signup
card receives competing `border-radius` values (16 px vs 0). The login card's dark glassmorphism
aesthetic is visually incompatible with the bright dashboard. The fix consolidates resets into
`auth.css`, strips redundant declarations from `login.css` and `signup.css`, and aligns the
auth pages to the shared soft-indigo palette.

All admin-facing files (`admin.css`, `AdminLayout.jsx`) are out of scope and must not be touched.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs / render contexts that trigger one of the three bugs.
- **Property (P)**: The observable correct behavior that must hold after the fix for any input
  satisfying C.
- **Preservation**: All observable behaviors for inputs **not** in C that must remain identical
  before and after the fix.
- **`student.css`**: The CSS module at `client/src/styles/student.css` that styles the student
  dashboard; the primary target for Bugs 1 and 2.
- **`auth.css`**: Shared stylesheet at `client/src/styles/auth.css` imported by `Login.jsx` and
  `Signup.jsx`; primary target for Bug 3.
- **`login.css` / `signup.css`**: Page-scoped stylesheets at `client/src/styles/login.css` and
  `client/src/styles/signup.css`; need de-duplication for Bug 3.
- **`StudentDashboard.jsx`**: The single-page component at `client/src/pages/StudentDashboard.jsx`
  that renders the dashboard, test environment, history, results, and leaderboard views.
- **`currentView`**: React state in `StudentDashboard.jsx` that switches between `"dashboard"`,
  `"history"`, `"leaderboard"`, `"test_environment"`, and `"results"`.
- **`sidebarOpen`**: React state boolean controlling whether the sidebar drawer is open on mobile.
- **`border-radius` token**: A CSS custom property used to enforce consistent corner rounding.
- **soft palette**: The replacement color set — muted slate-indigo sidebar, pastel surface colors,
  and reduced primary accent saturation — defined as updated `:root` custom properties in
  `student.css`.

---

## Bug Details

### Bug Condition

The three bugs share a single overarching condition: the **student-facing UI is in an incorrect
visual or interactive state relative to its specification**. Each sub-condition is formalized
separately below.

#### Bug 1 — Harsh Styling

```
FUNCTION isBugCondition_B1(renderContext)
  INPUT: renderContext — any render of the student dashboard on any viewport
  OUTPUT: boolean

  RETURN student.css defines border-radius: 0 on cards/buttons/inputs/avatar
         OR  student.css sidebar background uses #1e1b4b / #312e81 gradient
         OR  student.css --s-primary is #4f46e5 (high-saturation indigo)
END FUNCTION
```

**Concrete examples:**
- `.user-avatar-circle` renders as a square (0 radius) instead of a circle (50%).
- `.template-card` has sharp 90° corners instead of the expected ~12 px rounded card.
- `.student-sidebar` gradient stops at `#1e1b4b` making the sidebar feel harsh and institutional.
- `.stat-widget`, `.checklist-modal`, `.timer-box` all render with zero rounding.

#### Bug 2 — Broken Hamburger Menu

```
FUNCTION isBugCondition_B2(viewport, currentView)
  INPUT: viewport — current browser width in px; currentView — active React view string
  OUTPUT: boolean

  IF viewport <= 768
    IF currentView = "test_environment"
      RETURN true   -- sidebar removed from DOM, hamburger useless / context lost
    END IF
    IF sidebarOpen = true AND sidebar z-index does not stack above .student-main
      RETURN true   -- overlay/drawer hidden behind content area
    END IF
  END IF
  RETURN false
END FUNCTION
```

**Concrete examples:**
- Student on a 375 px phone starts a test: the sidebar is not in the DOM, the hamburger has
  nothing to toggle, and no top-bar label says "Test in Progress".
- Student opens the sidebar drawer; the drawer slides in but is partially obscured by a form
  or card in the main content area (z-index race condition on browsers that create new stacking
  contexts from `transform` or `will-change`).

#### Bug 3 — Cross-page CSS Conflicts

```
FUNCTION isBugCondition_B3(pageRendered, browserEngine)
  INPUT: pageRendered — "login" | "signup"; browserEngine — any
  OUTPUT: boolean

  IF pageRendered = "signup"
    RETURN signup.css border-radius: 16px conflicts with auth.css border-radius: 0
           OR  two competing * { margin: 0 } resets exist in loaded stylesheets
  END IF
  IF pageRendered = "login"
    RETURN login.css dark glassmorphism (border-radius: 24px, backdrop-filter)
           conflicts with dashboard bright white theme
           OR  two competing body { } declarations loaded simultaneously
  END IF
  RETURN false
END FUNCTION
```

**Concrete examples:**
- On some browsers the signup card renders with `border-radius: 0` (auth.css wins specificity
  war) even though the design intent is rounded corners.
- A student logs in and sees a dark-blurred card, then lands on a stark white dashboard —
  jarring visual discontinuity.
- Both `signup.css` and `auth.css` declare `* { margin:0; padding:0 }`, causing cascade order
  dependency bugs when bundlers reorder stylesheets.

---

## Expected Behavior

### Preservation Requirements

The following behaviors exist on unfixed code and must remain **exactly the same** after the fix.

**Unchanged Behaviors:**

- (3.1) Desktop test environment renders the two-column `test-layout` grid with no mobile-header
  intrusion; the sidebar navigation block is not shown during a test session.
- (3.2) Selecting an MCQ option highlights it with the primary accent and calls
  `saveAnswerToServer` — answer persistence logic is unaffected by CSS or JSX structural changes.
- (3.3) When `timeLeft` reaches 0 the `handleForceSubmit` callback fires and the view transitions
  to `"results"`.
- (3.4) Logging out clears `localStorage` and navigates to `/login`.
- (3.5) Banned students see the banned banner on the dashboard and the banned modal on test-launch
  attempts; they cannot start new tests.
- (3.6) All admin pages continue to use `admin.css` and `AdminLayout.jsx` without any visual
  regressions — no admin file is modified.
- (3.7) Tapping the sidebar overlay on mobile closes the sidebar and restores body scroll
  (existing `onClick={() => setSidebarOpen(false)}` on `.sidebar-overlay`).
- (3.8) Pressing Escape while the sidebar is open closes it via the existing `keydown` listener.

**Scope of Non-Bug Inputs:**
All inputs that do NOT satisfy any of the three bug conditions above must produce identical
behavior before and after the fix. This includes:
- Desktop viewport rendering of all dashboard views.
- All mouse/pointer and keyboard interactions with test controls (option buttons, navigation
  buttons, submit, flag, question grid).
- Timer countdown behavior.
- Leaderboard, history, and results views rendered at any viewport.
- Admin dashboard navigation and all admin pages.

**Note:** The precise correct output for inputs that DO satisfy the bug conditions is defined
in the Correctness Properties section below.

---

## Hypothesized Root Cause

### Bug 1 — Harsh Styling

1. **Deliberate "NTA-style" comment left in place**: The file header says `Sharp edges kept
   (0px radius) per your request` and every element explicitly overrides or omits `border-radius`.
   The `:root` block has no `--s-radius-*` tokens, so there is nothing to override globally.

2. **Deep-navy gradient is hard-coded on `.student-sidebar`**: The `background` property uses
   raw hex values (`#1e1b4b → #312e81`) rather than CSS variables, making it impossible to
   adjust the palette without touching every selector.

3. **High-saturation `--s-primary: #4f46e5`** is applied to interactive surfaces (buttons,
   table headers, modal headers, timer box) producing harsh contrast against white backgrounds.

### Bug 2 — Broken Hamburger Menu

1. **Sidebar conditionally excluded from the DOM** (`{currentView !== "test_environment" && <div className="student-sidebar">…</div>}`).
   When the sidebar is absent, the hamburger button in `.mobile-header` becomes a dead control
   with no target element. The mobile header itself always renders (it is not inside the
   conditional block), but clicking the hamburger during a test does nothing useful.

2. **No test-mode top-bar label**: There is no visual indicator in `"test_environment"` view
   on mobile that a test is in progress. The `.student-header` is present but it is inside
   `.student-main` which starts below any mobile-header-equivalent — the test layout takes
   over the full viewport and the `.student-header` is the only persistent label, but it is
   not sticky on mobile.

3. **Z-index stacking context issue**: `.student-main` does not explicitly set `isolation:
   auto` or `position: static`, but descendant elements (e.g., test-layout grid with sticky
   `.test-sidebar`) may create new stacking contexts that compete with the `.student-sidebar`
   at z-index 1000. On browsers that promote `position: sticky` children, the sidebar can
   appear behind sticky content.

### Bug 3 — Cross-page CSS Conflicts

1. **Three files own the `*` reset and `body` declaration**: `auth.css`, `login.css`, and
   `signup.css` each declare `* { margin: 0; padding: 0; box-sizing: border-box }` and
   `body { … }`. The last-loaded file wins, and bundler output order is not guaranteed across
   builds.

2. **Competing `border-radius` on `.signup-card`**: `signup.css` sets `border-radius: 16px`
   while `auth.css` sets `border-radius: 0`. Both rules have the same specificity
   (single class selector), so the outcome depends purely on stylesheet load order — a
   non-deterministic conflict.

3. **`login.css` dark-glassmorphism is stylistically incompatible**: `login.css` was written
   independently from `auth.css`. It sets `background: linear-gradient(135deg, #0f172a …)`
   on `body` and uses `backdrop-filter: blur(16px)` on `.login-card`. `auth.css` separately
   sets a navy gradient on `.login-page`. Neither coordinates with the student dashboard's
   bright `#f8fafc` background, producing a jarring transition on login.

---

## Correctness Properties

Property 1: Bug Condition B1 — Soft Visual Palette and Rounded Corners

_For any_ render of the student dashboard (any view, any viewport), the fixed `student.css`
SHALL apply soft rounded corners (cards/modals `border-radius: 12px`, buttons/inputs
`border-radius: 8px`, avatar `border-radius: 50%`) and a muted indigo/slate sidebar palette
(`--s-sidebar-from: #3730a3`, `--s-sidebar-to: #4338ca` or equivalent lighter tones), replacing
the `#1e1b4b → #312e81` gradient and all zero-radius declarations.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition B2 — Mobile Header Always Rendered with Contextual Label

_For any_ mobile viewport (≤ 768 px) where `currentView === "test_environment"`, the fixed
`StudentDashboard.jsx` SHALL render a visible top-bar element containing at minimum a label
indicating "Test in Progress" so the student always has visual context, even though the sidebar
navigation links are intentionally absent during a test.

_For any_ mobile viewport where the sidebar drawer is open, the fixed `student.css` SHALL
ensure the `.student-sidebar` element stacks above all `.student-main` descendants (sidebar
z-index SHALL be higher than any stacking context created by sticky or transformed descendants).

**Validates: Requirements 2.3, 2.4**

Property 3: Bug Condition B3 — Single Authoritative Reset and Cohesive Auth Palette

_For any_ render of the login or signup page, the fixed stylesheets SHALL apply exactly one
`* { margin: 0; padding: 0; box-sizing: border-box }` reset (defined only in `auth.css`),
exactly one `border-radius` declaration on `.login-card` and `.signup-card` (defined only in
`auth.css`), and a shared soft-indigo color palette that is visually compatible with the student
dashboard's color language.

**Validates: Requirements 2.5, 2.6**

Property 4: Preservation — All Existing Behaviors Unchanged

_For any_ input where none of the three bug conditions hold (non-buggy inputs as defined in
§ Expected Behavior Preservation Requirements), the fixed code SHALL produce exactly the same
behavior as the original code across all regression scenarios 3.1–3.8.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

---

## Fix Implementation

### Changes Required

Assuming root-cause analysis is correct:

---

#### File 1: `client/src/styles/student.css`

**Function / Scope**: Global CSS custom properties and all student-dashboard class rules.

**Specific Changes:**

1. **Add border-radius tokens to `:root`**
   ```css
   --s-radius-sm: 6px;
   --s-radius-md: 10px;
   --s-radius-lg: 14px;
   --s-radius-xl: 18px;
   --s-radius-full: 9999px;
   ```
   Apply these tokens consistently:
   - Cards/modals: `var(--s-radius-lg)` (14 px)
   - Buttons/inputs/tags/badges: `var(--s-radius-sm)` (6 px)
   - Avatar circle (`.user-avatar-circle`): `border-radius: 50%`
   - Progress bar track/fill: `var(--s-radius-full)`
   - Timer box: `var(--s-radius-md)`

2. **Replace sidebar gradient palette tokens**
   Add to `:root`:
   ```css
   --s-sidebar-from: #3b3a8f;  /* muted indigo — replaces #1e1b4b */
   --s-sidebar-to:   #4f48d0;  /* softer mid-indigo — replaces #312e81 */
   ```
   Update `.student-sidebar`:
   ```css
   background: linear-gradient(180deg, var(--s-sidebar-from) 0%, var(--s-sidebar-to) 100%);
   border-right-color: var(--s-sidebar-from);
   ```

3. **Soften primary accent token**
   Change:
   ```css
   --s-primary: #6366f1;          /* was #4f46e5 — lower saturation */
   --s-primary-dark: #4f46e5;     /* was #4338ca */
   --s-primary-darker: #4338ca;   /* was #3730a3 */
   --s-primary-soft: #eef2ff;     /* unchanged */
   ```

4. **Apply border-radius to all affected selectors** — a non-exhaustive list of selectors
   that currently have implicit or explicit `border-radius: 0` and must be updated:
   - `.template-card`, `.category-card`, `.stat-widget`, `.stats-card`
   - `.checklist-modal`, `.checklist-modal-header`
   - `.test-sidebar`, `.test-main-content`, `.timer-box`
   - `.option-btn-student`, `.option-badge-student`
   - `.btn-launch-template`, `.btn-nav-action`, `.btn-submit-test`, `.btn-checklist-start`,
     `.btn-checklist-cancel`, `.btn-history-action`, `.btn-start-test`, `.logout-button`,
     `.grid-btn`, `.ranking-toggle-btn`
   - `.student-input-text`, `.fraction-input-box`, `.ratio-input-box`
   - `.tag`, `.template-badge`, `.status-badge`, `.category-status-badge`, `.you-badge`,
     `.rank-badge`, `.tag-reattempt`, `.tag-fresh`, `.tag-status-completed`,
     `.tag-status-pending`
   - `.session-id-text`, `.passage-section`, `.sidebar-hint-text`, `.solution-box-student`,
     `.alert-banner-error`, `.banned-banner`
   - `.history-table-container`, `.leaderboard-container`, `.ranking-toggle-container`
   - `.hamburger`, `.checklist-close`
   - `.dashboard-welcome`

5. **Fix z-index stacking for mobile sidebar**
   Add to `.student-main`:
   ```css
   isolation: isolate;
   ```
   Change `.student-sidebar` z-index in the mobile media query from `1000` to `1100` so it
   reliably clears any stacking contexts promoted by sticky descendants inside `.student-main`.
   Keep `.sidebar-overlay` at `z-index: 1050` (between content and sidebar).

---

#### File 2: `client/src/pages/StudentDashboard.jsx`

**Function / Scope**: The `.mobile-header` render path and the `"test_environment"` conditional.

**Specific Changes:**

1. **Lift `.mobile-header` and sidebar-overlay outside the `currentView` conditional**
   The `.mobile-header` is already unconditionally rendered — no change needed there.
   The sidebar-overlay (`{sidebarOpen && <div className="sidebar-overlay" …/>}`) is also
   already outside the conditional block — no change needed.

2. **Add test-mode label to `.mobile-header` when `currentView === "test_environment"`**
   Currently `.mobile-header` always shows the hamburger and the title "AptiTest Hub".
   Change it so that when `currentView === "test_environment"`:
   - The hamburger button is hidden (or rendered as `aria-hidden` and `disabled`) because
     there is no sidebar to open.
   - A centered label such as `"Test In Progress"` replaces the hamburger slot, providing
     context to mobile users.

   Pseudocode for the JSX change:
   ```jsx
   <div className="mobile-header">
     {currentView !== "test_environment" ? (
       <button className="hamburger" onClick={...} aria-label={...} aria-expanded={...}>
         {/* existing SVG */}
       </button>
     ) : (
       <span className="mobile-test-label">Test In Progress</span>
     )}
     <h2>
       {currentView === "test_environment" ? "Practice Test" : "AptiTest Hub"}
     </h2>
   </div>
   ```

3. **Add `.mobile-test-label` style to `student.css`**
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

---

#### File 3: `client/src/styles/auth.css`

**Function / Scope**: Shared auth stylesheet — the authoritative source for login/signup styling.

**Specific Changes:**

1. **Keep the single `* { box-sizing }` reset** — already present. Remove the `margin: 0;
   padding: 0` from the `*` selector here too; rely on the `body` declaration instead to avoid
   conflicting with third-party default styles.  
   *(Or keep it — the key is that `login.css` and `signup.css` no longer duplicate it.)*

2. **Replace the dark-navy page background with a soft indigo gradient**  
   Current: `background: linear-gradient(180deg, #0f2c5e 0%, #1a4ba0 60%, #1a4ba0 100%)`  
   Replacement:
   ```css
   background: linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%);
   ```
   This is bright, soft indigo — cohesive with the student dashboard's `--s-primary-soft` palette.

3. **Unify card styling** — update `.login-card` and `.signup-card` to use shared tokens:
   ```css
   border-radius: 14px;          /* was 0 — matches --s-radius-lg */
   border-top: 4px solid #6366f1; /* soft indigo accent, replaces amber #fbbf24 */
   box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
   background: #ffffff;
   ```

4. **Update card heading** — the `h1` gradient strip (`#0f2c5e → #1a4ba0`) transitions to a
   soft indigo:
   ```css
   background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
   ```

5. **Apply border-radius to inputs and button**:
   ```css
   .login-card input, .signup-card input { border-radius: 8px; }
   .login-card button, .signup-card button { border-radius: 8px; }
   ```

6. **Remove the gridline `::before` overlay** — the repeating-linear-gradient pseudo element
   looks harsh against the new soft background; remove it.

---

#### File 4: `client/src/styles/login.css`

**Specific Changes:**

1. **Remove the entire `* { margin: 0; padding: 0; box-sizing }` block** — `auth.css` owns this.
2. **Remove the `body { … }` block** — `auth.css` owns this.
3. **Remove all `.login-card` and `.login-page` rules that are already covered by `auth.css`**
   to eliminate the specificity conflict. `login.css` becomes either empty or contains only
   truely page-unique overrides (none exist after consolidation — the file can be reduced to a
   comment noting that `auth.css` is the authoritative source).
4. Alternatively, if the file cannot be deleted (import exists in `Login.jsx`), leave it as an
   empty file or a single comment: `/* Styles consolidated into auth.css */`.

---

#### File 5: `client/src/styles/signup.css`

**Specific Changes:**

1. **Remove the `* { margin: 0; padding: 0; box-sizing }` block** — `auth.css` owns this.
2. **Remove the `body { … }` block** — `auth.css` owns this.
3. **Remove `.signup-card { border-radius: 16px }` and all other rules already present in
   `auth.css`** to eliminate the competing declaration.
4. Same as `login.css` — the file either becomes empty or is a pass-through comment.

---

## Testing Strategy

### Validation Approach

Testing follows two phases:

1. **Exploratory / Bug Condition Checking** — run tests on the *unfixed* code to observe
   failures and confirm root causes before writing the fix.
2. **Fix + Preservation Checking** — after the fix, verify that bug-condition inputs now pass
   and non-buggy inputs are unaffected.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs on unfixed code. Confirm or refute
the root cause analysis before implementing changes.

**Test Plan**: Mount `StudentDashboard` in a test harness (e.g., Vitest + React Testing Library)
with `jsdom`. Use `getComputedStyle` or snapshot matching to assert computed CSS properties and
JSX structure. Run these tests against the *current* codebase to observe failures.

**Test Cases:**

1. **B1-Explore-1 — Avatar border-radius**: Render `StudentDashboard` in dashboard view;
   assert `getComputedStyle(avatarEl).borderRadius !== "0px"`.
   *(Expected failure on unfixed code: `borderRadius` is 0.)*

2. **B1-Explore-2 — Template card border-radius**: Render a `.template-card` element;
   assert `getComputedStyle(cardEl).borderRadius !== "0px"`.
   *(Expected failure on unfixed code.)*

3. **B1-Explore-3 — Sidebar background**: Assert that `.student-sidebar` computed background
   does NOT contain `#1e1b4b`.
   *(Expected failure on unfixed code.)*

4. **B2-Explore-1 — Test environment mobile header**: Set viewport to 375 px, set
   `currentView = "test_environment"`. Assert that a top-bar with "Test In Progress" label is
   present in the DOM.
   *(Expected failure on unfixed code: no such label exists.)*

5. **B2-Explore-2 — Hamburger with sidebar absent**: In `"test_environment"` view on mobile,
   assert that the hamburger button is disabled or absent (clicking it should not set
   `sidebarOpen = true` uselessly).
   *(Expected failure on unfixed code: hamburger is clickable but has no effect.)*

6. **B3-Explore-1 — Duplicate reset rules**: Parse loaded stylesheets; assert that `* { margin:
   0 }` appears in at most one loaded CSS module (not in both `auth.css` and `login.css`/
   `signup.css`).
   *(Expected failure on unfixed code: duplicates exist.)*

7. **B3-Explore-2 — Login card border-radius conflict**: Render `Login.jsx`; assert that
   `.login-card` computed `border-radius` is not `0px` and matches the intended soft value.
   *(Expected failure on unfixed code: `auth.css` sets `border-radius: 0`.)*

**Expected Counterexamples:**
- All border-radius assertions return `0px`.
- No "Test In Progress" label found in DOM for test-environment mobile view.
- Stylesheet parser finds `*{margin:0}` in more than one source file.

---

### Fix Checking

**Goal**: After applying all five file changes, verify that all bug-condition inputs now
produce the correct output.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition_B1(input) OR isBugCondition_B2(input) OR isBugCondition_B3(input) DO
  result := render_fixed(input)
  ASSERT expectedBehavior(result)  -- see Correctness Properties 1, 2, 3
END FOR
```

**Test Cases (run on fixed code):**

1. **B1-Fix-1**: Avatar `border-radius` equals `50%`. PASS expected.
2. **B1-Fix-2**: Template card `border-radius` ≥ 10 px. PASS expected.
3. **B1-Fix-3**: Sidebar gradient does not contain `#1e1b4b`. PASS expected.
4. **B1-Fix-4**: Timer box, modal, buttons all have `border-radius` > 0. PASS expected.
5. **B2-Fix-1**: Mobile + test environment → "Test In Progress" label present. PASS expected.
6. **B2-Fix-2**: Mobile + test environment → hamburger button absent or `disabled`. PASS.
7. **B2-Fix-3**: `student-main` has `isolation: isolate`. PASS expected.
8. **B3-Fix-1**: Single `* { margin: 0 }` reset across all auth stylesheets. PASS expected.
9. **B3-Fix-2**: `.login-card` and `.signup-card` `border-radius` > 0. PASS expected.
10. **B3-Fix-3**: Auth page background is light (luminance > 50%). PASS expected.

---

### Preservation Checking

**Goal**: Verify that for all non-buggy inputs the fixed code produces the same behavior as
the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT (isBugCondition_B1 OR isBugCondition_B2 OR isBugCondition_B3)(input) DO
  ASSERT render_original(input) ≅ render_fixed(input)  -- structurally equivalent
END FOR
```

**Testing Approach**: Property-based testing is well suited here because:
- It automatically generates many input states (random `currentView`, random `viewport`,
  random answer states, random user objects).
- It can verify structural DOM invariants (specific elements always present, no elements
  unexpectedly removed) across a wide input space.
- It provides strong guarantees that behavioral logic (timer, answer selection, API calls)
  is unchanged.

**Test Plan**: First observe baseline behavior on unfixed code for non-bug inputs, then write
property tests that assert the same invariants hold on fixed code.

**Test Cases:**

1. **Pres-1 — MCQ option selection**: Property-based test generates random question IDs and
   option keys; asserts that `handleSelectOption` calls `saveAnswerToServer` and updates
   `answers` state identically on both unfixed and fixed code.

2. **Pres-2 — Timer auto-submit**: Property-based test advances time to 0; asserts
   `handleForceSubmit` is called and `currentView` transitions to `"results"`.

3. **Pres-3 — Logout clears storage**: Assert `localStorage` is empty and `navigate("/login")`
   called after `handleLogout`.

4. **Pres-4 — Banned user modal**: Given `user.status = "banned"`, assert that
   `showBannedModal` is `true` on mount and test-launch attempts are blocked.

5. **Pres-5 — Desktop test layout**: On viewport > 768 px with `currentView = "test_environment"`,
   assert `.mobile-header` is hidden (`display: none`) and `.test-layout` grid renders.

6. **Pres-6 — Sidebar overlay closes sidebar**: Simulate click on `.sidebar-overlay` on mobile;
   assert `sidebarOpen` becomes `false`.

7. **Pres-7 — Escape key closes sidebar**: Simulate `keydown` with `key = "Escape"`; assert
   `sidebarOpen` becomes `false`.

8. **Pres-8 — Admin pages unaffected**: Render `AdminLayout` and assert that `admin.css`
   custom properties (e.g. `--a-primary`) are still applied and `admin-sidebar` uses the
   unchanged `#1e1b4b` gradient.

---

### Unit Tests

- Test that all `:root` token additions in `student.css` are syntactically valid and applied
  (CSS variable resolution test via `getComputedStyle`).
- Test `StudentDashboard` JSX: mobile-header always present in DOM regardless of `currentView`.
- Test that when `currentView === "test_environment"` and viewport ≤ 768 px, the hamburger
  `<button>` is absent/disabled and the test-label `<span>` is present.
- Test `auth.css`: `.login-card` and `.signup-card` computed `border-radius` is non-zero.
- Test that `login.css` and `signup.css` no longer contain `* { margin` or `body {` declarations.

### Property-Based Tests

- Generate 100+ random `currentView` × viewport combinations; assert `.mobile-header` is
  always in the DOM (Property 2).
- Generate random CSS cascade orderings; assert that `border-radius` on `.signup-card` is
  consistently the auth.css value regardless of load order (Property 3).
- Generate random user/answer states; assert that the answer-saving pipeline is unaffected by
  CSS changes (Property 4).
- Generate random sidebar-open/close sequences; assert body scroll lock (`body.sidebar-open`)
  matches `sidebarOpen` state (Property 4, regression 3.7).

### Integration Tests

- Full login → dashboard → test-launch → test-environment → submit → results flow on a
  simulated mobile viewport; assert visual continuity (no broken navigation at any step).
- Full login page render: verify cohesive palette (light background, rounded card, soft indigo
  accent) before navigating to dashboard.
- Signup page render: verify single `border-radius` value applied, no duplicate reset
  side-effects.
- Admin dashboard: navigate to `/admin` and verify `admin.css` styles are intact (sidebar
  gradient unchanged, zero-radius preserved for admin elements, admin mobile hamburger works).
