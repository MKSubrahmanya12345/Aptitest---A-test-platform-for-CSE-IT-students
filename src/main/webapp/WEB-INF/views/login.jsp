<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ include file="fragments/taglibs.jspf" %>
<t:layout title="Sign in" publicPage="true">
    <span class="eyebrow">GOOD TO SEE YOU AGAIN</span><h1>Welcome back.</h1><p class="auth-subtitle">Pick up where you left off. Your next step starts with a little practice.</p>
    <%@ include file="fragments/notices.jspf" %>
    <c:if test="${param.error != null}"><div class="notice danger" role="alert">Invalid email or password, or this account is unverified or disabled.</div></c:if>
    <c:if test="${param.logout != null}"><div class="notice success" role="status">You have signed out securely.</div></c:if>
    <c:if test="${param.expired != null}"><div class="notice info" role="status">Your session or account has changed. Please sign in again.</div></c:if>
    <c:if test="${param.passwordChanged != null}"><div class="notice success" role="status">Password changed. Sign in with your new password.</div></c:if>
    <c:if test="${demoEnabled and not empty verificationLink}"><div class="notice info">Demo email preview — no external email was sent.<a href="${ctx}<c:out value='${verificationLink}'/>">Verify your new account →</a></div></c:if>
    <form method="post" action="${ctx}/login"><t:csrf/>
        <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="username" placeholder="you@example.com" maxlength="254" required autofocus></div>
        <div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" maxlength="72" required><button class="password-toggle" type="button" data-password-toggle="password" aria-label="Show or hide password" aria-pressed="false">Show</button></div></div>
        <div class="auth-form-row"><a href="${ctx}/forgot-password">Forgot password?</a></div><button class="btn btn-block" type="submit">Sign in <t:icon name="arrow"/></button>
    </form>
    <p class="auth-switch">New to AptiTest? <a href="${ctx}/signup">Create an account</a></p>
    <c:if test="${demoEnabled}"><div class="demo-credentials"><strong>EXPLORE THE DEMO</strong><div class="credential-row"><span>Student</span><code>student@aptitest.com</code></div><div class="credential-row"><span>Password</span><code>Student@12345</code></div><div class="credential-row"><span>Admin</span><code>admin@aptitest.com</code></div><div class="credential-row"><span>Password</span><code>Admin@12345</code></div></div></c:if>
</t:layout>
