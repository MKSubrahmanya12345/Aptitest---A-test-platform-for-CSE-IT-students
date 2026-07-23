# Bugfix Requirements Document

## Introduction

The AptiTest application's client-side UI suffers from a systemic lack of polish that impacts both functional usability and visual coherence across all pages. Five interconnected issues degrade the overall user experience:

1. **Harsh visual style across the entire app** — Multiple stylesheets explicitly opt out of `border-radius` or use sharp edges everywhere, producing a severe, clinical appearance that conflicts with the intended soft, approachable user experience. This affects the student dashboard, login/signup pages, admin pages, and modals. Avatar circles, buttons, cards, widgets, and progress bars render with perfectly sharp corners. Additionally, the sidebar gradient uses high-contrast deep-navy/indigo (`#1e1b4b` → `#312e81`) that feels unnecessarily aggressive, and the primary accent colors are overly saturated, making the interface feel institutional rather than friendly.

2. **Cramped typography and spacing** — Text throughout the application lacks breathing room. Letter-spacing on headings is insufficient, line-heights are too tight, and padding/margin between text elements and sections is minimal. This creates a dense, cluttered visual appearance that fatigues users and makes the interface feel cramped rather than spacious and approachable.

3. **Visible scrollbars clutter the interface** — Scrollbars are visible on all containers, sidebars, lists, and modals across the application, creating visual clutter and reducing the effective content space. The interface would feel more polished and spacious with hidden scrollbars while preserving scroll functionality.

4. **Stats modal has no accessible close button** — The StudentStatsModal renders without a fixed or sticky close button, forcing students to scroll to the top of potentially long content to find an exit. The modal is dismissible only by clicking outside, which is not discoverable and violates accessibility best practices.

5. **Broken hamburger menu and cross-page style inconsistency** — On mobile viewports (≤ 768 px), the sidebar is conditionally removed from the DOM when `currentView === "test_environment"`, leaving the hamburger button with no target and no visual context indicating a test is in progress. Additionally, `login.css` and `signup.css` each define their own `* { margin: 0; padding: 0 }` and `body { ... }` resets that conflict with `auth.css`, causing competing `border-radius` values and a jarring visual discontinuity between the login page (dark glassmorphism) and the student dashboard (bright white).

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any student views the Student Dashboard on any viewport THEN the system renders all UI elements (cards, buttons, modals, inputs, avatar, progress bars) with `border-radius: 0`, producing sharp, harsh-looking corners throughout the interface.

1.2 WHEN any student views the Student Dashboard THEN the system displays a deep-navy-to-dark-indigo gradient sidebar (`#1e1b4b` → `#312e81`) paired with a high-saturation primary indigo (`#4f46e5`) on all interactive surfaces, resulting in a color palette that feels harsh and stressful rather than soft and encouraging.

1.3 WHEN a student views the Login page THEN the system renders sharp-cornered cards and uses a dark glassmorphism aesthetic (dark background, blur effect) that is visually incompatible with the bright white dashboard, creating a jarring transition.

1.4 WHEN a student views the Signup page THEN the system applies conflicting `border-radius` values (16 px from `signup.css` vs 0 from `auth.css`) and duplicate CSS resets from both `signup.css` and `auth.css`, leading to inconsistent rendering across browsers.

1.5 WHEN a student views any page in the application THEN the system renders content headings with insufficient letter-spacing and body text with tight line-heights, creating a dense, cramped appearance throughout the interface.

1.6 WHEN a student views any scrollable container, sidebar, list, or modal on any page THEN the system displays visible scrollbars that clutter the visual appearance and reduce the effective content area.

1.7 WHEN a student opens the StudentStatsModal on the Student Dashboard THEN the system renders the modal without a fixed or sticky close button, forcing the student to scroll to the top of potentially long content to find an exit.

1.8 WHEN a student resizes to a mobile viewport (≤ 768 px) and enters the test environment THEN the system removes the entire sidebar from the DOM (due to the `currentView !== "test_environment"` conditional render) without rendering a visible top-bar label, leaving no navigation trigger or context indicator.

1.9 WHEN a student is on a mobile viewport in any non-test view and taps the hamburger button THEN the system toggles `sidebarOpen` state and applies the `.open` class to the sidebar, but the sidebar z-index (`1000`) does not consistently stack above the `.student-main` content area on all mobile browsers, causing partial or invisible overlay behavior.

