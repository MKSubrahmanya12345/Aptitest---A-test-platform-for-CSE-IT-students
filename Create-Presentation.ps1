# Create AptiTest Presentation PPTX
# Uses PowerPoint COM automation

$ErrorActionPreference = "Stop"

# Create PowerPoint application
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue

# Create new presentation with 16:9 aspect ratio
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 720  # 10 inches
$presentation.PageSetup.SlideHeight = 405  # 5.625 inches (16:9)

# Color constants
$purpleDark = [System.Drawing.ColorTranslator]::FromHtml("#764ba2").ToArgb()
$purpleLight = [System.Drawing.ColorTranslator]::FromHtml("#667eea").ToArgb()
$white = 16777215
$black = 0
$gray = 8947848

# Slide 1: Title Slide
$slide1 = $presentation.Slides.Add(1, [Microsoft.Office.Interop.PowerPoint.PpSlideLayout]::ppLayoutBlank)
$shape = $slide1.Shapes.AddShape(1, 0, 0, 720, 405) # Rectangle covering whole slide
$shape.Fill.ForeColor.RGB = $purpleDark
$shape.Fill.TwoColorGradient(1, 1) # msoGradientFromCorner
$shape.Fill.ForeColor.RGB = $purpleLight
$shape.Fill.BackColor.RGB = [System.Drawing.ColorTranslator]::FromHtml("#764ba2").ToArgb()
$shape.Line.Visible = 0

# Add title
$title = $slide1.Shapes.AddTextbox(1, 50, 120, 620, 80)
$title.TextFrame.TextRange.Text = "AptiTest"
$title.TextFrame.TextRange.Font.Size = 60
$title.TextFrame.TextRange.Font.Bold = -1
$title.TextFrame.TextRange.Font.Color.RGB = $white
$title.TextFrame.TextRange.ParagraphFormat.Alignment = 2 # Center
$title.TextFrame.TextRange.Text = "🎯 AptiTest"

# Add subtitle
$subtitle = $slide1.Shapes.AddTextbox(1, 50, 210, 620, 40)
$subtitle.TextFrame.TextRange.Text = "Comprehensive Aptitude Testing Platform"
$subtitle.TextFrame.TextRange.Font.Size = 26
$subtitle.TextFrame.TextRange.Font.Color.RGB = $white
$subtitle.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Add tagline
$tagline = $slide1.Shapes.AddTextbox(1, 50, 260, 620, 30)
$tagline.TextFrame.TextRange.Text = "Master Your Aptitude | Track Progress | Succeed"
$tagline.TextFrame.TextRange.Font.Size = 16
$tagline.TextFrame.TextRange.Font.Color.RGB = $white
$tagline.TextFrame.TextRange.ParagraphFormat.Alignment = 2

# Add project info
$info = $slide1.Shapes.AddTextbox(1, 50, 340, 620, 30)
$info.TextFrame.TextRange.Text = "Internship Project Presentation"
$info.TextFrame.TextRange.Font.Size = 14
$info.TextFrame.TextRange.Font.Color.RGB = $white
$info.TextFrame.TextRange.ParagraphFormat.Alignment = 2
$info.TextFrame.TextRange.Font.Transparency = 0.2

# Slide numbers
$count = $presentation.Slides.Count

