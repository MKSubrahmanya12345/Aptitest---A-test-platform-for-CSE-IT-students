package com.aptitest.config;

import com.aptitest.repository.UserRepository;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return email -> new AppPrincipal(users.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password")));
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, UserRepository users,
            @org.springframework.beans.factory.annotation.Value("${app.preview-embedding:false}") boolean previewEmbedding,
            @org.springframework.beans.factory.annotation.Value("${app.demo-enabled}") boolean demoEnabled) throws Exception {
        http.authorizeHttpRequests(r -> r
                .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()
                .requestMatchers("/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/css/**", "/js/**", "/error", "/api/health").permitAll()
                .requestMatchers("/admin/**", "/review").hasRole("ADMIN")
                .requestMatchers("/dashboard", "/tests/**", "/history", "/solved", "/checkout/**").hasRole("STUDENT")
                .anyRequest().authenticated())
            .formLogin(f -> f.loginPage("/login").usernameParameter("email")
                .successHandler((request, response, authentication) -> {
                    boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                    response.sendRedirect(request.getContextPath() + (admin ? "/admin" : "/dashboard"));
                }).failureUrl("/login?error").permitAll())
            .logout(l -> l.logoutUrl("/logout").logoutSuccessUrl("/login?logout").invalidateHttpSession(true).deleteCookies("JSESSIONID"))
            .exceptionHandling(e -> e.accessDeniedPage("/forbidden"))
            .addFilterAfter(new AccountStateFilter(users), UsernamePasswordAuthenticationFilter.class);
        if (previewEmbedding && demoEnabled) {
            // Preview embedding is opt-in; normal deployments retain Spring Security's DENY header.
            http.headers(h -> h.frameOptions(f -> f.disable()).contentSecurityPolicy(c -> c.policyDirectives(
                "frame-ancestors 'self' https://arena.ai https://*.arena.ai https://lmarena.ai https://*.lmarena.ai https://*.e2b.app")));
        }
        return http.build(); // CSRF and all other secure default headers remain enabled.
    }
}
