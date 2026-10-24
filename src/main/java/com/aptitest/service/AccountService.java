package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.UserRepository;
import com.aptitest.web.form.SignupForm;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final MailService mail;
    private final SecureRandom random = new SecureRandom();

    public AccountService(UserRepository users, PasswordEncoder passwords, MailService mail) {
        this.users = users; this.passwords = passwords; this.mail = mail;
    }
    public AppUser get(Long id) { return users.findById(id).orElseThrow(() -> new BusinessException("Account not found.")); }

    @Transactional
    public String signup(SignupForm form) {
        validatePassword(form.getPassword());
        if (!form.getPassword().equals(form.getConfirmPassword())) throw new BusinessException("Passwords do not match.");
        String email = form.getEmail().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException("An account with that email already exists.");
        AppUser user = new AppUser();
        user.setName(form.getName().trim()); user.setEmail(email); user.setPasswordHash(passwords.encode(form.getPassword()));
        user.setRole(Role.STUDENT);
        String token = token();
        user.setVerificationHash(hash(token)); user.setVerificationExpires(Instant.now().plus(Duration.ofHours(24)));
        users.saveAndFlush(user);
        String path = "/verify-email?token=" + token;
        mail.sendLink(email, "Verify your AptiTest email", path);
        return path;
    }
    @Transactional
    public void verifyEmail(String token) {
        AppUser user = users.findByVerificationHash(hash(token)).orElseThrow(() -> new BusinessException("Invalid or expired verification link."));
        if (user.getVerificationExpires() == null || !Instant.now().isBefore(user.getVerificationExpires())) throw new BusinessException("Verification link has expired.");
        user.setEmailVerified(true); user.setVerificationHash(null); user.setVerificationExpires(null);
    }
    @Transactional
    public void requestReset(String email) {
        var maybe = users.findByEmailIgnoreCase(email.trim());
        if (maybe.isEmpty() || !maybe.get().isEmailVerified() || !maybe.get().isEnabled()) return;
        AppUser user = maybe.get();
        String token = token();
        user.setResetHash(hash(token)); user.setResetExpires(Instant.now().plus(Duration.ofMinutes(30)));
        mail.sendLink(user.getEmail(), "Reset your AptiTest password", "/reset-password?token=" + token);
    }
    @Transactional
    public void resetPassword(String token, String password, String confirm) {
        validatePassword(password);
        if (!password.equals(confirm)) throw new BusinessException("Passwords do not match.");
        AppUser user = users.findByResetHash(hash(token)).orElseThrow(() -> new BusinessException("Invalid or expired reset link."));
        if (user.getResetExpires() == null || !Instant.now().isBefore(user.getResetExpires())) throw new BusinessException("Reset link has expired.");
        user.setPasswordHash(passwords.encode(password)); user.setResetHash(null); user.setResetExpires(null);
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
    }
    @Transactional
    public void updateName(Long id, String name) {
        if (name == null || name.trim().isEmpty() || name.trim().length() > 100) throw new BusinessException("Name must contain 1–100 characters.");
        get(id).setName(name.trim());
    }
    @Transactional
    public void changePassword(Long id, String current, String password, String confirm) {
        AppUser user = get(id);
        if (current == null || !passwords.matches(current, user.getPasswordHash())) throw new BusinessException("Current password is incorrect.");
        validatePassword(password);
        if (!password.equals(confirm)) throw new BusinessException("Passwords do not match.");
        user.setPasswordHash(passwords.encode(password));
        user.setResetHash(null); user.setResetExpires(null);
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
    }
    @Transactional
    public void setStudentEnabled(Long id, boolean enabled) {
        AppUser user = get(id);
        if (user.getRole() != Role.STUDENT) throw new BusinessException("Only student accounts can be changed here.");
        user.setEnabled(enabled);
        user.setCredentialsVersion(user.getCredentialsVersion() + 1);
    }
    public static void validatePassword(String password) {
        if (password == null || password.length() < 8 || password.getBytes(StandardCharsets.UTF_8).length > 72) throw new BusinessException("Password must be at least 8 characters and at most 72 UTF-8 bytes.");
    }
    private String token() { byte[] bytes = new byte[32]; random.nextBytes(bytes); return HexFormat.of().formatHex(bytes); }
    public static String hash(String token) {
        if (token == null || token.length() != 64) throw new BusinessException("Invalid or expired link.");
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
