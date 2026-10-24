<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ include file="fragments/taglibs.jspf" %>
<t:layout title="Forgot password" publicPage="true">
    <a class="back-link" href="${ctx}/login">← Back to sign in</a><span class="eyebrow">LET'S GET YOU BACK IN</span><h1>Forgot your password?</h1><p class="auth-subtitle">Enter the email address on your account. We will send a reset link valid for 30 minutes.</p>
    <%@ include file="fragments/notices.jspf" %>
    <form method="post" action="${ctx}/forgot-password"><t:csrf/><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required></div><button class="btn btn-block" type="submit">Send reset link <t:icon name="arrow"/></button></form>
    <c:if test="${demoEnabled}"><div class="demo-credentials"><strong>DEMO EMAIL DELIVERY</strong>External email is disabled in demo mode. An administrator can find the link in the protected <em>Demo email outbox</em>. Reset links are never shown to anonymous visitors.</div></c:if>
</t:layout>
