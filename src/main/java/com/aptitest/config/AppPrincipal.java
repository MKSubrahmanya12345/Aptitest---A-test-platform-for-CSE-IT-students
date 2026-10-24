package com.aptitest.config;

import com.aptitest.domain.AppUser;
import java.util.*;
import org.springframework.security.core.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppPrincipal implements UserDetails {
    private static final long serialVersionUID = 1L;
    private final Long id;
    private final String email;
    private final String password;
    private final String role;
    private final boolean enabled;
    private final int credentialsVersion;

    public AppPrincipal(AppUser user) {
        id = user.getId(); email = user.getEmail(); password = user.getPasswordHash();
        role = user.getRole().name(); enabled = user.isEnabled() && user.isEmailVerified();
        credentialsVersion = user.getCredentialsVersion();
    }
    public Long getId() { return id; }
    public int getCredentialsVersion() { return credentialsVersion; }
    public String getRole() { return role; }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return password; }
    @Override public boolean isEnabled() { return enabled; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return List.of(new SimpleGrantedAuthority("ROLE_" + role)); }
}
