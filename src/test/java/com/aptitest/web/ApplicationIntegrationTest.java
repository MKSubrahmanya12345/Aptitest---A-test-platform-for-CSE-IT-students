package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.domain.*;
import com.aptitest.domain.TestTemplate;
import com.aptitest.repository.*;
import com.aptitest.service.*;
import com.aptitest.web.form.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.*;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApplicationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired QuestionRepository bank;
    @Autowired TemplateRepository templates;
    @Autowired AttemptRepository attempts;
    @Autowired AttemptQuestionRepository items;
    @Autowired PaymentRepository receipts;
    @Autowired QuestionService questions;
    @Autowired TemplateService templateService;
    @Autowired AttemptService tests;
    @Autowired PaymentService payments;
    @Autowired AccountService accounts;
    @Autowired MailService mail;
    @Autowired AnalyticsService analytics;
    AppUser student, admin;
    Question question;
    TestTemplate template;

    @BeforeEach void fixture() {
        student = users.findByEmailIgnoreCase("student@aptitest.com").orElseThrow();
        admin = users.findByEmailIgnoreCase("admin@aptitest.com").orElseThrow();
        QuestionForm f = new QuestionForm();
        f.setCategory("Fixture " + UUID.randomUUID()); f.setQuestionType("numeric"); f.setOptionsJson("{}");
        f.setQuestionText("What is 2 + 2?"); f.setCorrectAnswerJson("{\"value\":4}"); f.setStatus("active");
        question = questions.save(null, f);
        template = new TestTemplate(); template.setName("Fixture test"); template.setQuestionCount(1); template.setCategoriesCsv(question.getCategory());
        template = templates.saveAndFlush(template);
    }
    private TestAttempt start() { return tests.start(student.getId(), template.getId(), List.of(), false); }
    private SignupForm registration() {
        SignupForm f = new SignupForm(); f.setName("New Student"); f.setEmail("new-" + UUID.randomUUID() + "@example.com");
        f.setPassword("Student@12345"); f.setConfirmPassword("Student@12345"); return f;
    }
    @Test void healthIsPublicAndDatabaseIsConnected() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.db").value("connected"));
        mvc.perform(get("/dashboard")).andExpect(status().is3xxRedirection());
    }
    @Test void csrfIsRequiredForStateChangingRequests() throws Exception {
        mvc.perform(post("/signup").param("name", "Intruder")).andExpect(status().isForbidden());
        mvc.perform(post("/tests/start").with(user(new AppPrincipal(student))).param("templateId", template.getId().toString())).andExpect(status().isForbidden());
    }
    @Test void studentCannotUseAdminPagesOrMutations() throws Exception {
        mvc.perform(get("/admin").with(user(new AppPrincipal(student)))).andExpect(status().isForbidden());
        mvc.perform(post("/admin/questions").with(user(new AppPrincipal(student))).with(csrf())).andExpect(status().isForbidden());
    }
    @Test void adminAndStudentLoginRedirectToDifferentWorkspaces() throws Exception {
        mvc.perform(formLogin().user("email", student.getEmail()).password("Student@12345")).andExpect(redirectedUrl("/dashboard"));
        mvc.perform(formLogin().user("email", admin.getEmail()).password("Admin@12345")).andExpect(redirectedUrl("/admin"));
    }
    @Test void banRevokesExistingPrincipal() throws Exception {
        var oldPrincipal = new AppPrincipal(student); accounts.setStudentEnabled(student.getId(), false);
        mvc.perform(get("/dashboard").with(user(oldPrincipal))).andExpect(redirectedUrl("/login?expired"));
    }
    @Test void attemptOwnershipIsEnforced() throws Exception {
        TestAttempt a = start();
        assertThatThrownBy(() -> tests.getOwned(a.getId(), admin.getId())).isInstanceOf(AccessDeniedException.class);
        mvc.perform(get("/tests/" + a.getId()).with(user(new AppPrincipal(admin)))).andExpect(status().isForbidden());
    }
    @Test void answersAreSnapshottedAndGradedOnlyOnSubmission() {
        TestAttempt a = start(); tests.visit(a.getId(), student.getId(), 1);
        tests.saveAnswer(a.getId(), student.getId(), 1, List.of("4"), true);
        assertThat(items.findByAttemptIdAndPosition(a.getId(), 1).orElseThrow().getCorrect()).isNull();
        question.setCorrectAnswerJson("{\"value\":99}"); bank.saveAndFlush(question);
        TestAttempt result = tests.submit(a.getId(), student.getId());
        assertThat(result.getCorrectCount()).isEqualTo(1); assertThat(result.getPercentage()).isEqualTo(100);
    }
    @Test void lateAnswersCannotChangeExpiredTest() {
        TestAttempt a = start(); a.setExpiresAt(Instant.now().minusSeconds(1)); attempts.saveAndFlush(a);
        assertThat(tests.saveAnswer(a.getId(), student.getId(), 1, List.of("4"), false)).isFalse();
        assertThat(a.isCompleted()).isTrue(); assertThat(a.getSkippedCount()).isEqualTo(1); assertThat(a.getCorrectCount()).isZero();
    }
    @Test void submitAndAutoSubmitAreIdempotent() {
        TestAttempt a = start(); tests.saveAnswer(a.getId(), student.getId(), 1, List.of("4"), false);
        tests.submit(a.getId(), student.getId()); tests.submit(a.getId(), student.getId()); tests.autoSubmit(a.getId());
        assertThat(a.getCorrectCount()).isEqualTo(1);
        assertThat(tests.saveAnswer(a.getId(), student.getId(), 1, List.of("99"), false)).isFalse();
    }
    @Test void repeatedStartRequestsResumeTheExistingAttempt() {
        var a = start(); var b = tests.start(student.getId(), template.getId(), List.of(), true);
        assertThat(a.getId()).isEqualTo(b.getId());
    }
    @Test void questionMustBelongToTheAttempt() {
        var a = start();
        assertThatThrownBy(() -> tests.saveAnswer(a.getId(), student.getId(), 2, List.of("4"), false)).isInstanceOf(BusinessException.class);
    }
    @Test void previouslyViewedQuestionsAreExcludedUnlessAllowed() {
        var a = start(); tests.visit(a.getId(), student.getId(), 1); tests.submit(a.getId(), student.getId());
        assertThatThrownBy(this::start).isInstanceOf(BusinessException.class).hasMessageContaining("Only 0 matching");
        assertThat(tests.start(student.getId(), template.getId(), List.of(), true).getId()).isNotEqualTo(a.getId());
    }
    @Test void reattemptsReuseSnapshotsButDoNotInflateStatistics() {
        var a = start(); tests.saveAnswer(a.getId(), student.getId(), 1, List.of("4"), false); tests.submit(a.getId(), student.getId());
        var retry = tests.reattempt(student.getId(), a.getId());
        tests.saveAnswer(retry.getId(), student.getId(), 1, List.of("4"), false); tests.submit(retry.getId(), student.getId());
        assertThat(retry.isReattempt()).isTrue(); assertThat(retry.getOriginalAttemptId()).isEqualTo(a.getId());
        assertThat(analytics.summary(student.getId()).get("totalTests")).isEqualTo(1);
        assertThat(analytics.summary(student.getId()).get("correctAnswers")).isEqualTo(1);
    }
    @Test void insufficientQuestionsDoesNotCreateAPartialAttempt() {
        template.setQuestionCount(2); templates.saveAndFlush(template);
        long before = attempts.count(); assertThatThrownBy(this::start).isInstanceOf(BusinessException.class);
        assertThat(attempts.count()).isEqualTo(before);
    }
    @Test void templateTypeAndSubcategoryFiltersAreApplied() {
        template.setQuestionTypesCsv("boolean"); templates.saveAndFlush(template);
        assertThat(templateService.pool(template, List.of())).isEmpty();
        template.setQuestionTypesCsv("numeric"); template.setSubcategoriesCsv("General");
        assertThat(templateService.pool(template, List.of())).hasSize(1);
        assertThat(templateService.pool(template, List.of("Other topic"))).isEmpty();
    }
    @Test void paymentCannotBeBypassedOrCreditedToAnotherUser() {
        template.setPaid(true); template.setPricePaise(5000); templates.saveAndFlush(template);
        assertThatThrownBy(this::start).isInstanceOf(BusinessException.class).hasMessageContaining("Unlock");
        var order = payments.createOrder(student.getId(), template.getId());
        assertThatThrownBy(() -> payments.completeDemo(admin.getId(), template.getId(), order.getOrderId())).isInstanceOf(BusinessException.class);
        payments.completeDemo(student.getId(), template.getId(), order.getOrderId());
        payments.completeDemo(student.getId(), template.getId(), order.getOrderId());
        assertThat(payments.hasAccess(student.getId(), template)).isTrue(); assertThat(receipts.count()).isEqualTo(1);
        assertThat(start()).isNotNull();
    }
    @Test void flaggedMcqWithoutOptionsCannotBeApproved() {
        var pending = bank.findByStatus("pending").stream().filter(q -> q.getQuestionType().equals("mcq_single")).findFirst().orElseThrow();
        assertThatThrownBy(() -> questions.review(pending.getId(), true)).isInstanceOf(BusinessException.class).hasMessageContaining("MCQs need");
        assertThat(pending.getStatus()).isEqualTo("pending");
    }
    @Test void verificationIsHashedExpiringAndSingleUse() {
        var f = registration(); String path = accounts.signup(f); String token = path.substring(path.indexOf("token=") + 6);
        var user = users.findByEmailIgnoreCase(f.getEmail()).orElseThrow();
        assertThat(user.getRole()).isEqualTo(Role.STUDENT); assertThat(user.isEmailVerified()).isFalse(); assertThat(user.getVerificationHash()).isNotEqualTo(token);
        accounts.verifyEmail(token); assertThat(user.isEmailVerified()).isTrue();
        assertThatThrownBy(() -> accounts.verifyEmail(token)).isInstanceOf(BusinessException.class);
    }
    @Test void passwordResetIsHashedSingleUseAndRevokesSessions() {
        var f = registration(); String path = accounts.signup(f); accounts.verifyEmail(path.substring(path.indexOf("token=")+6));
        accounts.requestReset(f.getEmail());
        var message = mail.getOutbox().stream().filter(m -> m.recipient().equals(f.getEmail()) && m.path().startsWith("/reset-password")).findFirst().orElseThrow();
        String token = message.path().substring(message.path().indexOf("token=")+6);
        var u = users.findByEmailIgnoreCase(f.getEmail()).orElseThrow(); assertThat(u.getResetHash()).isNotEqualTo(token);
        accounts.resetPassword(token, "NewPassword123", "NewPassword123"); assertThat(u.getCredentialsVersion()).isEqualTo(1);
        assertThatThrownBy(() -> accounts.resetPassword(token, "NewPassword456", "NewPassword456")).isInstanceOf(BusinessException.class);
    }
    @Test void expiredVerificationTokenIsRejected() {
        var f = registration(); String path = accounts.signup(f);
        var u = users.findByEmailIgnoreCase(f.getEmail()).orElseThrow(); u.setVerificationExpires(Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> accounts.verifyEmail(path.substring(path.indexOf("token=")+6))).isInstanceOf(BusinessException.class);
    }
    @Test void passwordsRespectBcryptUtf8Limit() {
        assertThatThrownBy(() -> AccountService.validatePassword("é".repeat(40))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> AccountService.validatePassword("short")).isInstanceOf(BusinessException.class);
    }
    @Test void uncheckedTemplateCheckboxesActuallySaveFalse() throws Exception {
        String name = "Checkbox " + UUID.randomUUID();
        mvc.perform(post("/admin/test-templates").with(user(new AppPrincipal(admin))).with(csrf())
                .param("name", name).param("difficulty", "mixed").param("questionCount", "1").param("durationMinutes", "1")
                .param("priceRupees", "0").param("_active", "on").param("_paid", "on").param("_allowReattempt", "on"))
            .andExpect(redirectedUrl("/admin/test-templates"));
        var t = templates.findAll().stream().filter(v -> v.getName().equals(name)).findFirst().orElseThrow();
        assertThat(t.isActive()).isFalse(); assertThat(t.isAllowReattempt()).isFalse(); assertThat(t.isPaid()).isFalse();
    }
    @Test void backendValidationRejectsInvalidQuestionAndTemplateFields() throws Exception {
        mvc.perform(post("/admin/test-templates").with(user(new AppPrincipal(admin))).with(csrf()).param("name", "Invalid").param("questionCount", "-5"))
            .andExpect(status().isOk()).andExpect(view().name("template-form")).andExpect(model().attributeExists("errors"));
        var f = questions.toForm(question); f.setCorrectAnswerJson("not JSON");
        assertThatThrownBy(() -> questions.save(question.getId(), f)).isInstanceOf(BusinessException.class);
    }
    @Test @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void invalidImportRollsBackEveryRow() {
        long before = bank.count();
        String json = "[{\"category\":\"Import\",\"question_type\":\"numeric\",\"question_text\":\"2+2\",\"correct_answer\":{\"value\":4}},"
                + "{\"category\":\"Import\",\"question_type\":\"numeric\",\"question_text\":\"Broken\",\"correct_answer\":{\"value\":\"NaN\"}}]";
        assertThatThrownBy(() -> questions.importJson(json.getBytes(java.nio.charset.StandardCharsets.UTF_8))).isInstanceOf(BusinessException.class).hasMessageContaining("Row 2");
        assertThat(bank.count()).isEqualTo(before);
    }
    @Test void questionSearchIsCaseInsensitiveAndTreatsWildcardsLiterally() {
        question.setQuestionText("Discount is 20% for item_1 and item\\2"); bank.saveAndFlush(question);
        assertThat(questions.search("active", question.getCategory(), "DISCOUNT", 0).getContent()).hasSize(1);
        assertThat(questions.search("active", question.getCategory(), "20%", 0).getContent()).hasSize(1);
        assertThat(questions.search("active", question.getCategory(), "item_1", 0).getContent()).hasSize(1);
        assertThat(questions.search("active", question.getCategory(), "item\\2", 0).getContent()).hasSize(1);
        assertThat(questions.search("active", question.getCategory(), "20_", 0).getContent()).isEmpty();
    }
    @Test void databaseProtectsReferencedQuestionsFromDeletion() {
        start();
        assertThatThrownBy(() -> { bank.delete(question); bank.flush(); })
            .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
    @Test void seededPoolsAreLargeEnoughForTheIncludedSixtyQuestionTests() {
        for (var t : templates.findByActiveTrueOrderByIdAsc()) if (t.getName().contains("60 Qs")) assertThat(templateService.pool(t, List.of()).size()).isGreaterThanOrEqualTo(60);
    }
}
