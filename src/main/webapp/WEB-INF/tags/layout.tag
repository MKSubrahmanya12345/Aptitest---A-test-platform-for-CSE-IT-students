<%@ tag pageEncoding="UTF-8" body-content="scriptless" %>
<%@ attribute name="title" required="true" type="java.lang.String" %>
<%@ attribute name="publicPage" required="false" type="java.lang.Boolean" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<%@ taglib prefix="fn" uri="jakarta.tags.functions" %>
<%@ taglib prefix="t" tagdir="/WEB-INF/tags" %>
<c:set var="contextPath" value="${pageContext.request.contextPath}"/>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="AptiTest — aptitude and technical practice for CSE and IT students.">
    <meta name="color-scheme" content="light dark">
    <title><c:out value="${title}"/> · AptiTest</title>
    <link rel="stylesheet" href="${contextPath}/css/app.css">
    <script src="${contextPath}/js/app.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<svg class="sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
<symbol id="i-logo" viewBox="0 0 24 24"><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M12 5v16M12 5C8 2 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-2-10 1Z"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 3v17h17M8 15l4-5 4 2 5-7"/></symbol>
<symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 3h8v7a4 4 0 0 1-8 0V3Zm4 11v6m-4 1h8M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m0-17a4 4 0 0 1 0 8m3 4a5 5 0 0 1 3 5"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L20 5"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></symbol>
<symbol id="i-logout" viewBox="0 0 24 24"><path d="M9 4H4v16h5m5-13 5 5-5 5m-5-5h10"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></symbol>
</defs></svg>
<c:choose><c:when test="${publicPage or empty currentUser}">
<div class="auth-shell">
    <aside class="auth-story">
        <a class="brand" href="${contextPath}/"><span class="brand-mark"><t:icon name="logo"/></span>AptiTest<span class="brand-dot">.</span></a>
        <div class="story-copy"><span class="eyebrow">PRACTICE WITH PURPOSE</span><h1>Your next<br>opportunity<br>starts here<span>.</span></h1><p>A little practice. A clearer path.<br>Build the skills to take on your next big test.</p>
        <div class="story-check"><t:icon name="check"/> Aptitude &amp; technical questions</div><div class="story-check"><t:icon name="chart"/> Progress you can actually see</div><div class="story-check"><t:icon name="trophy"/> Built for CSE &amp; IT students</div></div>
        <div class="story-bottom"><span class="mini-line"></span> ONE QUESTION CLOSER.</div>
    </aside>
    <main id="main" class="auth-main"><button class="theme-button auth-theme" type="button" data-theme-toggle aria-label="Toggle color theme"><t:icon name="sun"/></button><div class="auth-content"><jsp:doBody/></div><footer class="auth-footer">AptiTest &copy; 2026 · Spring Boot + JSP</footer></main>
</div>
</c:when><c:otherwise>
<div class="app-shell">
<aside class="sidebar" id="sidebar">
    <a class="brand" href="${contextPath}/"><span class="brand-mark"><t:icon name="logo"/></span>AptiTest<span class="brand-dot">.</span></a>
    <div class="workspace-label">${currentUser.role == 'ADMIN' ? 'ADMIN WORKSPACE' : 'YOUR LEARNING SPACE'}</div>
    <nav aria-label="Main navigation">
        <c:choose><c:when test="${currentUser.role == 'ADMIN'}">
        <a class="nav-link ${requestPath == '/admin' ? 'active' : ''}" href="${contextPath}/admin"><t:icon name="home"/>Overview</a>
        <a class="nav-link ${fn:contains(requestPath,'questions') ? 'active' : ''}" href="${contextPath}/admin/manage-questions"><t:icon name="book"/>Question bank</a>
        <a class="nav-link ${fn:contains(requestPath,'test-templates') ? 'active' : ''}" href="${contextPath}/admin/test-templates"><t:icon name="check"/>Test templates</a>
        <a class="nav-link ${fn:contains(requestPath,'view-students') ? 'active' : ''}" href="${contextPath}/admin/view-students"><t:icon name="users"/>Students</a>
        <a class="nav-link ${fn:contains(requestPath,'rankings') ? 'active' : ''}" href="${contextPath}/admin/rankings"><t:icon name="trophy"/>Rankings</a>
        <c:if test="${demoEnabled}"><a class="nav-link ${requestPath == '/admin/mail' ? 'active' : ''}" href="${contextPath}/admin/mail"><t:icon name="book"/>Demo email outbox</a></c:if>
        </c:when><c:otherwise>
        <a class="nav-link ${requestPath == '/dashboard' ? 'active' : ''}" href="${contextPath}/dashboard"><t:icon name="home"/>Overview</a>
        <a class="nav-link ${fn:startsWith(requestPath,'/tests') ? 'active' : ''}" href="${contextPath}/dashboard#practice"><t:icon name="book"/>Practice tests</a>
        <a class="nav-link ${requestPath == '/history' ? 'active' : ''}" href="${contextPath}/history"><t:icon name="clock"/>Test history</a>
        <a class="nav-link ${requestPath == '/solved' ? 'active' : ''}" href="${contextPath}/solved"><t:icon name="check"/>Solved questions</a>
        <a class="nav-link ${requestPath == '/rankings' ? 'active' : ''}" href="${contextPath}/rankings"><t:icon name="trophy"/>Rankings</a>
        </c:otherwise></c:choose>
        <div class="nav-divider"></div>
        <a class="nav-link ${requestPath == '/profile' ? 'active' : ''}" href="${contextPath}/profile"><t:icon name="user"/>My profile</a>
    </nav>
    <div class="sidebar-note"><div class="small-star">✦</div><strong>Consistency is a skill.</strong><p>Make a little room for practice today.</p></div>
    <div class="sidebar-bottom"><span class="avatar">${fn:toUpperCase(fn:substring(currentUser.name,0,1))}</span><div><strong><c:out value="${currentUser.name}"/></strong><span>${currentUser.role == 'ADMIN' ? 'Administrator' : 'Student account'}</span></div><form method="post" action="${contextPath}/logout"><t:csrf/><button type="submit" class="icon-button" aria-label="Sign out"><t:icon name="logout"/></button></form></div>
</aside>
<div class="workspace">
    <header class="topbar"><div class="topbar-left"><button type="button" class="icon-button mobile-menu" data-menu-toggle aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">☰</button><span class="breadcrumb">Workspace <span>/</span> <strong><c:out value="${title}"/></strong></span></div><div class="topbar-right"><c:if test="${demoEnabled}"><span class="demo-badge"><i></i>Demo mode</span></c:if><button class="theme-button" type="button" data-theme-toggle aria-label="Toggle color theme"><t:icon name="sun"/></button><span class="top-avatar">${fn:toUpperCase(fn:substring(currentUser.name,0,1))}</span></div></header>
    <main id="main" class="page-content"><jsp:doBody/></main>
    <footer class="workspace-footer"><span>AptiTest · Built for your next step.</span><span>Spring Boot + Java + JSP</span></footer>
</div>
</div>
</c:otherwise></c:choose>
</body></html>
