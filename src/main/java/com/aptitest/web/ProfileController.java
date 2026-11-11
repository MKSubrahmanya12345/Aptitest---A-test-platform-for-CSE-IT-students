package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.service.AccountService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class ProfileController {
    private final AccountService accounts;
    public ProfileController(AccountService accounts) { this.accounts = accounts; }
    @GetMapping("/profile") public String profile() { return "profile"; }
    @PostMapping("/profile") public String update(@AuthenticationPrincipal AppPrincipal p, @RequestParam(defaultValue = "") String name, RedirectAttributes flash) {
        accounts.updateName(p.getId(), name); flash.addFlashAttribute("success", "Profile updated."); return "redirect:/profile";
    }
    @PostMapping("/profile/password") public String password(@AuthenticationPrincipal AppPrincipal p, @RequestParam(defaultValue = "") String currentPassword,
            @RequestParam(defaultValue = "") String password, @RequestParam(defaultValue = "") String confirmPassword, jakarta.servlet.http.HttpServletRequest request) {
        accounts.changePassword(p.getId(), currentPassword, password, confirmPassword);
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        return "redirect:/login?passwordChanged";
    }
}
