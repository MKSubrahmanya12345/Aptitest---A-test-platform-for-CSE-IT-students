package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AnalyticsService {
    private final AttemptRepository attempts;
    private final AttemptQuestionRepository items;
    private final UserRepository users;
    private final QuestionRepository questions;
    public AnalyticsService(AttemptRepository attempts, AttemptQuestionRepository items, UserRepository users, QuestionRepository questions) {
        this.attempts = attempts; this.items = items; this.users = users; this.questions = questions;
    }
    private List<TestAttempt> counted(Long userId) {
        return attempts.findByUserIdOrderByStartedAtDesc(userId).stream().filter(TestAttempt::isCompleted).filter(a -> !a.isReattempt()).toList();
    }
    private double rounded(double n) { return Math.round(n * 10.0) / 10.0; }
    public Map<String, Object> summary(Long userId) {
        List<TestAttempt> list = counted(userId);
        int correct = list.stream().mapToInt(TestAttempt::getCorrectCount).sum();
        int answered = list.stream().mapToInt(a -> a.getCorrectCount() + a.getWrongCount()).sum();
        Set<LocalDate> days = list.stream().map(a -> a.getSubmittedAt().atZone(ZoneId.of("Asia/Kolkata")).toLocalDate()).collect(Collectors.toSet());
        LocalDate cursor = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        if (!days.contains(cursor)) cursor = cursor.minusDays(1);
        int streak = 0; while (days.contains(cursor)) { streak++; cursor = cursor.minusDays(1); }
        return Map.of("totalTests", list.size(), "averageScore", rounded(list.stream().mapToDouble(TestAttempt::getPercentage).average().orElse(0)),
                "correctAnswers", correct, "answeredCount", answered, "accuracy", answered == 0 ? 0 : rounded(correct * 100.0 / answered),
                "practiceMinutes", list.stream().mapToInt(TestAttempt::getElapsedSeconds).sum() / 60, "streak", streak);
    }
    public List<Map<String, Object>> categoryPerformance(Long userId) {
        List<Long> ids = counted(userId).stream().map(TestAttempt::getId).toList();
        if (ids.isEmpty()) return List.of();
        Map<String, List<AttemptQuestion>> grouped = items.findByAttemptIdIn(ids).stream().collect(Collectors.groupingBy(AttemptQuestion::getCategory, TreeMap::new, Collectors.toList()));
        List<Map<String, Object>> result = new ArrayList<>();
        grouped.forEach((category, list) -> {
            long answered = list.stream().filter(AttemptQuestion::isAnswered).count(), correct = list.stream().filter(i -> Boolean.TRUE.equals(i.getCorrect())).count();
            long viewed = list.stream().filter(i -> i.getViewedAt() != null).count();
            result.add(Map.of("category", category, "attempted", answered, "total", list.size(), "correct", correct,
                    "accuracy", answered == 0 ? 0 : rounded(correct * 100.0 / answered),
                    "averageSeconds", viewed == 0 ? 0 : rounded(list.stream().mapToLong(AttemptQuestion::getTimeTakenMillis).sum() / 1000.0 / viewed)));
        });
        return result;
    }
    public List<Map<String, Object>> rankings(String sort) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (AppUser user : users.findByRoleOrderByNameAsc(Role.STUDENT)) {
            if (!user.isEnabled() || !user.isEmailVerified()) continue;
            List<TestAttempt> list = counted(user.getId());
            int correct = list.stream().mapToInt(TestAttempt::getCorrectCount).sum();
            int answered = list.stream().mapToInt(a -> a.getCorrectCount() + a.getWrongCount()).sum();
            if (answered == 0) continue;
            rows.add(Map.of("userId", user.getId(), "name", user.getName(), "tests", list.size(), "totalScore", correct,
                    "accuracy", rounded(correct * 100.0 / answered), "averageScore", rounded(list.stream().mapToDouble(TestAttempt::getPercentage).average().orElse(0)),
                    "averageSeconds", rounded(list.stream().mapToInt(TestAttempt::getElapsedSeconds).sum() / (double) answered)));
        }
        String key = switch (sort) { case "activity" -> "tests"; case "speed" -> "averageSeconds"; case "score" -> "totalScore"; default -> "accuracy"; };
        Comparator<Map<String, Object>> comparator = Comparator.comparingDouble(r -> ((Number) r.get(key)).doubleValue());
        if (!"speed".equals(sort)) comparator = comparator.reversed();
        rows.sort(comparator.thenComparing(Comparator.<Map<String, Object>>comparingInt(r -> ((Number) r.get("totalScore")).intValue()).reversed()).thenComparing(r -> (String) r.get("name")));
        return rows;
    }
    public Map<String, Object> adminSummary() {
        List<Question> active = questions.findByStatus("active");
        Map<String, Long> categories = active.stream().collect(Collectors.groupingBy(Question::getCategory, TreeMap::new, Collectors.counting()));
        Map<String, Long> trends = new TreeMap<>();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        for (int i = 13; i >= 0; i--) trends.put(today.minusDays(i).toString(), 0L);
        for (TestAttempt a : attempts.findByStatus("completed")) {
            if (a.isReattempt()) continue;
            String date = a.getSubmittedAt().atZone(ZoneId.of("Asia/Kolkata")).toLocalDate().toString();
            if (trends.containsKey(date)) trends.compute(date, (d, count) -> count + 1);
        }
        return Map.of("pending", questions.countByStatus("pending"), "active", active.size(), "students", users.countByRole(Role.STUDENT),
                "categoryCount", categories.size(), "categories", categories, "trends", trends, "completed", attempts.countByStatus("completed"));
    }
    public List<AttemptQuestion> solved(Long userId, String term, String category) {
        List<Long> ids = attempts.findByUserIdOrderByStartedAtDesc(userId).stream().filter(TestAttempt::isCompleted).map(TestAttempt::getId).toList();
        if (ids.isEmpty()) return List.of();
        Map<Long, AttemptQuestion> unique = new LinkedHashMap<>();
        items.findByAttemptIdIn(ids).stream().filter(AttemptQuestion::isAnswered)
            .filter(q -> term == null || term.isBlank() || q.getQuestionText().toLowerCase(Locale.ROOT).contains(term.toLowerCase(Locale.ROOT)))
            .filter(q -> category == null || category.isBlank() || q.getCategory().equals(category))
            .sorted(Comparator.comparing(AttemptQuestion::getId).reversed()).forEach(q -> unique.putIfAbsent(q.getQuestionId(), q));
        return List.copyOf(unique.values());
    }
}