# Helper function to add content slide
function Add-ContentSlide($title, $contentLines) {
    $slide = $presentation.Slides.Add($presentation.Slides.Count + 1, [Microsoft.Office.Interop.PowerPoint.PpSlideLayout]::ppLayoutBlank)
    
    # Title
    $titleBox = $slide.Shapes.AddTextbox(1, 40, 30, 640, 50)
    $titleBox.TextFrame.TextRange.Text = $title
    $titleBox.TextFrame.TextRange.Font.Size = 38
    $titleBox.TextFrame.TextRange.Font.Bold = -1
    $titleBox.TextFrame.TextRange.Font.Color.RGB = [System.Drawing.ColorTranslator]::FromHtml("#333333").ToArgb()
    
    # Add underline
    $line = $slide.Shapes.AddLine(40, 72, 350, 72)
    $line.Line.ForeColor.RGB = $purpleLight
    $line.Line.Weight = 4
    
    # Content
    $yPos = 90
    foreach ($line in $contentLines) {
        if ($line.StartsWith("H3:")) {
            $h3 = $slide.Shapes.AddTextbox(1, 40, $yPos, 640, 30)
            $h3.TextFrame.TextRange.Text = $line.Substring(3)
            $h3.TextFrame.TextRange.Font.Size = 24
            $h3.TextFrame.TextRange.Font.Color.RGB = $purpleLight
            $h3.TextFrame.TextRange.Font.Bold = -1
            $yPos += 35
        } elseif ($line.StartsWith("H4:")) {
            $h4 = $slide.Shapes.AddTextbox(1, 40, $yPos, 600, 25)
            $h4.TextFrame.TextRange.Text = $line.Substring(3)
            $h4.TextFrame.TextRange.Font.Size = 18
            $h4.TextFrame.TextRange.Font.Color.RGB = $gray
            $h4.TextFrame.TextRange.Font.Bold = -1
            $yPos += 28
        } elseif ($line.StartsWith("BULLET:")) {
            $bullet = $slide.Shapes.AddTextbox(1, 60, $yPos, 600, 20)
            $bullet.TextFrame.TextRange.Text = "• " + $line.Substring(7)
            $bullet.TextFrame.TextRange.Font.Size = 14
            $bullet.TextFrame.TextRange.Font.Color.RGB = [System.Drawing.ColorTranslator]::FromHtml("#444444").ToArgb()
            $yPos += 22
        } elseif ($line.StartsWith("NORMAL:")) {
            $normal = $slide.Shapes.AddTextbox(1, 40, $yPos, 640, 20)
            $normal.TextFrame.TextRange.Text = $line.Substring(7)
            $normal.TextFrame.TextRange.Font.Size = 16
            $normal.TextFrame.TextRange.Font.Color.RGB = [System.Drawing.ColorTranslator]::FromHtml("#444444").ToArgb()
            $yPos += 24
        }
    }
    
    # Slide number
    $pageNum = $presentation.Slides.Count - 1
    $numBox = $slide.Shapes.AddTextbox(1, 650, 380, 50, 20)
    $numBox.TextFrame.TextRange.Text = "$pageNum / 21"
    $numBox.TextFrame.TextRange.Font.Size = 12
    $numBox.TextFrame.TextRange.Font.Color.RGB = $purpleLight
    $numBox.TextFrame.TextRange.Font.Bold = -1
}

# Slide 2: What is AptiTest
Add-ContentSlide -title "What is AptiTest?" -contentLines @(
    "NORMAL:AptiTest is a production-ready, full-stack web application for aptitude test preparation.",
    "NORMAL:It features dual portals for Students and Admins with real-time testing, analytics, and payment.",
    "H3:🎯 Project Vision",
    "NORMAL:Create an intuitive, scalable platform where students practice aptitude tests, track performance, and compete globally.",
    "H3:📊 Key Stats",
    "BULLET:2 User Portals (Student + Admin)",
    "BULLET:8 Question Types Supported",
    "BULLET:6 Test Categories",
    "BULLET:15+ Core Features"
)

# Slide 3: Tech Stack Frontend
Add-ContentSlide -title "Technology Stack - Frontend" -contentLines @(
    "BULLET:React 19 - Latest React with hooks",
    "BULLET:Vite 8 - Ultra-fast build tool",
    "BULLET:React Router 7 - Client-side routing",
    "BULLET:Axios - HTTP client with interceptors",
    "BULLET:Stripe React - Payment UI components",
    "BULLET:QR Code React - QR generation",
    "BULLET:CSS3 - Custom styling and themes",
    "BULLET:ES6+ - Modern JavaScript"
)

# Slide 4: Tech Stack Backend
Add-ContentSlide -title "Technology Stack - Backend" -contentLines @(
    "BULLET:Node.js - Runtime environment",
    "BULLET:Express 5 - Web framework",
    "BULLET:TypeScript - Type-safe development",
    "BULLET:PostgreSQL - Primary database",
    "BULLET:JWT - Authentication tokens",
    "BULLET:Bcrypt - Password hashing",
    "BULLET:SendGrid - Email service",
    "BULLET:Zod - Schema validation",
    "H3:💳 Payment Gateways",
    "BULLET:Razorpay - UPI, Cards, Net Banking, Indian methods, Webhook verification",
    "BULLET:Stripe - International cards, Payment Intents API, Secure checkout"
)

