package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.service.*;
import com.aptitest.web.form.SignupForm;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AuthController {
    private final AccountService accounts;
    @Value("${app.demo-enabled}") private boolean demo;
    public AuthController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/") public String home(@AuthenticationPrincipal AppPrincipal p) { return "redirect:" + (p == null ? "/login" : "ADMIN".equals(p.getRole()) ? "/admin" : "/dashboard"); }
    @GetMapping("/login") public String login(@AuthenticationPrincipal AppPrincipal p) { return p == null ? "login" : home(p); }
    @GetMapping("/signup") public String signup(Model model) { model.addAttribute("form", new SignupForm()); return "signup"; }
    @PostMapping("/signup") public String signup(@Valid @ModelAttribute("form") SignupForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        if (binding.hasErrors()) { model.addAttribute("errors", errors(binding)); return "signup"; }
        try {
            String path = accounts.signup(form);
            flash.addFlashAttribute("success", "Account created. Verify your email before signing in.");
            if (demo) flash.addFlashAttribute("verificationLink", path);
            return "redirect:/login";
        } catch (BusinessException e) { model.addAttribute("errors", e.getMessage()); return "signup"; }
    }
    @GetMapping("/verify-email") public String verify(@RequestParam(defaultValue = "") String token, RedirectAttributes flash) {
        try { accounts.verifyEmail(token); flash.addFlashAttribute("success", "Email verified. You can now sign in."); }
        catch (BusinessException e) { flash.addFlashAttribute("error", e.getMessage()); }
        return "redirect:/login";
    }
    @GetMapping("/forgot-password") public String forgot() { return "forgot-password"; }
    @PostMapping("/forgot-password") public String forgot(@RequestParam(defaultValue = "") String email, Model model) {
        if (email.length() > 254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) { model.addAttribute("errors", "Enter a valid email address."); return "forgot-password"; }
        accounts.requestReset(email);
        model.addAttribute("success", "If a verified, active account exists for this email, a password-reset link has been sent.");
        return "forgot-password";
    }
    @GetMapping("/reset-password") public String reset(@RequestParam(defaultValue = "") String token, Model model) { model.addAttribute("token", token); return "reset-password"; }
    @PostMapping("/reset-password") public String reset(@RequestParam(defaultValue = "") String token, @RequestParam(defaultValue = "") String password,
            @RequestParam(defaultValue = "") String confirmPassword, Model model, RedirectAttributes flash) {
        try {
            accounts.resetPassword(token, password, confirmPassword);
            flash.addFlashAttribute("success", "Password reset successfully. Sign in with your new password."); return "redirect:/login";
        } catch (BusinessException e) { model.addAttribute("token", token); model.addAttribute("errors", e.getMessage()); return "reset-password"; }
    }
    public static String errors(BindingResult binding) { return String.join(" · ", binding.getAllErrors().stream().map(e -> e.getDefaultMessage()).toList()); }
}
