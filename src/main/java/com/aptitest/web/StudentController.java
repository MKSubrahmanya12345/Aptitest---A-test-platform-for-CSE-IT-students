package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.repository.*;
import com.aptitest.service.*;
import java.util.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class StudentController {
    private final TemplateRepository templates;
    private final TemplateService templateService;
    private final AttemptRepository attempts;
    private final AttemptService tests;
    private final QuestionRepository questions;
    private final AnalyticsService analytics;
    private final PaymentService payments;
    public StudentController(TemplateRepository templates, TemplateService templateService, AttemptRepository attempts, AttemptService tests,
                             QuestionRepository questions, AnalyticsService analytics, PaymentService payments) {
        this.templates = templates; this.templateService = templateService; this.attempts = attempts; this.tests = tests;
        this.questions = questions; this.analytics = analytics; this.payments = payments;
    }
    @GetMapping("/dashboard") public String dashboard(@AuthenticationPrincipal AppPrincipal p, Model model) {
        var list = templates.findByActiveTrueOrderByIdAsc();
        var active = attempts.findFirstByUserIdAndStatusOrderByStartedAtDesc(p.getId(), "in_progress");
        if (active.isPresent()) {
            var a = tests.getOwned(active.get().getId(), p.getId()); if (!a.isCompleted()) model.addAttribute("activeAttempt", a);
        }
        model.addAttribute("templates", list); model.addAttribute("available", templateService.availability(list));
        model.addAttribute("accessIds", payments.accessIds(p.getId())); model.addAttribute("categories", questions.activeCategories());
        model.addAttribute("stats", analytics.summary(p.getId())); model.addAttribute("performance", analytics.categoryPerformance(p.getId()));
        model.addAttribute("recent", attempts.findByUserIdOrderByStartedAtDesc(p.getId(), PageRequest.of(0, 5)).getContent());
        return "dashboard";
    }
    @GetMapping("/history") public String history(@AuthenticationPrincipal AppPrincipal p, @RequestParam(defaultValue = "0") int page, Model model) {
        model.addAttribute("history", attempts.findByUserIdOrderByStartedAtDesc(p.getId(), PageRequest.of(Math.max(0, page), 15)));
        return "history";
    }
    @GetMapping("/solved") public String solved(@AuthenticationPrincipal AppPrincipal p, @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "0") int page, Model model) {
        var all = analytics.solved(p.getId(), search, category);
        int pages = Math.max(1, (all.size() + 14) / 15), current = Math.min(Math.max(0, page), pages - 1), start = current * 15;
        model.addAttribute("solved", all.subList(start, Math.min(start + 15, all.size()))); model.addAttribute("total", all.size());
        model.addAttribute("page", current); model.addAttribute("pages", pages); model.addAttribute("search", search); model.addAttribute("category", category);
        model.addAttribute("categories", questions.activeCategories()); return "solved";
    }
    @GetMapping({"/rankings", "/admin/rankings"}) public String rankings(@RequestParam(defaultValue = "accuracy") String sort, Model model) {
        String key = Set.of("accuracy", "score", "activity", "speed").contains(sort) ? sort : "accuracy";
        model.addAttribute("rankings", analytics.rankings(key)); model.addAttribute("sort", key); return "rankings";
    }
}
