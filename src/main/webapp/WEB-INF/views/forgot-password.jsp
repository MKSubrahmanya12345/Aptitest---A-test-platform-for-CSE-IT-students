<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ include file="fragments/taglibs.jspf" %>
<t:layout title="Forgot password" publicPage="true">
    <a class="back-link" href="${ctx}/login">← Back to sign in</a><span class="eyebrow">LET'S GET YOU BACK IN</span><h1>Forgot your password?</h1><p class="auth-subtitle">Enter the email address on your account. We will send a reset link valid for 30 minutes.</p>
    <%@ include file="fragments/notices.jspf" %>
    <form method="post" action="${ctx}/forgot-password"><t:csrf/><div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required></div><button class="btn btn-block" type="submit">Send reset link <t:icon name="arrow"/></button></form>
    <c:if test="${outboxEnabled}"><div class="notice info">Contact your administrator to retrieve the recovery message from the protected email outbox. Recovery links are never shown to anonymous visitors.</div></c:if>
</t:layout>