# Slide 5: System Architecture
Add-ContentSlide -title "System Architecture" -contentLines @(
    "H3:1️⃣ Presentation Layer",
    "BULLET:React SPA - Single Page Application",
    "BULLET:Responsive design - Mobile-first approach",
    "BULLET:Theme Context - Dark/Light mode",
    "BULLET:Toast notifications - User feedback",
    "BULLET:Protected routes - Auth-based access",
    "H3:2️⃣ Application Layer",
    "BULLET:RESTful API design",
    "BULLET:Express controllers",
    "BULLET:JWT middleware for auth",
    "BULLET:RBAC authorization",
    "BULLET:Payment webhooks",
    "H3:3️⃣ Data Layer",
    "BULLET:PostgreSQL database",
    "BULLET:Relational schema design",
    "BULLET:Indexed queries for performance",
    "BULLET:Transaction support",
    "BULLET:JSON columns for flexibility"
)

# Slide 6: Project Structure
Add-ContentSlide -title "Project Structure" -contentLines @(
    "H3:📁 Client (Frontend)",
    "BULLET:components/ - AdminLayout, Pagination, Common",
    "BULLET:contexts/ - ThemeContext, ToastContext",
    "BULLET:pages/ - Login, Signup, Dashboards",
    "BULLET:services/ - API, Auth, Test, Payment",
    "BULLET:styles/ - CSS modules",
    "H3:⚙️ Server (Backend)",
    "BULLET:config/ - Database, Seed data",
    "BULLET:controllers/ - Auth, Test, Payment",
    "BULLET:middleware/ - JWT verification",
    "BULLET:models/ - Data models",
    "BULLET:routes/ - API routes",
    "BULLET:services/ - Business logic",
    "BULLET:sql/ - Schema & migrations"
)

# Slide 7: Database Schema
Add-ContentSlide -title "Database Schema" -contentLines @(
    "H4:users - User accounts (id, email, password, role, status)",
    "H4:questions - Approved questions (id, category, difficulty, type)",
    "H4:review_pending_questions - Pending approval (id, status, parser_confidence)",
    "H4:test_templates - Test configurations (id, name, difficulty, is_paid)",
    "H4:test_sessions - Test attempts (id, user_id, status, score)",
    "H4:test_session_questions - Session questions",
    "H4:test_session_answers - User answers (is_correct, time_taken)",
    "H4:payments - Payment records (user_id, stripe_id, status)",
    "H3:🔗 Key Relationships",
    "NORMAL:users → test_sessions → test_session_questions → questions",
    "NORMAL:users → test_session_answers | users → payments"
)

# Slide 8: API Architecture
Add-ContentSlide -title "API Architecture" -contentLines @(
    "H3:🔐 Auth Routes (/auth)",
    "BULLET:POST /login - Authenticate user",
    "BULLET:POST /signup - Register user",
    "BULLET:POST /forgot-password - Send reset email",
    "BULLET:POST /reset-password - Update password",
    "BULLET:GET /verify-email - Verify account",
    "H3:📝 Test Routes (/test)",
    "BULLET:POST /test/start - Create test session",
    "BULLET:POST /test/answer - Save answer",
    "BULLET:POST /test/submit - Complete test",
    "BULLET:GET /test/history - User history",
    "BULLET:GET /leaderboard - Rankings",
    "H3:👤 Admin & Payment Routes",
    "BULLET:Admin: Review queue, Approve/Reject, Student management",
    "BULLET:Payment: Status check, Create intent, Razorpay orders"
)

# Slide 9: Authentication System
Add-ContentSlide -title "Authentication System" -contentLines @(
    "H3:🔑 Login Flow",
    "BULLET:Email/password validation with Zod",
    "BULLET:JWT token generation with role claim",
    "BULLET:Role-based redirects (student/admin)",
    "BULLET:localStorage token storage",
    "H3:✉️ Email Verification",
    "BULLET:SendGrid integration for transactional emails",
    "BULLET:Token-based verification link",
    "BULLET:Expiry timestamp check (24 hours)",
    "BULLET:Auto-redirect on success",
    "H3:🔒 Security",
    "BULLET:Axios request interceptors",
    "BULLET:Auto-logout on 401/403 errors",
    "BULLET:Email verification required",
    "BULLET:Banned user blocking"
)

