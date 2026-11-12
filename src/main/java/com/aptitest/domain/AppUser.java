package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Version
    private long version;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true, length = 254)
    private String email;
    @Column(nullable = false, length = 100)
    private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12)
    private Role role = Role.STUDENT;
    @Column(nullable = false)
    private boolean enabled = true;
    // Retained only for existing MySQL schemas with a NOT NULL legacy column.
    // This value is not used for authentication or account approval.
    @Column(name = "email_verified", nullable = false)
    private boolean legacyAccountFlag = true;
    @Column(nullable = false)
    private int credentialsVersion = 0;
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public int getCredentialsVersion() { return credentialsVersion; }
    public void setCredentialsVersion(int credentialsVersion) { this.credentialsVersion = credentialsVersion; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
