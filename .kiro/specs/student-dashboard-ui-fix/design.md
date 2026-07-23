# Student Dashboard UI Fix — Comprehensive Bugfix Design

## Overview

Five interconnected client-side UI bugs degrade the student experience across the entire AptiTest 
application. This design formalizes the comprehensive fix strategy, defines all bug conditions 
precisely, and plans the complete validation approach.

**Bug 1 — Harsh visual style across entire app**: Multiple stylesheets explicitly opt out of 
`border-radius` or use sharp edges everywhere (all pages: student dashboard, login, signup, 
admin, results, history, leaderboard, modals). Additionally, the sidebar gradient uses harsh 
deep-navy/indigo (`#1e1b4b → #312e81`) and primary accents are overly saturated. The fix adds 
soft border-radius tokens (12–16 px cards, 6–8 px buttons, 50% avatar) and replaces the palette 
with muted indigo tones throughout.

**Bug 2 — Cramped typography and spacing**: Text throughout lacks breathing room. Letter-spacing 
on headings is insufficient, line-heights are too tight, and padding/margin between elements is 
minimal. The fix increases letter-spacing on headings (+0.05em), line-height on body text (≥1.6), 
and generous padding/margin tokens between sections.

**Bug 3 — Visible scrollbars clutter interface**: Scrollbars are visible on all containers, 
sidebars, lists, and modals across the application. The fix hides scrollbars globally using CSS 
`scrollbar-width: none` and webkit pseudo-elements while preserving scroll functionality.

**Bug 4 — Stats modal lacks close button**: The StudentStatsModal renders without a fixed or 
sticky close button, forcing students to scroll to the top to find an exit. The fix adds a 
fixed/sticky X button in the top-right corner that remains visible during scroll.

**Bug 5 — Broken hamburger + CSS conflicts**: On mobile (≤768 px), the sidebar is conditionally 
removed from the DOM in `test_environment` view, leaving the hamburger with no target. Additionally, 
`login.css` and `signup.css` each define their own `*` reset and `body` declarations that conflict 
with `auth.css`, causing competing `border-radius` values and visual discontinuity. The fix keeps 
the mobile header always visible with a "Test in Progress" label, hardens z-index/isolation rules, 
and consolidates CSS resets into `auth.css`.

All admin-facing files (`admin.css`, `AdminLayout.jsx`) are out of scope and must not be touched.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs / render contexts that trigger one of the five bugs.
- **Property (P)**: The observable correct behavior that must hold after the fix for any input
  satisfying C.
- **Preservation**: All observable behaviors for inputs **not** in C that must remain identical
  before and after the fix.
- **`student.css`**: The CSS module at `client/src/styles/student.css` that styles the student
  dashboard; primary target for Bugs 1, 2, 3, 4, and 5.
- **`auth.css`**: Shared stylesheet at `client/src/styles/auth.css` imported by `Login.jsx` and
  `Signup.jsx`; primary target for Bug 5.
- **`login.css` / `signup.css`**: Page-scoped stylesheets at `client/src/styles/login.css` and
  `client/src/styles/signup.css`; need de-duplication for Bug 5.
- **`StudentDashboard.jsx`**: The single-page component at `client/src/pages/StudentDashboard.jsx`
  that renders the dashboard, test environment, history, results, and leaderboard views; target
  for Bugs 2, 4, and 5.
- **`StudentStatsModal`**: A modal component (embedded in StudentDashboard or separate) rendering
  student statistics; target for Bug 4.
- **`currentView`**: React state in `StudentDashboard.jsx` that switches between `"dashboard"`,
  `"history"`, `"leaderboard"`, `"test_environment"`, and `"results"`.
- **`sidebarOpen`**: React state boolean controlling whether the sidebar drawer is open on mobile.
- **border-radius token**: A CSS custom property used to enforce consistent corner rounding across
  all UI elements.
- **spacing token**: A CSS custom property used for consistent padding/margin values.
- **soft palette**: The replacement color set — muted slate-indigo sidebar, pastel surface colors,
  and reduced primary accent saturation — defined as updated `:root` custom properties in
  `student.css`.