# Slide 10: Student Portal Features
Add-ContentSlide -title "Student Portal Features" -contentLines @(
    "H3:📋 Test Templates",
    "NORMAL:Pre-configured test packages students can select",
    "BULLET:Easy 30 Qs (30 min) - FREE",
    "BULLET:Easy 60 Qs (60 min) - FREE",
    "BULLET:Hard 30 Qs (30 min) - FREE",
    "BULLET:Hard 60 Qs (60 min) - PAID",
    "H3:📊 Dashboard Analytics",
    "BULLET:Total tests attempted count",
    "BULLET:Average and highest score tracking",
    "BULLET:Overall accuracy percentage",
    "BULLET:Category-wise performance breakdown",
    "BULLET:Strengths and weaknesses identification",
    "H3:📝 Test History",
    "BULLET:Paginated history (10 per page)",
    "BULLET:Score, accuracy, time taken metrics",
    "BULLET:Test type and date filtering",
    "BULLET:Detailed review option",
    "BULLET:Reattempt functionality"
)

# Slide 11: Test Environment
Add-ContentSlide -title "Test Environment" -contentLines @(
    "H3:🧩 Supported Question Types",
    "NORMAL:MCQ Single | True/False | Fraction | Ratio | Numeric | Numeric + Unit | Data Interpretation | Fill in Blank",
    "H3:⏱️ Timer System",
    "BULLET:Server-synced countdown timer",
    "BULLET:server_expires_at timestamp",
    "BULLET:Auto-submit on timeout",
    "H3:🧭 Navigation",
    "BULLET:Flag questions for review",
    "BULLET:Next/Previous buttons",
    "BULLET:Progress indicator",
    "H3:💾 Auto-Save",
    "BULLET:Answer saved on selection",
    "BULLET:API call to /test/answer",
    "BULLET:Time tracking per question",
    "H3:📊 Results",
    "BULLET:Score breakdown by category",
    "BULLET:Time taken vs allocated",
    "BULLET:Question-by-question review"
)

# Slide 12: Admin Portal Features
Add-ContentSlide -title "Admin Portal Features" -contentLines @(
    "H3:📊 Dashboard",
    "BULLET:Pending review count display",
    "BULLET:Live approved questions stats",
    "BULLET:30-day test trends chart",
    "BULLET:Active categories count",
    "H3:❓ Question Management",
    "BULLET:Pending approval queue",
    "BULLET:Approve / Reject / Edit",
    "BULLET:8 question type support",
    "BULLET:Bulk operations",
    "H3:👥 Student Management",
    "BULLET:View all students list",
    "BULLET:Ban/Unban functionality",
    "BULLET:Individual student stats",
    "BULLET:Test history per student",
    "H3:🏆 Rankings & Templates",
    "BULLET:Global leaderboard by test type",
    "BULLET:Configure test templates",
    "BULLET:Set difficulty and duration",
    "BULLET:Paid/free configuration"
)

# Slide 13: Payment Integration
Add-ContentSlide -title "Payment Integration" -contentLines @(
    "H3:💳 Razorpay Payment Flow",
    "BULLET:1. User selects paid template",
    "BULLET:2. Client calls /create-order",
    "BULLET:3. Server creates Razorpay order",
    "BULLET:4. Checkout modal opens",
    "BULLET:5. User completes payment",
    "BULLET:6. Razorpay calls handler",
    "BULLET:7. Client sends to /verify",
    "BULLET:8. Server verifies signature",
    "BULLET:9. Access granted!",
    "H3:🔐 Security Measures",
    "BULLET:Webhook signature verification (HMAC)",
    "BULLET:Order ID unique per attempt",
    "BULLET:Payment status tracking",
    "BULLET:User + test_idempotency unique constraint"
)

# Slide 14: Challenges & Solutions
Add-ContentSlide -title "Challenges & Solutions" -contentLines @(
    "H3:⏰ Challenge 1: Test Timer Synchronization",
    "NORMAL:Client-side timer could be manipulated.",
    "H4:✅ Solution: Server-Authoritative Timer",
    "BULLET:server_expires_at stored in database",
    "BULLET:Client calculates from server time",
    "BULLET:Auto-submit on server expiry",
    "H3:🧩 Challenge 2: Multi-Question Type Rendering",
    "NORMAL:8 different types required unique UI and logic.",
    "H4:✅ Solution: Dynamic Component Rendering",
    "BULLET:Switch statement by question_type",
    "BULLET:Each type has dedicated input component",
    "BULLET:Normalized answer format"
)

