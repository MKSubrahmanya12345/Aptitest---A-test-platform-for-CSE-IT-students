package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.*;
import com.aptitest.web.form.TemplateForm;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TemplateService {
    private final TemplateRepository templates;
    private final QuestionRepository questions;
    public TemplateService(TemplateRepository templates, QuestionRepository questions) { this.templates = templates; this.questions = questions; }
    public TestTemplate get(Long id) { return templates.findById(id).orElseThrow(() -> new BusinessException("Test template not found.")); }

    public List<Question> pool(TestTemplate t, Collection<String> selectedCategories) {
        List<String> categories = JsonSupport.csv(t.getCategoriesCsv()), types = JsonSupport.csv(t.getQuestionTypesCsv()), subs = JsonSupport.csv(t.getSubcategoriesCsv());
        return questions.findByStatus("active").stream()
                .filter(q -> categories.isEmpty() || categories.contains(q.getCategory()))
                .filter(q -> selectedCategories == null || selectedCategories.isEmpty() || selectedCategories.contains(q.getCategory()))
                .filter(q -> types.isEmpty() || types.contains(q.getQuestionType()))
                .filter(q -> subs.isEmpty() || subs.contains(q.getSubcategory()))
                .filter(q -> switch (t.getDifficulty()) {
                    case "easy", "basic" -> "basic".equals(q.getDifficulty());
                    case "hard" -> Set.of("intermediate", "advanced").contains(q.getDifficulty());
                    case "intermediate", "advanced" -> t.getDifficulty().equals(q.getDifficulty());
                    default -> true;
                }).toList();
    }
    public Map<Long, Integer> availability(List<TestTemplate> list) {
        Map<Long, Integer> result = new HashMap<>();
        list.forEach(t -> result.put(t.getId(), pool(t, List.of()).size()));
        return result;
    }
    @Transactional
    public TestTemplate save(Long id, TemplateForm f) {
        if (!Set.of("easy", "hard", "mixed", "basic", "intermediate", "advanced").contains(f.getDifficulty())) throw new BusinessException("Invalid template difficulty.");
        for (String type : JsonSupport.csv(f.getQuestionTypesCsv())) if (!GradingService.TYPES.contains(type)) throw new BusinessException("Unknown question type: " + type);
        if (f.isPaid() && f.getPriceRupees().signum() <= 0) throw new BusinessException("Paid tests must have a price greater than zero.");
        TestTemplate t = id == null ? new TestTemplate() : get(id);
        t.setName(f.getName().trim()); t.setDescription(f.getDescription()); t.setDifficulty(f.getDifficulty());
        t.setQuestionCount(f.getQuestionCount()); t.setDurationSeconds(f.getDurationMinutes() * 60);
        t.setCategoriesCsv(f.getCategoriesCsv()); t.setSubcategoriesCsv(f.getSubcategoriesCsv()); t.setQuestionTypesCsv(f.getQuestionTypesCsv());
        t.setPaid(f.isPaid()); t.setPricePaise(f.isPaid() ? f.getPriceRupees().multiply(BigDecimal.valueOf(100)).intValueExact() : 0);
        t.setActive(f.isActive()); t.setAllowReattempt(f.isAllowReattempt());
        return templates.save(t);
    }
    @Transactional public void archive(Long id) { get(id).setActive(false); }
    public TemplateForm toForm(TestTemplate t) {
        TemplateForm f = new TemplateForm();
        f.setName(t.getName()); f.setDescription(t.getDescription()); f.setDifficulty(t.getDifficulty()); f.setQuestionCount(t.getQuestionCount());
        f.setDurationMinutes(t.getDurationMinutes()); f.setCategoriesCsv(t.getCategoriesCsv()); f.setSubcategoriesCsv(t.getSubcategoriesCsv()); f.setQuestionTypesCsv(t.getQuestionTypesCsv());
        f.setPaid(t.isPaid()); f.setPriceRupees(BigDecimal.valueOf(t.getPricePaise(), 2)); f.setActive(t.isActive()); f.setAllowReattempt(t.isAllowReattempt());
        return f;
    }
}