- **scrollbar hiding**: CSS techniques using `scrollbar-width: none` and webkit pseudo-elements
  to hide scrollbars while preserving scroll functionality.
- **fixed close button**: A modal close button (X) positioned `position: fixed` that remains
  visible during scroll.

---

## Bug Details

### Bug Condition

The five bugs share interconnected conditions that affect the student-facing UI across all pages 
and viewports. Each sub-condition is formalized separately below.

#### Bug 1 — Harsh Visual Style Across Entire App

```
FUNCTION isBugCondition_B1(renderContext)
  INPUT: renderContext — any render of any student-facing page/view
  OUTPUT: boolean

  RETURN student.css, auth.css, login.css, signup.css define border-radius: 0 on cards/buttons/inputs/avatar
         OR  student.css sidebar background uses #1e1b4b / #312e81 gradient
         OR  primary accent token is #4f46e5 (high-saturation indigo)
END FUNCTION
```

**Concrete examples:**
- `.user-avatar-circle` renders as a square (0 radius) instead of a circle (50%).
- `.template-card`, `.template-badge`, `.checklist-modal` have sharp 90° corners instead of 
  rounded.
- `.student-sidebar` gradient stops at `#1e1b4b` making the sidebar feel harsh and institutional.
- `.stat-widget`, `.stats-card`, `.timer-box`, `.option-btn-student` all render with zero rounding.
- `.login-card`, `.signup-card` render with `border-radius: 0` (from auth.css).
- All buttons (`.btn-launch-template`, `.btn-nav-action`, `.btn-submit-test`, `.btn-checklist-*`, 
  `.btn-history-action`, `.btn-start-test`, `.logout-button`) render with sharp corners.

#### Bug 2 — Cramped Typography and Spacing

```
FUNCTION isBugCondition_B2(renderContext)
  INPUT: renderContext — any render of student-facing page/view
  OUTPUT: boolean

  RETURN heading letter-spacing < 0.04em
         OR  body line-height < 1.5
         OR  padding between major sections < 16px
         OR  margin between elements < 12px
         OR  modal/card padding < 18px
END FUNCTION
```

**Concrete examples:**
- Section titles (`.section-title`) lack sufficient letter-spacing, producing dense typography.
- Paragraph text (`.question-text-display`, `.template-desc`, `.checklist-instructions`) has 
  `line-height: 1.5` or lower, feeling cramped.
- `.dashboard-stats-grid` has insufficient gap/margin (16 px is minimum, but smaller gaps appear 
  on mobile).
- `.checklist-modal-body` content is densely packed with insufficient breathing room.
- Card padding (`.template-card`, `.stat-widget`, `.category-card`) is tight at 18–20 px — should 
  be 20–24 px.
- Table cells (`.history-table td`, `.leaderboard-table td`) have minimal padding.

#### Bug 3 — Visible Scrollbars Clutter Interface

```
FUNCTION isBugCondition_B3(renderContext)
  INPUT: renderContext — any render of scrollable container
  OUTPUT: boolean

  RETURN container has overflow: auto | scroll
         AND scrollbar is visible (scrollbar-width not set to none)
         AND webkit scrollbar pseudo-elements not hidden
END FUNCTION
```

**Concrete examples:**
- `.student-sidebar` scrolls when content exceeds viewport height; scrollbar is visible.
- `.question-body-scroller` inside test environment scrolls with a visible scrollbar.
- `.checklist-modal-body` scrolls with a visible scrollbar when list exceeds max-height.
- `.history-table-container`, `.leaderboard-container` scroll horizontally with visible 
  scrollbars.
- Any `.student-content` overflow produces a visible scrollbar.
- Modal body containers (`.student-stats-modal-body` or equivalent) scroll with visible 
  scrollbars.

#### Bug 4 — Stats Modal Lacks Close Button

```
FUNCTION isBugCondition_B4(renderContext)
  INPUT: renderContext — StudentStatsModal rendered on StudentDashboard
  OUTPUT: boolean

  RETURN StudentStatsModal has no fixed/sticky close button in top-right corner
         OR  close button is not visible when modal body is scrolled
         OR  close button (X) is only on header which scrolls out of view
END FUNCTION
```