# Slide 15: More Challenges & Solutions
Add-ContentSlide -title "More Challenges & Solutions" -contentLines @(
    "H3:💳 Challenge 3: Payment Security",
    "NORMAL:Preventing duplicate charges and ensuring verification.",
    "H4:✅ Solution: Idempotency & Signature Verification",
    "BULLET:UUID-based idempotency keys",
    "BULLET:Razorpay HMAC signature check",
    "BULLET:Database unique constraints",
    "H3:💾 Challenge 4: State Management During Tests",
    "NORMAL:User might refresh, close tab, or lose connection.",
    "H4:✅ Solution: Auto-Save & Session Recovery",
    "BULLET:Auto-save on every answer change",
    "BULLET:beforeunload event warning",
    "BULLET:Resume in_progress sessions",
    "H3:🔐 Challenge 5: Role-Based Access Control",
    "NORMAL:Different features for students vs admins.",
    "H4:✅ Solution: JWT Claims + Middleware",
    "BULLET:Role claim in JWT tokens",
    "BULLET:Express middleware validation",
    "BULLET:Frontend route guards"
)

# Slide 16: Testing Strategy
Add-ContentSlide -title "Testing Strategy" -contentLines @(
    "H3:✅ Manual Testing Performed",
    "BULLET:User registration flow end-to-end",
    "BULLET:Email verification with real emails",
    "BULLET:Login with various credentials",
    "BULLET:Test taking with all 8 question types",
    "BULLET:Timer behavior and auto-submit",
    "BULLET:Payment flow with Razorpay test mode",
    "BULLET:Admin CRUD operations",
    "BULLET:Mobile responsive design",
    "H3:🔍 Edge Cases Tested",
    "BULLET:Empty form submissions",
    "BULLET:Invalid email formats",
    "BULLET:Token expiration scenarios",
    "BULLET:Concurrent test attempts",
    "BULLET:Network failure during payment",
    "BULLET:Large question sets (60+ questions)"
)

# Slide 17: Hosting & Deployment
Add-ContentSlide -title "Hosting & Deployment" -contentLines @(
    "H3:☁️ Render (Backend API)",
    "BULLET:URL: https://aptitest-5i2d.onrender.com",
    "BULLET:Node.js + Express API",
    "BULLET:PostgreSQL on Render",
    "BULLET:Auto-deploy from GitHub",
    "H3:▲ Vercel (Frontend)",
    "BULLET:URL: https://aptitest.vercel.app",
    "BULLET:React SPA with Vite",
    "BULLET:Preview deploys for PRs",
    "BULLET:Edge CDN for fast access",
    "H3:🗄️ Database",
    "BULLET:Render PostgreSQL",
    "BULLET:Automated daily backups",
    "BULLET:Connection pooling with pg",
    "BULLET:SSL connections enforced",
    "H3:🔄 CI/CD Flow",
    "NORMAL:GitHub → Render/Vercel → Live (Zero-downtime deployment)"
)

# Slide 18: Key Project Highlights
Add-ContentSlide -title "Key Project Highlights" -contentLines @(
    "H3:🎯 Real-World Problem Solved",
    "NORMAL:Complete aptitude testing ecosystem - institutions administer tests, students practice, admins manage content.",
    "H3:📱 Responsive Design",
    "BULLET:Mobile-first approach ensuring tests work on all devices",
    "H3:⚡ Performance Optimized",
    "BULLET:Vite for fast development and production bundles",
    "H3:🔒 Security First",
    "BULLET:JWT authentication, secure payments, validation",
    "H3:📊 Data Analytics",
    "BULLET:Performance tracking with category breakdowns"
)

# Slide 19: My Contributions
Add-ContentSlide -title "My Contributions" -contentLines @(
    "H3:💻 Frontend Development",
    "BULLET:Built React 19 frontend with modern hooks",
    "BULLET:Responsive design with CSS Grid/Flexbox",
    "BULLET:Created reusable components (Pagination, ThemeToggle)",
    "BULLET:Dynamic question rendering for 8 types",
    "BULLET:Student dashboard with real-time analytics",
    "H3:⚙️ Backend Integration",
    "BULLET:JWT authentication with email verification",
    "BULLET:Razorpay payment with signature verification",
    "BULLET:Axios interceptors for token management",
    "BULLET:Admin dashboard with question/student management",
    "H3:🚀 DevOps & Documentation",
    "BULLET:Vite build configuration",
    "BULLET:Comprehensive test documentation",
    "BULLET:Render and Vercel deployment",
    "BULLET:Error boundaries and fallback UI"
)

