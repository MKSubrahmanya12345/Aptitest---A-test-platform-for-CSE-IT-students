package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.*;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AttemptService {
    private final AttemptRepository attempts;
    private final AttemptQuestionRepository items;
    private final UserRepository users;
    private final TemplateService templates;
    private final PaymentService payments;
    private final GradingService grading;
    private final SecureRandom random = new SecureRandom();

    public AttemptService(AttemptRepository attempts, AttemptQuestionRepository items, UserRepository users,
                          TemplateService templates, PaymentService payments, GradingService grading) {
        this.attempts = attempts; this.items = items; this.users = users; this.templates = templates; this.payments = payments; this.grading = grading;
    }

    @Transactional
    public TestAttempt start(Long userId, Long templateId, List<String> categories, boolean includeSeen) {
        users.lockById(userId).orElseThrow(() -> new AccessDeniedException("Account not found."));
        TestAttempt active = activeAttempt(userId);
        if (active != null) return active;
        TestTemplate t = templates.get(templateId);
        if (!t.isActive()) throw new BusinessException("This test template has been archived.");
        payments.requireAccess(userId, t);
        List<Question> pool = new ArrayList<>(templates.pool(t, categories));
        if (!includeSeen) {
            List<Long> ids = attempts.findByUserIdOrderByStartedAtDesc(userId).stream().map(TestAttempt::getId).toList();
            Set<Long> viewed = new HashSet<>();
            if (!ids.isEmpty()) items.findByAttemptIdIn(ids).stream().filter(i -> i.getViewedAt() != null).forEach(i -> viewed.add(i.getQuestionId()));
            pool.removeIf(q -> viewed.contains(q.getId()));
        }
        if (pool.size() < t.getQuestionCount()) throw new BusinessException("Only " + pool.size() + " matching questions are available. Select more categories, allow previously viewed questions, or choose a smaller test.");
        Collections.shuffle(pool, random);
        TestAttempt a = newAttempt(userId, t);
        attempts.saveAndFlush(a);
        int position = 1;
        for (Question q : pool.subList(0, t.getQuestionCount())) items.save(snapshot(q, a.getId(), position++));
        return a;
    }

    @Transactional
    public TestAttempt reattempt(Long userId, Long sourceId) {
        users.lockById(userId).orElseThrow(() -> new AccessDeniedException("Account not found."));
        TestAttempt source = owned(sourceId, userId);
        if (!source.isCompleted()) throw new BusinessException("Finish this test before attempting it again.");
        TestTemplate t = templates.get(source.getTemplateId());
        if (!source.isAllowReattempt() || !t.isAllowReattempt() || !t.isActive()) throw new BusinessException("Reattempts are not enabled for this test.");
        payments.requireAccess(userId, t);
        TestAttempt active = activeAttempt(userId);
        if (active != null) return active;
        TestAttempt a = newAttempt(userId, t);
        a.setDurationSeconds(source.getDurationSeconds()); a.setExpiresAt(a.getStartedAt().plusSeconds(source.getDurationSeconds()));
        a.setTotalQuestions(source.getTotalQuestions()); a.setTemplateName(source.getTemplateName());
        a.setReattempt(true); a.setOriginalAttemptId(source.getOriginalAttemptId() == null ? source.getId() : source.getOriginalAttemptId());
        attempts.saveAndFlush(a);
        for (AttemptQuestion old : items.findByAttemptIdOrderByPositionAsc(sourceId)) {
            AttemptQuestion q = new AttemptQuestion();
            q.setAttemptId(a.getId()); q.setQuestionId(old.getQuestionId()); q.setPosition(old.getPosition());
            q.setCategory(old.getCategory()); q.setQuestionType(old.getQuestionType()); q.setQuestionText(old.getQuestionText());
            q.setPassage(old.getPassage()); q.setDataBlock(old.getDataBlock()); q.setOptionsJson(old.getOptionsJson());
            q.setCorrectAnswerJson(old.getCorrectAnswerJson()); q.setGradingConfigJson(old.getGradingConfigJson()); q.setSolution(old.getSolution());
            items.save(q);
        }
        return a;
    }

    private TestAttempt newAttempt(Long userId, TestTemplate t) {
        TestAttempt a = new TestAttempt();
        a.setUserId(userId); a.setTemplateId(t.getId()); a.setTemplateName(t.getName()); a.setTotalQuestions(t.getQuestionCount());
        a.setDurationSeconds(t.getDurationSeconds()); a.setExpiresAt(a.getStartedAt().plusSeconds(t.getDurationSeconds()));
        a.setAllowReattempt(t.isAllowReattempt());
        return a;
    }
    private AttemptQuestion snapshot(Question q, Long attemptId, int position) {
        AttemptQuestion i = new AttemptQuestion();
        i.setAttemptId(attemptId); i.setQuestionId(q.getId()); i.setPosition(position); i.setCategory(q.getCategory());
        i.setQuestionType(q.getQuestionType()); i.setQuestionText(q.getQuestionText()); i.setPassage(q.getPassage()); i.setDataBlock(q.getDataBlock());
        i.setOptionsJson(q.getOptionsJson()); i.setCorrectAnswerJson(q.getCorrectAnswerJson()); i.setGradingConfigJson(q.getGradingConfigJson()); i.setSolution(q.getSolution());
        return i;
    }

    private TestAttempt activeAttempt(Long userId) {
        var active = attempts.findFirstByUserIdAndStatusOrderByStartedAtDesc(userId, "in_progress");
        if (active.isEmpty()) return null;
        TestAttempt a = attempts.lockById(active.get().getId()).orElseThrow();
        expireIfNeeded(a);
        return a.isCompleted() ? null : a;
    }
    private TestAttempt owned(Long id, Long userId) {
        TestAttempt a = attempts.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test not found."));
        if (!a.getUserId().equals(userId)) throw new AccessDeniedException("This test belongs to another account.");
        return a;
    }
    @Transactional
    public TestAttempt getOwned(Long id, Long userId) {
        TestAttempt a = owned(id, userId); expireIfNeeded(a); return a;
    }
    @Transactional
    public TestAttempt visit(Long id, Long userId, int position) {
        TestAttempt a = owned(id, userId); expireIfNeeded(a);
        if (a.isCompleted()) return a;
        AttemptQuestion q = item(id, position);
        accrueTime(a);
        if (q.getViewedAt() == null) q.setViewedAt(Instant.now());
        a.setCurrentPosition(position); a.setLastActivityAt(Instant.now());
        return a;
    }
    public List<AttemptQuestion> questions(Long id) { return items.findByAttemptIdOrderByPositionAsc(id); }
    private AttemptQuestion item(Long attemptId, int position) {
        return items.findByAttemptIdAndPosition(attemptId, position).orElseThrow(() -> new BusinessException("Question is not part of this test."));
    }

    @Transactional
    public boolean saveAnswer(Long id, Long userId, int position, List<String> values, boolean flagged) {
        TestAttempt a = owned(id, userId); expireIfNeeded(a);
        if (a.isCompleted()) return false;
        AttemptQuestion q = item(id, position);
        if (values == null) values = List.of();
        if (values.size() > 12 || values.stream().anyMatch(v -> v.length() > 2000)) throw new BusinessException("Answer is too long.");
        List<String> nonblank = values.stream().map(String::trim).filter(v -> !v.isEmpty()).distinct().toList();
        String answer = nonblank.isEmpty() ? null : "mcq_multiple".equals(q.getQuestionType()) ? JsonSupport.json(nonblank) : nonblank.get(0);
        if (q.getQuestionType().startsWith("mcq_")) for (String value : nonblank) if (!q.getOptionMap().containsKey(value)) throw new BusinessException("Choose an available option.");
        if ("boolean".equals(q.getQuestionType()) && answer != null && !Set.of("true", "false").contains(answer)) throw new BusinessException("Choose true or false.");
        accrueTime(a);
        if (q.getViewedAt() == null) q.setViewedAt(Instant.now());
        q.setUserAnswer(answer); q.setFlagged(flagged);
        return true;
    }

    @Transactional
    public TestAttempt submit(Long id, Long userId) { TestAttempt a = owned(id, userId); finish(a); return a; }

    @Transactional
    public void autoSubmit(Long id) {
        attempts.lockById(id).ifPresent(this::expireIfNeeded);
    }
    private void expireIfNeeded(TestAttempt a) { if (!a.isCompleted() && !Instant.now().isBefore(a.getExpiresAt())) finish(a); }
    private void accrueTime(TestAttempt a) {
        Instant end = Instant.now().isBefore(a.getExpiresAt()) ? Instant.now() : a.getExpiresAt();
        if (a.getCurrentPosition() != null && a.getLastActivityAt() != null && end.isAfter(a.getLastActivityAt())) {
            AttemptQuestion q = item(a.getId(), a.getCurrentPosition());
            long millis = Duration.between(a.getLastActivityAt(), end).toMillis();
            q.setTimeTakenMillis(Math.min(a.getDurationSeconds() * 1000L, q.getTimeTakenMillis() + millis));
        }
        a.setLastActivityAt(end);
    }
    private void finish(TestAttempt a) {
        if (a.isCompleted()) return;
        accrueTime(a);
        int correct = 0, wrong = 0, skipped = 0;
        for (AttemptQuestion q : questions(a.getId())) {
            if (!q.isAnswered()) { skipped++; q.setCorrect(null); }
            else {
                boolean ok = grading.grade(q.getQuestionType(), q.getCorrectAnswerJson(), q.getGradingConfigJson(), q.getUserAnswer());
                q.setCorrect(ok); if (ok) correct++; else wrong++;
            }
        }
        Instant end = Instant.now().isAfter(a.getExpiresAt()) ? a.getExpiresAt() : Instant.now();
        a.setCorrectCount(correct); a.setWrongCount(wrong); a.setSkippedCount(skipped); a.setStatus("completed"); a.setSubmittedAt(end);
        a.setElapsedSeconds((int) Math.max(0, Math.min(a.getDurationSeconds(), Duration.between(a.getStartedAt(), end).getSeconds())));
    }
}
