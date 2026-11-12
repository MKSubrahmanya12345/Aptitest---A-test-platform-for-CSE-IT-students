package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.service.*;
import com.aptitest.web.form.SignupForm;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AuthController {
    private final AccountService accounts;
    public AuthController(AccountService accounts) { this.accounts = accounts; }

    @GetMapping("/") public String home(@AuthenticationPrincipal AppPrincipal p) { return "redirect:" + (p == null ? "/login" : "ADMIN".equals(p.getRole()) ? "/admin" : "/dashboard"); }
    @GetMapping("/login") public String login(@AuthenticationPrincipal AppPrincipal p) { return p == null ? "login" : home(p); }
    @GetMapping("/signup") public String signup(Model model) { model.addAttribute("form", new SignupForm()); return "signup"; }
    @PostMapping("/signup") public String signup(@Valid @ModelAttribute("form") SignupForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        if (binding.hasErrors()) { model.addAttribute("errors", errors(binding)); return "signup"; }
        try {
            accounts.signup(form);
            flash.addFlashAttribute("success", "Account created. You can sign in immediately.");
            return "redirect:/login";
        } catch (BusinessException e) { model.addAttribute("errors", e.getMessage()); return "signup"; }
    }
    public static String errors(BindingResult binding) { return String.join(" · ", binding.getAllErrors().stream().map(e -> e.getDefaultMessage()).toList()); }
}