**Concrete examples:**
- StudentStatsModal (if it exists as a modal overlay) opens with only a dismiss-by-backdrop 
  mechanism; no visible close button.
- Student scrolls down in the modal; any close affordance at the top is no longer visible.
- The modal header (if it has a close button) scrolls out of view as content scrolls, leaving 
  the student with no discoverable exit path other than backdrop click.

#### Bug 5 — Broken Hamburger Menu + CSS Conflicts

```
FUNCTION isBugCondition_B5(viewport, currentView, pageType, browserState)
  INPUT: viewport — current width in px; currentView — active React view; 
         pageType — "student" | "auth"; browserState — loaded CSS modules
  OUTPUT: boolean

  IF viewport <= 768
    IF currentView = "test_environment"
      RETURN true   -- sidebar removed from DOM, hamburger useless / no context label
    END IF
    IF sidebarOpen = true AND sidebar z-index does not stack above .student-main
      RETURN true   -- overlay/drawer hidden behind content area
    END IF
  END IF
  
  IF pageType = "auth" (login OR signup)
    RETURN two or more loaded stylesheets declare * { margin: 0; padding: 0 }
           OR  two or more stylesheets declare body { … }
           OR  .login-card / .signup-card receives competing border-radius values
           OR  login page uses dark background (#0f172a gradient) while dashboard uses bright (#f8fafc)
  END IF
  
  RETURN false
END FUNCTION
```

**Concrete examples:**
- Student on a 375 px phone starts a test: the sidebar is not in the DOM, the hamburger has 
  nothing to toggle, and no top-bar label says "Test in Progress".
- Student opens the sidebar drawer; the drawer slides in but is partially obscured by a form 
  or card in the main content area (z-index race condition).
- On signup page, `auth.css` sets `border-radius: 0` while `signup.css` sets `border-radius: 16px`; 
  the rendered value is non-deterministic based on stylesheet load order.
- Both `auth.css` and `signup.css` declare `* { margin: 0; padding: 0 }`, causing cascade order 
  dependency.
- Student logs in and sees a dark-blurred card, then lands on a stark white dashboard — jarring 
  visual discontinuity.

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
- (3.9) StudentStatsModal opens/closes correctly via state; close button does not cause 
  unintended re-renders or state mutations.
- (3.10) Scroll functionality is preserved on all containers; scrolling performance is not 
  degraded by scrollbar hiding CSS.

**Scope of Non-Bug Inputs:**
All inputs that do NOT satisfy any of the five bug conditions above must produce identical
behavior before and after the fix. This includes:
- Desktop viewport rendering of all dashboard views.
- All mouse/pointer and keyboard interactions with test controls (option buttons, navigation
  buttons, submit, flag, question grid).
- Timer countdown behavior.
- Leaderboard, history, and results views rendered at any viewport.
- Admin dashboard navigation and all admin pages.
- Login and signup form submission on desktop.
- Modal open/close behavior (except StudentStatsModal close button implementation).

**Note:** The precise correct output for inputs that DO satisfy the bug conditions is defined
in the Correctness Properties section below.

---

## Hypothesized Root Cause

### Bug 1 — Harsh Visual Style

1. **Deliberate "NTA-style" comment left in place**: The file header says `Sharp edges kept
   (0px radius) per your request` and every element explicitly overrides or omits `border-radius`.
   The `:root` block has no `--s-radius-*` tokens, so there is nothing to override globally.

2. **Deep-navy gradient is hard-coded on `.student-sidebar`**: The `background` property uses
   raw hex values (`#1e1b4b → #312e81`) rather than CSS variables, making it impossible to
   adjust the palette without touching every selector.

3. **High-saturation `--s-primary: #4f46e5`** is applied to interactive surfaces (buttons,
   table headers, modal headers, timer box) producing harsh contrast against white backgrounds.

### Bug 2 — Cramped Typography and Spacing

1. **Default line-height of 1.5** is too tight for body text; headings lack letter-spacing; 
   padding/margin values are minimal (16 px gaps, 18–20 px padding on cards).