1.10 WHEN the Signup page is rendered THEN the system applies conflicting CSS resets from both `signup.css` and `auth.css` (each declaring `* { margin: 0; padding: 0 }` and `body { ... }`), leading to inconsistent rendering across browsers.

### Expected Behavior (Correct)

2.1 WHEN any student views the Student Dashboard on any viewport THEN the system SHALL render cards, modals, buttons, inputs, and the avatar using soft rounded corners (e.g., `border-radius: 8px–16px` for cards/modals, `border-radius: 50%` for the avatar circle, `border-radius: 6px–8px` for buttons and inputs).

2.2 WHEN any student views the Student Dashboard THEN the system SHALL use a softer, lower-contrast color palette — replacing the harsh deep-navy sidebar gradient with a lighter, muted indigo or slate-blue tone, and reducing the primary accent intensity so the overall feel is calm and approachable rather than institutional.

2.3 WHEN a student views the Login page THEN the system SHALL render rounded cards with soft corners and use a light, cohesive color palette that is visually compatible with the rest of the application.

2.4 WHEN a student views the Signup page THEN the system SHALL apply a single authoritative CSS reset and a single consistent card style with soft rounded corners, eliminating conflicting `border-radius` and `body` declarations between `signup.css` and `auth.css`.

2.5 WHEN a student views any page in the application THEN the system SHALL render headings with increased letter-spacing and body text with increased line-height to provide generous breathing room and reduce the dense appearance.

2.6 WHEN a student views any scrollable container, sidebar, list, or modal on any page THEN the system SHALL hide scrollbars using CSS scrollbar-width and webkit scrollbar pseudo-elements while preserving scroll functionality.

2.7 WHEN a student opens the StudentStatsModal on the Student Dashboard THEN the system SHALL render a fixed or sticky close button (X) in the top-right corner that remains visible as the user scrolls, providing an always-discoverable way to dismiss the modal.

2.8 WHEN a student resizes to a mobile viewport (≤ 768 px) and enters the test environment THEN the system SHALL render a visible mobile header bar (or equivalent top-bar) that provides context (test in progress label) even though the sidebar navigation links are intentionally hidden during the test.

2.9 WHEN a student on a mobile viewport taps the hamburger button THEN the system SHALL reliably slide in the sidebar drawer above all other content, with the overlay backdrop intercepting taps to close it, and the body scroll SHALL be locked while the drawer is open.

2.10 WHEN a student navigates from the Login page to the Student Dashboard THEN the system SHALL present a cohesive visual transition — both pages SHALL share compatible corner-radius, spacing, and primary color values so the brand feel is consistent end-to-end.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a student is in the test environment on desktop THEN the system SHALL CONTINUE TO hide the sidebar navigation links and render the full two-column test layout (`test-layout` grid) without any mobile-header intrusion.

3.2 WHEN a student selects an MCQ option THEN the system SHALL CONTINUE TO highlight the selected option with the primary color accent and persist the answer to the server via `saveAnswerToServer`.

3.3 WHEN the test timer reaches zero THEN the system SHALL CONTINUE TO trigger `handleForceSubmit` automatically and redirect the student to the results view.

3.4 WHEN a student logs out THEN the system SHALL CONTINUE TO clear `localStorage` and redirect to `/login`.

3.5 WHEN a student with a banned account opens the dashboard THEN the system SHALL CONTINUE TO show the banned banner and prevent launching new or reattempt tests.

3.6 WHEN an admin user navigates admin pages THEN the system SHALL CONTINUE TO use the existing `admin.css` styling and `AdminLayout` component without visual regressions from changes made to student-facing styles.

3.7 WHEN the sidebar overlay is tapped on mobile THEN the system SHALL CONTINUE TO close the sidebar and restore body scroll.

3.8 WHEN the Escape key is pressed while the sidebar is open on mobile THEN the system SHALL CONTINUE TO close the sidebar via the existing `keydown` event listener.

3.9 WHEN the StudentStatsModal is closed (either by close button or backdrop click) THEN the system SHALL CONTINUE TO update the `showStatsModal` state correctly and prevent the modal from re-opening unexpectedly.

3.10 WHEN a student scrolls within any container with hidden scrollbars THEN the system SHALL CONTINUE TO provide full scroll functionality without any degradation to scrolling performance or accessibility.
