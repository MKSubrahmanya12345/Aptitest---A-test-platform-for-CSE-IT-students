<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ include file="fragments/taglibs.jspf" %>
<t:layout title="Reset password" publicPage="true">
    <a class="back-link" href="${ctx}/login">← Back to sign in</a><span class="eyebrow">A CLEAN SLATE</span><h1>Set a new password.</h1><p class="auth-subtitle">Choose a password with at least 8 characters. Previous sessions will be signed out.</p>
    <%@ include file="fragments/notices.jspf" %>
    <form method="post" action="${ctx}/reset-password"><t:csrf/><input type="hidden" name="token" value="<c:out value='${token}'/>"><div class="field"><label for="password">New password</label><input id="password" name="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div><div class="field"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div><button class="btn btn-block" type="submit">Reset password <t:icon name="arrow"/></button></form>
</t:layout>
