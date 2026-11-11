package com.aptitest.config;

import com.aptitest.repository.UserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/** A ban or password reset also revokes already authenticated sessions. */
public class AccountStateFilter extends OncePerRequestFilter {
    private final UserRepository users;
    public AccountStateFilter(UserRepository users) { this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppPrincipal principal) {
            var user = users.findById(principal.getId());
            if (user.isEmpty() || !user.get().isEnabled() || !user.get().isEmailVerified()
                    || user.get().getCredentialsVersion() != principal.getCredentialsVersion()) {
                SecurityContextHolder.clearContext();
                if (request.getSession(false) != null) request.getSession(false).invalidate();
                response.sendRedirect(request.getContextPath() + "/login?expired");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
