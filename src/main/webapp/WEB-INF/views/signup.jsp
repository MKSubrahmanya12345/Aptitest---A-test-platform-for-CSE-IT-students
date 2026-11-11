<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ include file="fragments/taglibs.jspf" %>
<t:layout title="Create account" publicPage="true">
    <span class="eyebrow">A FRESH START</span><h1>Make progress yours.</h1><p class="auth-subtitle">Create your free student account and build a practice habit that sticks.</p>
    <%@ include file="fragments/notices.jspf" %>
    <form method="post" action="${ctx}/signup"><t:csrf/>
        <div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" maxlength="100" placeholder="Your full name" value="<c:out value='${form.name}'/>" required></div>
        <div class="field"><label for="email">Email address</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" value="<c:out value='${form.email}'/>" required></div>
        <div class="field"><label for="password">Password</label><div class="password-wrap"><input id="password" name="password" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="At least 8 characters" required><button class="password-toggle" type="button" data-password-toggle="password" aria-label="Show or hide password">Show</button></div></div>
        <div class="field"><label for="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="72" autocomplete="new-password" placeholder="One more time" required></div>
        <p class="field-help">We will send you a verification link. Only student accounts can be created here.</p><button class="btn btn-block" type="submit">Create account <t:icon name="arrow"/></button>
    </form><p class="auth-switch">Already have an account? <a href="${ctx}/login">Sign in</a></p>
</t:layout>
