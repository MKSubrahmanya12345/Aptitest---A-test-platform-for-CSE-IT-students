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
    @Column(nullable = false)
    private boolean emailVerified = false;
    @Column(nullable = false)
    private int credentialsVersion = 0;
    @Column(length = 64)
    private String verificationHash;
    private Instant verificationExpires;
    @Column(length = 64)
    private String resetHash;
    private Instant resetExpires;
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
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public int getCredentialsVersion() { return credentialsVersion; }
    public void setCredentialsVersion(int credentialsVersion) { this.credentialsVersion = credentialsVersion; }
    public String getVerificationHash() { return verificationHash; }
    public void setVerificationHash(String verificationHash) { this.verificationHash = verificationHash; }
    public Instant getVerificationExpires() { return verificationExpires; }
    public void setVerificationExpires(Instant verificationExpires) { this.verificationExpires = verificationExpires; }
    public String getResetHash() { return resetHash; }
    public void setResetHash(String resetHash) { this.resetHash = resetHash; }
    public Instant getResetExpires() { return resetExpires; }
    public void setResetExpires(Instant resetExpires) { this.resetExpires = resetExpires; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