2. **No spacing tokens in `:root`**: There is no `--s-spacing-*` CSS variable system, so 
   adjustments must be made selector-by-selector.

### Bug 3 — Visible Scrollbars

1. **No scrollbar hiding CSS applied globally**: Containers with `overflow-y: auto` render 
   native scrollbars in all browsers.

2. **No webkit pseudo-element rules**: `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, 
   `::-webkit-scrollbar-thumb` are not defined anywhere.

### Bug 4 — Stats Modal Lacks Close Button

1. **Modal header (if it exists) scrolls with content**: Any close button placed on a scrolling 
   header becomes inaccessible.

2. **No fixed/sticky position close button**: The modal does not have a persistent X button in 
   the top-right corner.

### Bug 5 — Broken Hamburger Menu + CSS Conflicts

1. **Sidebar conditionally excluded from the DOM** (`{currentView !== "test_environment" && <div className="student-sidebar">…</div>}`).
   When the sidebar is absent, the hamburger button in `.mobile-header` becomes a dead control
   with no target element.

2. **No test-mode top-bar label**: There is no visual indicator in `"test_environment"` view
   on mobile that a test is in progress.

3. **Z-index stacking context issue**: `.student-main` does not explicitly set `isolation:
   auto`, and descendant elements may create new stacking contexts that compete with the
   `.student-sidebar` at z-index 1000.

4. **Three files own the `*` reset and `body` declaration**: `auth.css`, `login.css`, and
   `signup.css` each declare `* { margin: 0; padding: 0; box-sizing: border-box }` and
   `body { … }`. The last-loaded file wins.

5. **Competing `border-radius` on `.login-card` and `.signup-card`**: `signup.css` sets
   `border-radius: 16px` while `auth.css` sets `border-radius: 0`. Both rules have the same
   specificity, so the outcome depends purely on stylesheet load order.

6. **`login.css` dark-glassmorphism is stylistically incompatible**: `login.css` uses
   `background: linear-gradient(135deg, #0f172a …)` while `auth.css` uses a navy gradient. 
   Neither coordinates with the student dashboard's bright `#f8fafc` background.

---

## Correctness Properties

Property 1: Bug Condition B1 — Soft Visual Palette and Rounded Corners

_For any_ render of any student-facing page or view (dashboard, test environment, history, 
results, leaderboard, login, signup, modals), the fixed `student.css` and `auth.css` SHALL apply 
soft rounded corners across all UI elements:
- Cards, modals, containers: `border-radius: 14px`
- Buttons, inputs, tags, badges: `border-radius: 8px`
- Avatar circle (`.user-avatar-circle`): `border-radius: 50%`
- Progress bar, timer box: `border-radius: 10px`

Additionally, the sidebar palette SHALL be replaced from `#1e1b4b → #312e81` to muted indigo tones 
(e.g., `#3b3a8f → #4f48d0`), and the primary accent SHALL be softened from `#4f46e5` to `#6366f1`.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition B2 — Spacious Typography and Padding

_For any_ render of student-facing content (headings, body text, cards, modals, tables), the fixed 
CSS SHALL provide:
- Heading letter-spacing: ≥ +0.04em
- Body text line-height: ≥ 1.6
- Card/modal padding: ≥ 20px
- Section gap/margin: ≥ 16px
- Table cell padding: ≥ 12px

**Validates: Requirements 2.3, 2.4, 2.5**

Property 3: Bug Condition B3 — Hidden Scrollbars Preserved Functionality

_For any_ scrollable container (sidebar, modal body, table, content area), the fixed CSS SHALL 
hide scrollbars using `scrollbar-width: none` (Firefox) and `::-webkit-scrollbar` pseudo-elements 
(Chromium) while preserving full scroll functionality. Scroll performance and accessibility must 
not be degraded.

**Validates: Requirements 2.6, 2.7**

Property 4: Bug Condition B4 — Stats Modal Fixed Close Button

_For any_ render of StudentStatsModal, the fixed `StudentDashboard.jsx` and `student.css` SHALL 
render a fixed X button in the top-right corner that:
- Is always visible, even when the modal body scrolls
- Remains clickable and responsive
- Correctly updates `showStatsModal` state to `false` on click
- Does not cause unintended re-renders or modal state corruption

**Validates: Requirements 2.8, 2.9**

Property 5: Bug Condition B5 — Mobile Header Always Visible with Test Label + CSS Consolidation

_For any_ mobile viewport (≤ 768 px) where `currentView === "test_environment"`, the fixed 
`StudentDashboard.jsx` SHALL render a visible top-bar element containing a label such as 
"Test in Progress", providing context even though the sidebar navigation is absent.

_For any_ mobile viewport where the sidebar drawer is open, the fixed `student.css` SHALL 
ensure the `.student-sidebar` element stacks above all `.student-main` descendants via 
`isolation: isolate` on `.student-main` and higher z-index (`1100`) on `.student-sidebar`.

_For any_ render of the login or signup page, the fixed stylesheets SHALL apply exactly one 
`* { margin: 0; padding: 0; box-sizing: border-box }` reset (defined only in `auth.css`), 
exactly one `border-radius` declaration on `.login-card` and `.signup-card` (defined only in 
`auth.css`), and a shared soft-indigo color palette visually compatible with the student dashboard.

**Validates: Requirements 2.10, 2.11, 2.12**

Property 6: Preservation — All Existing Behaviors Unchanged

_For any_ input where none of the five bug conditions hold (non-buggy inputs as defined in 
§ Expected Behavior Preservation Requirements), the fixed code SHALL produce exactly the same 
behavior as the original code across all regression scenarios 3.1–3.10.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

---

## Fix Implementation

### Changes Required

Assuming root-cause analysis is correct:

#### File 1: `client/src/styles/student.css`

**Specific Changes:**

1. **Add border-radius tokens to `:root`**
   ```css
   --s-radius-sm: 8px;
   --s-radius-md: 10px;
   --s-radius-lg: 14px;
   --s-radius-xl: 18px;
   --s-radius-full: 9999px;
   ```

2. **Add spacing tokens to `:root`**
   ```css
   --s-spacing-xs: 4px;
   --s-spacing-sm: 8px;
   --s-spacing-md: 12px;
   --s-spacing-lg: 16px;
   --s-spacing-xl: 20px;
   --s-spacing-2xl: 24px;
   ```

3. **Replace sidebar gradient palette tokens**
   ```css
   --s-sidebar-from: #3b3a8f;
   --s-sidebar-to:   #4f48d0;
   ```
   Update `.student-sidebar`:
   ```css
   background: linear-gradient(180deg, var(--s-sidebar-from) 0%, var(--s-sidebar-to) 100%);
   ```

4. **Soften primary accent token**
   ```css
   --s-primary: #6366f1;
   --s-primary-dark: #4f46e5;
   --s-primary-darker: #4338ca;
   ```

5. **Apply border-radius to all affected selectors** using the new tokens instead of `0`.

6. **Apply spacing tokens** to increase letter-spacing, line-height, padding, and margins 
   throughout.

7. **Hide scrollbars globally** in `.student-content`, `.student-sidebar`, `.question-body-scroller`, 
   `.checklist-modal-body`, `.history-table-container`, `.leaderboard-container`:
   ```css
   scrollbar-width: none;
   ```
   And add webkit rules:
   ```css
   ::-webkit-scrollbar { width: 0; height: 0; }
   ::-webkit-scrollbar-track { background: transparent; }
   ::-webkit-scrollbar-thumb { background: transparent; }
   ```

8. **Fix z-index stacking for mobile sidebar**
   Add to `.student-main`: `isolation: isolate;`
   Change `.student-sidebar` z-index to `1100` in the mobile media query.

9. **Add `.mobile-test-label` style**
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

#### File 2: `client/src/pages/StudentDashboard.jsx`

**Specific Changes:**

1. **Add test-mode label to `.mobile-header` when `currentView === "test_environment"`**
   Replace the hamburger with a test-label when in test environment on mobile.

2. **Hide hamburger button during test environment**
   The hamburger should only show when a sidebar can actually be toggled.

#### File 3: `client/src/styles/auth.css`

**Specific Changes:**

1. **Remove or consolidate `* { margin: 0; padding: 0 }` reset** — keep only in this file.

2. **Update `.login-card` and `.signup-card` to use shared tokens**
   ```css
   border-radius: 14px;
   border-top: 4px solid #6366f1;
   box-shadow: 0 8px 24px rgba(99, 102, 241, 0.12);
   ```

3. **Update card heading gradient**
   ```css
   background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
   ```

4. **Apply border-radius to inputs and buttons**
   ```css
   border-radius: 8px;
   ```

5. **Update page background to soft indigo**
   ```css
   background: linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%);
   ```

6. **Remove the gridline `::before` overlay** pseudo-element.

#### File 4: `client/src/styles/login.css`

**Specific Changes:**

1. Remove duplicate `* { margin: 0; padding: 0; box-sizing }` block.
2. Remove duplicate `body { … }` block.
3. Remove all `.login-card` and `.login-page` rules already covered by `auth.css`.
4. Leave file empty or with a comment: `/* Styles consolidated into auth.css */`.

#### File 5: `client/src/styles/signup.css`

**Specific Changes:**

1. Remove duplicate `* { margin: 0; padding: 0; box-sizing }` block.
2. Remove duplicate `body { … }` block.
3. Remove all `.signup-card` rules already covered by `auth.css`.
4. Leave file empty or with a comment: `/* Styles consolidated into auth.css */`.

#### File 6: StudentStatsModal (if separate) or StudentDashboard.jsx (if embedded)

**Specific Changes:**

1. **Add fixed close button** (X) with `position: fixed` in the top-right corner.
2. **Use `z-index: 1501`** to ensure it stacks above the modal overlay (`z-index: 1500`).
3. **Position logic**: `top: modalTop + 12px; right: 12px;`
4. **On click**: Call `setShowStatsModal(false)`.

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

**Goal**: Surface counterexamples that demonstrate the bugs on unfixed code.

**Test Plan**: Mount `StudentDashboard` in a test harness (e.g., Vitest + React Testing Library)
with `jsdom`. Use `getComputedStyle` or snapshot matching to assert computed CSS properties.

**Test Cases:**

1. **B1-Explore-1**: Avatar `border-radius` equals `0px` (not `50%`).
2. **B1-Explore-2**: Template card `border-radius` equals `0px`.
3. **B1-Explore-3**: Sidebar background contains `#1e1b4b`.
4. **B2-Explore-1**: Heading letter-spacing < `0.04em`.
5. **B2-Explore-2**: Body text line-height < `1.5`.
6. **B2-Explore-3**: Card padding < `20px`.
7. **B3-Explore-1**: Sidebar scrollbar is visible (`::-webkit-scrollbar` not present).
8. **B3-Explore-2**: Modal body scrollbar is visible.
9. **B4-Explore-1**: StudentStatsModal has no fixed close button in DOM.
10. **B4-Explore-2**: Close button (if any) is on scrolling header (not fixed).
11. **B5-Explore-1**: Test environment on mobile has no "Test in Progress" label.
12. **B5-Explore-2**: Hamburger button is clickable but no sidebar exists to toggle.
13. **B5-Explore-3**: Duplicate `* { margin: 0 }` found in auth.css and signup.css.
14. **B5-Explore-4**: `.login-card` computed `border-radius` is non-deterministic (0 or 16).
15. **B5-Explore-5**: Login page background is dark (#0f172a gradient), not light.

**Expected counterexamples:** All border-radius assertions return `0px`; scrollbars are visible; 
spacing is cramped; no test-label exists; duplicates exist in stylesheets.

---

### Fix Checking

**Goal**: After applying all six file changes, verify that all bug-condition inputs now produce 
the correct output.

**Test Cases (run on fixed code):**

1. **B1-Fix-1**: Avatar `border-radius` equals `50%`. ✓
2. **B1-Fix-2**: Template card `border-radius` ≥ `10px`. ✓
3. **B1-Fix-3**: Sidebar gradient does not contain `#1e1b4b`. ✓
4. **B1-Fix-4**: Primary accent is softened to `#6366f1`. ✓
5. **B2-Fix-1**: Heading letter-spacing ≥ `0.04em`. ✓
6. **B2-Fix-2**: Body text line-height ≥ `1.6`. ✓
7. **B2-Fix-3**: Card padding ≥ `20px`. ✓
8. **B3-Fix-1**: Sidebar scrollbar is hidden. ✓
9. **B3-Fix-2**: Modal scrollbar is hidden. ✓
10. **B3-Fix-3**: Scroll functionality preserved. ✓
11. **B4-Fix-1**: StudentStatsModal has fixed close button in top-right. ✓
12. **B4-Fix-2**: Close button remains visible when scrolling. ✓
13. **B4-Fix-3**: Click close button → `showStatsModal` becomes `false`. ✓
14. **B5-Fix-1**: Test environment on mobile shows "Test in Progress" label. ✓
15. **B5-Fix-2**: Hamburger hidden in test environment; label visible. ✓
16. **B5-Fix-3**: Sidebar z-index stacks above content (`isolation: isolate` + `z-index: 1100`). ✓
17. **B5-Fix-4**: Single `* { margin: 0 }` reset across all stylesheets. ✓
18. **B5-Fix-5**: `.login-card` and `.signup-card` consistently have `border-radius: 14px`. ✓
19. **B5-Fix-6**: Auth page background is light indigo (#eef2ff gradient). ✓

---

### Preservation Checking

**Goal**: Verify that for all non-buggy inputs the fixed code produces the same behavior as
the original code.

**Testing Approach**: Property-based testing generates many input states and verifies structural 
DOM invariants and behavioral logic remain unchanged.

**Test Cases:**

1. **Pres-1**: MCQ option selection still calls `saveAnswerToServer`.
2. **Pres-2**: Timer auto-submit still works; `currentView` transitions to `"results"`.
3. **Pres-3**: Logout still clears `localStorage` and navigates to `/login`.
4. **Pres-4**: Banned user modal still renders correctly.
5. **Pres-5**: Desktop test layout still renders; mobile header hidden on desktop.
6. **Pres-6**: Sidebar overlay click still closes sidebar.
7. **Pres-7**: Escape key still closes sidebar.
8. **Pres-8**: Admin pages still use `admin.css` unchanged.
9. **Pres-9**: Answer saving pipeline unaffected by CSS changes.
10. **Pres-10**: Body scroll lock (`body.sidebar-open`) still syncs with `sidebarOpen` state.

---

### Unit Tests

- All `:root` tokens are syntactically valid CSS variables.
- `.mobile-header` always present in DOM regardless of `currentView`.
- When `currentView === "test_environment"` and viewport ≤ 768 px: hamburger absent/disabled, 
  test-label present.
- `.login-card` and `.signup-card` computed `border-radius` is non-zero and consistent.
- `login.css` and `signup.css` do not contain `* { margin` or `body {` declarations.
- StudentStatsModal close button is fixed positioned and clickable.

### Property-Based Tests

- Generate 100+ random `currentView` × viewport combinations; assert `.mobile-header` always 
  in DOM.
- Generate random CSS cascade orderings; assert `border-radius` on `.signup-card` is consistent.
- Generate random user/answer states; assert answer-saving pipeline is unaffected.
- Generate random sidebar-open/close sequences; assert body scroll lock matches `sidebarOpen`.
- Generate random scroll positions; assert StudentStatsModal close button remains visible and 
  clickable.

### Integration Tests

- Full login → dashboard → test-launch → test-environment → submit → results flow on mobile 
  viewport.
- Verify visual continuity (no broken navigation at any step).
- Verify cohesive palette throughout (soft indigo background, rounded cards, proper spacing).
- Signup page render: single `border-radius` value applied, no reset conflicts.
- Admin dashboard navigation: `admin.css` styles intact, zero-radius preserved for admin elements.
- Verify all scrollbars hidden but scroll functionality preserved across all containers.
- Open StudentStatsModal and scroll: close button remains visible and clickable.

