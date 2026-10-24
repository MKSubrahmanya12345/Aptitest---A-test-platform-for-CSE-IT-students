package com.aptitest.config;

import com.aptitest.domain.*;
import com.aptitest.repository.*;
import com.aptitest.service.*;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Locale;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SeedDataLoader implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SeedDataLoader.class);
    private final UserRepository users;
    private final QuestionRepository questions;
    private final TemplateRepository templates;
    private final PasswordEncoder encoder;
    @Value("${app.demo-enabled}") private boolean demoEnabled;
    @Value("${app.seed-enabled}") private boolean seedEnabled;
    @Value("${app.mail-mode}") private String mailMode;
    @Value("${app.payment-mode}") private String paymentMode;
    @Value("${app.bootstrap-admin-email}") private String adminEmail;
    @Value("${app.bootstrap-admin-password}") private String adminPassword;
    public SeedDataLoader(UserRepository users, QuestionRepository questions, TemplateRepository templates, PasswordEncoder encoder) {
        this.users = users; this.questions = questions; this.templates = templates; this.encoder = encoder;
    }
    @Override @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!demoEnabled && (seedEnabled || "demo".equals(mailMode) || "demo".equals(paymentMode))) {
            throw new IllegalStateException("Demo seeding, email, and payments must be disabled when APP_DEMO_ENABLED=false. See docs/DEPLOYMENT.md.");
        }
        if (!adminEmail.isBlank()) {
            if (adminPassword.isBlank()) throw new IllegalStateException("ADMIN_PASSWORD is required with ADMIN_EMAIL.");
            AccountService.validatePassword(adminPassword);
            createUser("Administrator", adminEmail, adminPassword, Role.ADMIN);
        }
        if (seedEnabled) {
            createUser("Administrator", "admin@aptitest.com", "Admin@12345", Role.ADMIN);
            createUser("Demo Student", "student@aptitest.com", "Student@12345", Role.STUDENT);
            try (var stream = new ClassPathResource("seed/questions.json").getInputStream()) {
                for (JsonNode row : JsonSupport.MAPPER.readTree(stream)) {
                    if (questions.existsBySourceRef(row.path("source_ref").asText())) continue;
                    Question q = new Question();
                    q.setCategory(row.path("category").asText()); q.setSubcategory(row.path("subcategory").asText());
                    q.setDifficulty(row.path("difficulty").asText()); q.setQuestionType(row.path("question_type").asText());
                    q.setQuestionText(row.path("question_text").asText()); q.setOptionsJson(row.path("options").toString());
                    q.setCorrectAnswerJson(row.path("correct_answer").toString()); q.setGradingConfigJson(row.path("grading_config").toString());
                    q.setSolution(row.path("solution").asText()); q.setSourceRef(row.path("source_ref").asText()); q.setStatus(row.path("status").asText());
                    questions.save(q);
                }
            }
            template("Quick Warm-up", "Ten mixed questions to get you into practice mode.", "mixed", 10, 10, false);
            template("Easy Practice - 30 Qs", "Build accuracy with a focused foundation practice session.", "easy", 30, 30, false);
            template("Easy Practice - 60 Qs", "A full-length foundation test to improve speed and confidence.", "easy", 60, 60, false);
            template("Hard Practice - 30 Qs", "Intermediate and advanced aptitude and CSE questions.", "hard", 30, 30, false);
            template("Hard Practice - 60 Qs", "A complete advanced simulation. Demo checkout is available without a real charge.", "hard", 60, 60, true);
            log.info("Demo data ready: {} active questions, {} pending review. Demo credentials are in README.md.", questions.countByStatus("active"), questions.countByStatus("pending"));
        }
        if (!demoEnabled && users.countByRole(Role.ADMIN) == 0) throw new IllegalStateException("No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD on first start.");
    }
    private void createUser(String name, String email, String password, Role role) {
        if (users.existsByEmailIgnoreCase(email)) return;
        AppUser user = new AppUser(); user.setName(name); user.setEmail(email.trim().toLowerCase(Locale.ROOT));
        user.setPasswordHash(encoder.encode(password)); user.setRole(role); user.setEmailVerified(true); users.save(user);
    }
    private void template(String name, String description, String difficulty, int count, int minutes, boolean paid) {
        if (templates.existsByName(name)) return;
        TestTemplate t = new TestTemplate(); t.setName(name); t.setDescription(description); t.setDifficulty(difficulty);
        t.setQuestionCount(count); t.setDurationSeconds(minutes * 60); t.setPaid(paid); t.setPricePaise(paid ? 5000 : 0); templates.save(t);
    }
}
