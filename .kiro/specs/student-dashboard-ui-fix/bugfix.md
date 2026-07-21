# Bugfix Requirements Document

## Introduction

The student-facing UI of the AptiTest application has three interconnected issues that degrade the user experience:

1. **Harsh visual style** — `student.css` explicitly opts out of border-radius across every element (comments say "0px radius"), producing a severe, clinical appearance that conflicts with the softer look intended for students. Avatar circles, option buttons, stat widgets, template cards, modals, and progress bars all render with perfectly sharp corners and high-contrast deep-navy/indigo gradients that are unnecessarily aggressive for a practice-test context.

2. **Broken hamburger menu** — On mobile viewports (≤ 768 px), the sidebar is hidden as a fixed off-canvas drawer, and the `.mobile-header` is shown with a hamburger toggle. However, `.mobile-header` has `display: none` in the base (desktop) styles and is only switched to `display: flex` inside the `@media (max-width: 768px)` block — while the sidebar is **conditionally removed from the DOM** entirely when `currentView === "test_environment"`. This combination means the hamburger trigger is absent during an active test, leaving users on mobile unable to navigate. Additionally, the `student-dashboard-container` uses `display: flex` at all viewport sizes without isolating the mobile-header rendering path, causing the mobile-header to fight for layout space in ways that break the overall flex composition on narrow screens.

3. **Cross-page style inconsistency** — `login.css` and `signup.css` each define their own full `* { margin: 0; padding: 0 }` and `body { ... }` resets that conflict with `auth.css` (which also targets `.login-page` and `.signup-card`). The signup page receives two competing `border-radius` declarations (`border-radius: 16px` from `signup.css` vs `border-radius: 0` from `auth.css`). The login page has a dark glassmorphism card (`login.css`) that shares no visual language with the sharp white student dashboard, creating a jarring transition when a student logs in.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a student views the Student Dashboard on any viewport THEN the system renders all UI elements (cards, buttons, modals, inputs, avatar, progress bars) with `border-radius: 0`, producing sharp, harsh-looking corners throughout the interface.

1.2 WHEN a student views the Student Dashboard THEN the system displays a deep-navy-to-dark-indigo gradient sidebar (`#1e1b4b` → `#312e81`) paired with a high-saturation primary indigo (`#4f46e5`) on all interactive surfaces, resulting in a color palette that feels harsh and stressful rather than soft and encouraging.

1.3 WHEN a student resizes to a mobile viewport (≤ 768 px) and enters the test environment THEN the system removes the entire sidebar from the DOM (due to the `currentView !== "test_environment"` conditional render) without rendering the `.mobile-header`, leaving no visible navigation or branding element at the top of the screen.

1.4 WHEN a student is on a mobile viewport in any non-test view and taps the hamburger button THEN the system toggles `sidebarOpen` state and applies the `.open` class to the sidebar, but the sidebar z-index (`1000`) does not consistently stack above the `.student-main` content area on all mobile browsers, causing partial or invisible overlay behavior.

1.5 WHEN a student navigates from the Login page to the Student Dashboard THEN the system presents two visually incompatible designs — the login card uses dark glassmorphism with rounded corners (`border-radius: 24px`, blurred backdrop) while the dashboard uses sharp edges and a white surface theme — causing a jarring visual discontinuity.

1.6 WHEN the Signup page is rendered THEN the system applies conflicting CSS resets from both `signup.css` and `auth.css` (each declaring `* { margin: 0; padding: 0 }` and `body { ... }`), and conflicting `border-radius` values on `.signup-card`, leading to inconsistent rendering across browsers.

### Expected Behavior (Correct)

2.1 WHEN a student views the Student Dashboard on any viewport THEN the system SHALL render cards, modals, buttons, inputs, and the avatar using soft rounded corners (e.g., `border-radius: 8px–16px` for cards/modals, `border-radius: 50%` for the avatar circle, `border-radius: 6px–8px` for buttons and inputs).

2.2 WHEN a student views the Student Dashboard THEN the system SHALL use a softer, lower-contrast color palette — replacing the harsh deep-navy sidebar gradient with a lighter, muted indigo or slate-blue tone, and reducing the primary accent intensity so the overall feel is calm and approachable rather than institutional.

2.3 WHEN a student resizes to a mobile viewport (≤ 768 px) and enters the test environment THEN the system SHALL render a visible mobile header bar (or equivalent top-bar) that provides context (test in progress label) even though the sidebar navigation links are intentionally hidden during the test.

2.4 WHEN a student on a mobile viewport taps the hamburger button THEN the system SHALL reliably slide in the sidebar drawer above all other content, with the overlay backdrop intercepting taps to close it, and the body scroll SHALL be locked while the drawer is open.

2.5 WHEN a student navigates from the Login page to the Student Dashboard THEN the system SHALL present a cohesive visual transition — both pages SHALL share compatible corner-radius, spacing, and primary color values so the brand feel is consistent end-to-end.

2.6 WHEN the Signup page is rendered THEN the system SHALL apply a single authoritative CSS reset and a single consistent card style, eliminating conflicting `border-radius` and `body` declarations between `signup.css` and `auth.css`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student is in the test environment on desktop THEN the system SHALL CONTINUE TO hide the sidebar navigation links and render the full two-column test layout (`test-layout` grid) without any mobile-header intrusion.

3.2 WHEN a student selects an MCQ option THEN the system SHALL CONTINUE TO highlight the selected option with the primary color accent and persist the answer to the server via `saveAnswerToServer`.

3.3 WHEN the test timer reaches zero THEN the system SHALL CONTINUE TO trigger `handleForceSubmit` automatically and redirect the student to the results view.

3.4 WHEN a student logs out THEN the system SHALL CONTINUE TO clear `localStorage` and redirect to `/login`.

3.5 WHEN a student with a banned account opens the dashboard THEN the system SHALL CONTINUE TO show the banned banner and prevent launching new or reattempt tests.

3.6 WHEN an admin user navigates admin pages THEN the system SHALL CONTINUE TO use the existing `admin.css` styling and `AdminLayout` component without visual regressions from changes made to student-facing styles.

3.7 WHEN the sidebar overlay is tapped on mobile THEN the system SHALL CONTINUE TO close the sidebar and restore body scroll.

3.8 WHEN the Escape key is pressed while the sidebar is open on mobile THEN the system SHALL CONTINUE TO close the sidebar via the existing `keydown` event listener.
