package com.aptitest.service;

import com.aptitest.domain.Question;
import com.aptitest.repository.QuestionRepository;
import com.aptitest.web.form.QuestionForm;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuestionService {
    private final QuestionRepository questions;
    private final Validator validator;
    public QuestionService(QuestionRepository questions, Validator validator) { this.questions = questions; this.validator = validator; }
    public Question get(Long id) { return questions.findById(id).orElseThrow(() -> new BusinessException("Question not found.")); }

    public Page<Question> search(String status, String category, String term, int page) {
        return questions.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (status != null && !status.isBlank()) filters.add(cb.equal(root.get("status"), status));
            if (category != null && !category.isBlank()) filters.add(cb.equal(root.get("category"), category));
            if (term != null && !term.isBlank()) filters.add(cb.like(cb.lower(root.get("questionText")), "%" + term.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%", '\\'));
            return cb.and(filters.toArray(Predicate[]::new));
        }, PageRequest.of(Math.max(0, page), 15, Sort.by(Sort.Direction.DESC, "id")));
    }

    @Transactional
    public Question save(Long id, QuestionForm form) {
        validate(form);
        Question q = id == null ? new Question() : get(id);
        q.setCategory(form.getCategory().trim()); q.setSubcategory(form.getSubcategory() == null ? "" : form.getSubcategory().trim());
        q.setDifficulty(form.getDifficulty()); q.setQuestionType(form.getQuestionType()); q.setQuestionText(form.getQuestionText().trim());
        q.setPassage(form.getPassage()); q.setDataBlock(form.getDataBlock()); q.setOptionsJson(JsonSupport.parse(form.getOptionsJson()).toString());
        q.setCorrectAnswerJson(JsonSupport.parse(form.getCorrectAnswerJson()).toString()); q.setGradingConfigJson(JsonSupport.parse(form.getGradingConfigJson()).toString());
        q.setSolution(form.getSolution()); q.setStatus(form.getStatus());
        return questions.save(q);
    }

    public void validate(QuestionForm form) {
        var errors = validator.validate(form);
        if (!errors.isEmpty()) throw new BusinessException(errors.iterator().next().getMessage());
        if (!Set.of("basic", "intermediate", "advanced").contains(form.getDifficulty())) throw new BusinessException("Choose a supported difficulty.");
        if (!GradingService.TYPES.contains(form.getQuestionType())) throw new BusinessException("Choose a supported question type.");
        if (!Set.of("pending", "active", "inactive", "rejected").contains(form.getStatus())) throw new BusinessException("Invalid question status.");
        JsonNode answer = JsonSupport.parse(form.getCorrectAnswerJson()), config = JsonSupport.parse(form.getGradingConfigJson());
        JsonNode optionsNode = JsonSupport.parse(form.getOptionsJson());
        if (!answer.isObject() || !config.isObject() || !(optionsNode.isObject() || optionsNode.isArray())) throw new BusinessException("Answer and grading config must be JSON objects; options must be an object or array.");
        String type = form.getQuestionType();
        if (type.startsWith("mcq_")) {
            Map<String, String> options = JsonSupport.options(form.getOptionsJson());
            if (options.size() < 2 || options.size() > 12 || options.entrySet().stream().anyMatch(e -> e.getKey().isBlank() || e.getKey().length() > 10 || e.getValue().isBlank())) throw new BusinessException("MCQs need 2–12 non-empty, labelled options. Imported flagged MCQs must be edited before approval.");
            if ("mcq_single".equals(type) && (!answer.path("value").isTextual() || !options.containsKey(answer.path("value").asText()))) throw new BusinessException("The correct value must match an option label (for example A).");
            if ("mcq_multiple".equals(type)) {
                if (!answer.path("values").isArray() || answer.path("values").isEmpty()) throw new BusinessException("Multiple choice needs a non-empty values array.");
                for (JsonNode n : answer.path("values")) if (!options.containsKey(n.asText())) throw new BusinessException("Every correct value must match an option label.");
            }
        } else if ("fraction".equals(type)) {
            number(answer.path("numerator"));
            if (number(answer.path("denominator")).signum() == 0) throw new BusinessException("A fraction denominator cannot be zero.");
        } else if ("ratio".equals(type)) {
            if (!answer.path("values").isArray() || answer.path("values").size() < 2) throw new BusinessException("Ratio answers need at least two values.");
            for (JsonNode n : answer.path("values")) number(n);
        } else if ("boolean".equals(type)) {
            if (!answer.path("value").isBoolean()) throw new BusinessException("A boolean answer must use true or false, without quotes.");
        } else if (Set.of("numeric", "numeric_with_unit").contains(type)) {
            number(answer.path("value"));
            if ("numeric_with_unit".equals(type) && config.path("unit_required").asBoolean(false) && answer.path("unit").asText().isBlank()) throw new BusinessException("Specify the required unit in the answer.");
        } else if (!answer.has("value") && !(answer.path("answers").isArray() && !answer.path("answers").isEmpty())) {
            throw new BusinessException("Specify a value or non-empty answers array.");
        }
        if (config.has("tolerance") && number(config.path("tolerance")).signum() < 0) throw new BusinessException("Tolerance cannot be negative.");
    }

    private BigDecimal number(JsonNode n) {
        try { return new BigDecimal(n.asText()); }
        catch (Exception e) { throw new BusinessException("The correct answer must contain valid finite numbers."); }
    }

    @Transactional
    public void review(Long id, boolean approve) {
        Question q = get(id);
        if (!"pending".equals(q.getStatus())) throw new BusinessException("This question has already been reviewed.");
        if (approve) validate(toForm(q));
        q.setStatus(approve ? "active" : "rejected");
    }

    public QuestionForm toForm(Question q) {
        QuestionForm f = new QuestionForm();
        f.setCategory(q.getCategory()); f.setSubcategory(q.getSubcategory()); f.setDifficulty(q.getDifficulty()); f.setQuestionType(q.getQuestionType());
        f.setQuestionText(q.getQuestionText()); f.setPassage(q.getPassage()); f.setDataBlock(q.getDataBlock()); f.setOptionsJson(q.getOptionsJson());
        f.setCorrectAnswerJson(q.getCorrectAnswerJson()); f.setGradingConfigJson(q.getGradingConfigJson()); f.setSolution(q.getSolution()); f.setStatus(q.getStatus());
        return f;
    }

    /** Atomic import: either every row is valid, or nothing is inserted. Imported rows await review. */
    @Transactional
    public int importJson(byte[] bytes) {
        try {
            JsonNode rows = JsonSupport.MAPPER.readTree(bytes);
            if (rows == null || !rows.isArray() || rows.size() > 500) throw new BusinessException("Upload a JSON array containing at most 500 questions.");
            int count = 0;
            for (JsonNode row : rows) {
                QuestionForm f = new QuestionForm();
                f.setCategory(row.path("category").asText("General Aptitude")); f.setSubcategory(row.path("subcategory").asText("General"));
                f.setDifficulty(row.path("difficulty").asText("basic").toLowerCase(Locale.ROOT)); f.setQuestionType(row.path("question_type").asText("mcq_single").toLowerCase(Locale.ROOT));
                f.setQuestionText(row.path("question_text").asText()); f.setPassage(row.path("passage").asText(""));
                f.setDataBlock(row.path("data_block").isMissingNode() || row.path("data_block").isNull() ? "" : row.path("data_block").toString());
                f.setOptionsJson(jsonField(row, "options", "{}")); f.setCorrectAnswerJson(jsonField(row, "correct_answer", "{}"));
                f.setGradingConfigJson(jsonField(row, "grading_config", "{}")); f.setSolution(row.path("solution").asText("")); f.setStatus("pending");
                try { save(null, f); } catch (BusinessException e) { throw new BusinessException("Row " + (count + 1) + ": " + e.getMessage()); }
                count++;
            }
            return count;
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw new BusinessException("Could not read the JSON file. Use the documented import format."); }
    }
    private String jsonField(JsonNode row, String key, String fallback) {
        JsonNode n = row.path(key);
        return n.isMissingNode() || n.isNull() ? fallback : n.isTextual() ? n.asText() : n.toString();
    }
}
