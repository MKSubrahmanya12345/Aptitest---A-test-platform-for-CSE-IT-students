package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.domain.*;
import com.aptitest.service.AttemptService;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/tests")
public class TestController {
    private final AttemptService tests;
    public TestController(AttemptService tests) { this.tests = tests; }

    @PostMapping("/start") public String start(@AuthenticationPrincipal AppPrincipal p, @RequestParam Long templateId,
            @RequestParam(required = false) List<String> categories, @RequestParam(defaultValue = "false") boolean includeSeen, RedirectAttributes flash) {
        try { return "redirect:/tests/" + tests.start(p.getId(), templateId, categories, includeSeen).getId(); }
        catch (com.aptitest.service.BusinessException e) { flash.addFlashAttribute("error", e.getMessage()); return "redirect:/dashboard"; }
    }
    @GetMapping("/{id}") public String test(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p, @RequestParam(defaultValue = "1") int q, Model model) {
        TestAttempt a = tests.visit(id, p.getId(), q);
        if (a.isCompleted()) return "redirect:/tests/" + id + "/result";
        var items = tests.questions(id);
        model.addAttribute("attempt", a); model.addAttribute("items", items); model.addAttribute("item", items.get(q - 1));
        model.addAttribute("answered", items.stream().filter(AttemptQuestion::isAnswered).count());
        return "test";
    }
    @PostMapping("/{id}/answer") public String answer(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p,
            @RequestParam int position, @RequestParam(required = false) List<String> answer,
            @RequestParam(defaultValue = "false") boolean flagged, @RequestParam(defaultValue = "stay") String navigation) {
        if (!tests.saveAnswer(id, p.getId(), position, answer, flagged)) return "redirect:/tests/" + id + "/result";
        if ("finish".equals(navigation)) { tests.submit(id, p.getId()); return "redirect:/tests/" + id + "/result"; }
        int size = tests.getOwned(id, p.getId()).getTotalQuestions();
        int next = "next".equals(navigation) ? Math.min(size, position + 1) : "previous".equals(navigation) ? Math.max(1, position - 1) : position;
        return "redirect:/tests/" + id + "?q=" + next;
    }
    @PostMapping("/{id}/autosave") @ResponseBody public Map<String, Object> autosave(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p,
            @RequestParam int position, @RequestParam(required = false) List<String> answer, @RequestParam(defaultValue = "false") boolean flagged) {
        boolean saved = tests.saveAnswer(id, p.getId(), position, answer, flagged);
        return Map.of("saved", saved, "completed", !saved);
    }
    @PostMapping("/{id}/submit") public String submit(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p) {
        tests.submit(id, p.getId()); return "redirect:/tests/" + id + "/result";
    }
    @PostMapping("/{id}/reattempt") public String reattempt(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p) {
        return "redirect:/tests/" + tests.reattempt(p.getId(), id).getId();
    }
    @GetMapping("/{id}/result") public String result(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p, Model model) {
        TestAttempt a = tests.getOwned(id, p.getId());
        if (!a.isCompleted()) return "redirect:/tests/" + id;
        model.addAttribute("attempt", a); model.addAttribute("items", tests.questions(id)); model.addAttribute("backUrl", "/history");
        return "result";
    }
}
