package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.UserRepository;
import com.aptitest.web.form.SignupForm;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder passwords;

    public AccountService(UserRepository users, PasswordEncoder passwords) {
        this.users = users; this.passwords = passwords;
    }
    public AppUser get(Long id) { return users.findById(id).orElseThrow(() -> new BusinessException("Account not found.")); }

    @Transactional
    public AppUser signup(SignupForm form) {
        validatePassword(form.getPassword());
        if (!form.getPassword().equals(form.getConfirmPassword())) throw new BusinessException("Passwords do not match.");
        String email = form.getEmail().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new BusinessException("An account with that email already exists.");
        AppUser user = new AppUser();
        user.setName(form.getName().trim()); user.setEmail(email); user.setPasswordHash(passwords.encode(form.getPassword()));
        user.setRole(Role.STUDENT);
        user.setEnabled(true);
        return users.saveAndFlush(user);
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
}
