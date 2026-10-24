package com.aptitest.web;

import com.aptitest.domain.*;
import com.aptitest.repository.*;
import com.aptitest.service.*;
import com.aptitest.web.form.*;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/admin")
public class AdminController {
    private final QuestionService questions;
    private final QuestionRepository questionRepository;
    private final TemplateService templates;
    private final TemplateRepository templateRepository;
    private final AccountService accounts;
    private final UserRepository users;
    private final AttemptRepository attempts;
    private final AttemptService tests;
    private final AnalyticsService analytics;
    private final MailService mail;
    @Value("${app.demo-enabled}") private boolean demoEnabled;
    public AdminController(QuestionService questions, QuestionRepository questionRepository, TemplateService templates,
            TemplateRepository templateRepository, AccountService accounts, UserRepository users, AttemptRepository attempts,
            AttemptService tests, AnalyticsService analytics, MailService mail) {
        this.questions = questions; this.questionRepository = questionRepository; this.templates = templates; this.templateRepository = templateRepository;
        this.accounts = accounts; this.users = users; this.attempts = attempts; this.tests = tests; this.analytics = analytics; this.mail = mail;
    }
    @GetMapping public String dashboard(Model model) { model.addAttribute("stats", analytics.adminSummary()); return "admin-dashboard"; }
    @GetMapping({"/manage-questions", "/questions"}) public String questions(@RequestParam(defaultValue = "pending") String status,
            @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page, Model model) {
        model.addAttribute("questions", questions.search(status, category, search, page));
        model.addAttribute("status", status); model.addAttribute("category", category); model.addAttribute("search", search);
        model.addAttribute("categories", questionRepository.activeCategories()); return "admin-questions";
    }
    @GetMapping("/questions/new") public String newQuestion(Model model) { model.addAttribute("form", new QuestionForm()); return "question-form"; }
    @GetMapping("/questions/{id}/edit") public String editQuestion(@PathVariable Long id, Model model) {
        model.addAttribute("form", questions.toForm(questions.get(id))); model.addAttribute("questionId", id); return "question-form";
    }
    @PostMapping("/questions") public String create(@Valid @ModelAttribute("form") QuestionForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        return saveQuestion(null, form, binding, model, flash);
    }
    @PostMapping("/questions/{id}") public String update(@PathVariable Long id, @Valid @ModelAttribute("form") QuestionForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        return saveQuestion(id, form, binding, model, flash);
    }
    private String saveQuestion(Long id, QuestionForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        model.addAttribute("questionId", id);
        if (binding.hasErrors()) { model.addAttribute("errors", AuthController.errors(binding)); return "question-form"; }
        try {
            questions.save(id, form); flash.addFlashAttribute("success", "Question saved."); return "redirect:/admin/manage-questions?status=" + form.getStatus();
        } catch (BusinessException e) { model.addAttribute("errors", e.getMessage()); return "question-form"; }
    }
    @PostMapping("/questions/{id}/review") public String review(@PathVariable Long id, @RequestParam String decision, RedirectAttributes flash) {
        try {
            if (!Set.of("approve", "reject").contains(decision)) throw new BusinessException("Choose approve or reject.");
            questions.review(id, "approve".equals(decision)); flash.addFlashAttribute("success", "Question " + ("approve".equals(decision) ? "approved." : "rejected."));
        } catch (BusinessException e) { flash.addFlashAttribute("error", e.getMessage()); }
        return "redirect:/admin/manage-questions?status=pending";
    }
    @PostMapping("/questions/import") public String importQuestions(@RequestParam MultipartFile file, RedirectAttributes flash) throws java.io.IOException {
        if (file.isEmpty()) throw new BusinessException("Choose a JSON file first.");
        int count = questions.importJson(file.getBytes()); flash.addFlashAttribute("success", count + " questions imported into the review queue.");
        return "redirect:/admin/manage-questions?status=pending";
    }
    @GetMapping("/test-templates") public String templates(Model model) {
        var all = templateRepository.findAll(Sort.by("id")); model.addAttribute("templates", all); model.addAttribute("available", templates.availability(all)); return "admin-templates";
    }
    @GetMapping("/test-templates/new") public String newTemplate(Model model) { model.addAttribute("form", new TemplateForm()); return "template-form"; }
    @GetMapping("/test-templates/{id}/edit") public String editTemplate(@PathVariable Long id, Model model) {
        model.addAttribute("form", templates.toForm(templates.get(id))); model.addAttribute("templateId", id); return "template-form";
    }
    @PostMapping("/test-templates") public String createTemplate(@Valid @ModelAttribute("form") TemplateForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        return saveTemplate(null, form, binding, model, flash);
    }
    @PostMapping("/test-templates/{id}") public String updateTemplate(@PathVariable Long id, @Valid @ModelAttribute("form") TemplateForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        return saveTemplate(id, form, binding, model, flash);
    }
    private String saveTemplate(Long id, TemplateForm form, BindingResult binding, Model model, RedirectAttributes flash) {
        model.addAttribute("templateId", id);
        if (binding.hasErrors()) { model.addAttribute("errors", AuthController.errors(binding)); return "template-form"; }
        try { templates.save(id, form); flash.addFlashAttribute("success", "Test template saved."); return "redirect:/admin/test-templates"; }
        catch (BusinessException e) { model.addAttribute("errors", e.getMessage()); return "template-form"; }
    }
    @PostMapping("/test-templates/{id}/archive") public String archive(@PathVariable Long id, RedirectAttributes flash) {
        templates.archive(id); flash.addFlashAttribute("success", "Template archived. Existing attempts and payments have been preserved."); return "redirect:/admin/test-templates";
    }
    @GetMapping("/view-students") public String students(@RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "0") int page, Model model) {
        String term = search.trim().toLowerCase(Locale.ROOT);
        List<AppUser> all = users.findByRoleOrderByNameAsc(Role.STUDENT).stream().filter(u -> u.getName().toLowerCase(Locale.ROOT).contains(term) || u.getEmail().contains(term)).toList();
        int pages = Math.max(1, (all.size()+14)/15), current = Math.min(Math.max(0, page), pages-1), start = current*15;
        model.addAttribute("students", all.subList(start, Math.min(start+15, all.size()))); model.addAttribute("total", all.size());
        model.addAttribute("page", current); model.addAttribute("pages", pages); model.addAttribute("search", search); return "admin-students";
    }
    @GetMapping("/view-students/{id}") public String student(@PathVariable Long id, @RequestParam(defaultValue = "0") int page, Model model) {
        var user = accounts.get(id); if (user.getRole() != Role.STUDENT) throw new BusinessException("Student not found.");
        model.addAttribute("student", user); model.addAttribute("stats", analytics.summary(id)); model.addAttribute("performance", analytics.categoryPerformance(id));
        model.addAttribute("history", attempts.findByUserIdOrderByStartedAtDesc(id, PageRequest.of(Math.max(0, page), 15))); return "admin-student";
    }
    @PostMapping("/view-students/{id}/status") public String status(@PathVariable Long id, @RequestParam boolean enabled, RedirectAttributes flash) {
        accounts.setStudentEnabled(id, enabled); flash.addFlashAttribute("success", enabled ? "Student account enabled." : "Student account disabled and sessions revoked."); return "redirect:/admin/view-students/" + id;
    }
    @GetMapping("/attempts/{id}") public String result(@PathVariable Long id, Model model) {
        TestAttempt a = attempts.findById(id).orElseThrow(() -> new BusinessException("Test not found."));
        if (!a.isCompleted()) throw new BusinessException("This student has not submitted the test yet.");
        model.addAttribute("attempt", a); model.addAttribute("items", tests.questions(id)); model.addAttribute("backUrl", "/admin/view-students/" + a.getUserId()); return "result";
    }
    @GetMapping("/mail") public String outbox(Model model) {
        if (!demoEnabled) throw new BusinessException("The demo email outbox is disabled.");
        model.addAttribute("messages", mail.getOutbox()); return "admin-mail";
    }
}