# Slide 20: Future Enhancements
Add-ContentSlide -title "Future Enhancements" -contentLines @(
    "H3:✨ Planned Features",
    "BULLET:AI-powered question recommendations",
    "BULLET:Video explanations for solutions",
    "BULLET:Peer comparison analytics",
    "BULLET:Mobile app (React Native)",
    "BULLET:Offline test mode with sync",
    "BULLET:Batch import from Excel/PDF",
    "H3:🔧 Technical Improvements",
    "BULLET:Redis for caching",
    "BULLET:WebSocket for real-time updates",
    "BULLET:Unit tests (Jest, React Testing Library)",
    "BULLET:E2E tests (Cypress)",
    "BULLET:Docker containerization",
    "BULLET:Kubernetes orchestration",
    "H3:💼 Business Expansion",
    "BULLET:Multi-tenant support for institutes",
    "BULLET:White-label option",
    "BULLET:LMS integration"
)

# Slide 21: Thank You
$slideLast = $presentation.Slides.Add($presentation.Slides.Count + 1, [Microsoft.Office.Interop.PowerPoint.PpSlideLayout]::ppLayoutBlank)
$shapeLast = $slideLast.Shapes.AddShape(1, 0, 0, 720, 405)
$shapeLast.Fill.ForeColor.RGB = $purpleDark
$shapeLast.Fill.TwoColorGradient(1, 1)
$shapeLast.Fill.ForeColor.RGB = $purpleLight
$shapeLast.Fill.BackColor.RGB = [System.Drawing.ColorTranslator]::FromHtml("#764ba2").ToArgb()
$shapeLast.Line.Visible = 0

$thankYouTitle = $slideLast.Shapes.AddTextbox(1, 50, 130, 620, 80)
$thankYouTitle.TextFrame.TextRange.Text = "🙏 Thank You!"
$thankYouTitle.TextFrame.TextRange.Font.Size = 60
$thankYouTitle.TextFrame.TextRange.Font.Bold = -1
$thankYouTitle.TextFrame.TextRange.Font.Color.RGB = $white
$thankYouTitle.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$questions = $slideLast.Shapes.AddTextbox(1, 50, 220, 620, 40)
$questions.TextFrame.TextRange.Text = "Questions & Discussion"
$questions.TextFrame.TextRange.Font.Size = 26
$questions.TextFrame.TextRange.Font.Color.RGB = $white
$questions.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$techStack = $slideLast.Shapes.AddTextbox(1, 50, 280, 620, 30)
$techStack.TextFrame.TextRange.Text = "React 19 + Node.js + PostgreSQL + Razorpay"
$techStack.TextFrame.TextRange.Font.Size = 14
$techStack.TextFrame.TextRange.Font.Color.RGB = $white
$techStack.TextFrame.TextRange.ParagraphFormat.Alignment = 2
$techStack.TextFrame.TextRange.Font.Transparency = 0.3

$demo = $slideLast.Shapes.AddTextbox(1, 50, 320, 620, 30)
$demo.TextFrame.TextRange.Text = "🎮 Live Demo Available"
$demo.TextFrame.TextRange.Font.Size = 14
$demo.TextFrame.TextRange.Font.Color.RGB = $white
$demo.TextFrame.TextRange.ParagraphFormat.Alignment = 2
$demo.TextFrame.TextRange.Font.Transparency = 0.2

# Save the presentation
$outputPath = "C:\Users\User\Desktop\ai_logics\aptitest\AptiTest-Presentation.pptx"
$presentation.SaveAs($outputPath, 24) # ppSaveAsOpenXMLPresentation = 24

Write-Host "✅ Presentation saved to: $outputPath" -ForegroundColor Green

# Close PowerPoint
$presentation.Close()
$ppt.Quit()

# Release COM objects
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($presentation) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Host "🎉 Done! The PPTX file is ready with 21 slides (16:9 aspect ratio)" -ForegroundColor Green
