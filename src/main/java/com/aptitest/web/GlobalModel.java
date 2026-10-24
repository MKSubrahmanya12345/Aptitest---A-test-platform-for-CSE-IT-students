package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@ControllerAdvice
public class GlobalModel {
    private final UserRepository users;
    public GlobalModel(UserRepository users) { this.users = users; }
    @Value("${app.demo-enabled}") private boolean demoEnabled;
    @ModelAttribute("demoEnabled") public boolean demoEnabled() { return demoEnabled; }
    @ModelAttribute("currentUser") public Object currentUser(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof AppPrincipal p) return users.findById(p.getId()).orElse(null);
        return null;
    }
    @ModelAttribute("requestPath") public String requestPath(HttpServletRequest request) { return request.getRequestURI().substring(request.getContextPath().length()); }
}
