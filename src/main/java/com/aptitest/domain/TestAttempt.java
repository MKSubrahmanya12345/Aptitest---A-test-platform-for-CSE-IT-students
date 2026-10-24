package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_attempts", indexes = {@Index(name = "idx_at_attempts_user", columnList = "user_id,status"), @Index(name = "idx_at_attempts_expiry", columnList = "status,expires_at")})
public class TestAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Integer currentPosition;
    private Instant lastActivityAt;
    @Version
    private long version;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "template_id")
    private Long templateId;
    @Column(nullable = false, length = 160)
    private String templateName;
    @Column(nullable = false, length = 20)
    private String status = "in_progress";
    @Column(nullable = false)
    private int durationSeconds = 600;
    @Column(nullable = false)
    private Instant startedAt = Instant.now();
    @Column(nullable = false)
    private Instant expiresAt;
    private Instant submittedAt;
    @Column(nullable = false)
    private boolean reattempt = false;
    @Column(name = "original_attempt_id")
    private Long originalAttemptId;
    @Column(nullable = false)
    private int correctCount = 0;
    @Column(nullable = false)
    private int wrongCount = 0;
    @Column(nullable = false)
    private int skippedCount = 0;
    @Column(nullable = false)
    private int totalQuestions = 0;
    @Column(nullable = false)
    private int elapsedSeconds = 0;
    @Column(nullable = false)
    private boolean allowReattempt = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false, nullable = false, foreignKey = @ForeignKey(name = "fk_at_testattempt_user"))
    private AppUser user;
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "template_id", insertable = false, updatable = false, nullable = true, foreignKey = @ForeignKey(name = "fk_at_testattempt_template"))
    private TestTemplate template;
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "original_attempt_id", insertable = false, updatable = false, nullable = true, foreignKey = @ForeignKey(name = "fk_at_testattempt_originalattempt"))
    private TestAttempt originalAttempt;

    public Long getId() { return id; }
    public Integer getCurrentPosition() { return currentPosition; }
    public void setCurrentPosition(Integer position) { this.currentPosition = position; }
    public Instant getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(Instant time) { this.lastActivityAt = time; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }
    public String getTemplateName() { return templateName; }
    public void setTemplateName(String templateName) { this.templateName = templateName; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public boolean isReattempt() { return reattempt; }
    public void setReattempt(boolean reattempt) { this.reattempt = reattempt; }
    public Long getOriginalAttemptId() { return originalAttemptId; }
    public void setOriginalAttemptId(Long originalAttemptId) { this.originalAttemptId = originalAttemptId; }
    public int getCorrectCount() { return correctCount; }
    public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }
    public int getWrongCount() { return wrongCount; }
    public void setWrongCount(int wrongCount) { this.wrongCount = wrongCount; }
    public int getSkippedCount() { return skippedCount; }
    public void setSkippedCount(int skippedCount) { this.skippedCount = skippedCount; }
    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }
    public int getElapsedSeconds() { return elapsedSeconds; }
    public void setElapsedSeconds(int elapsedSeconds) { this.elapsedSeconds = elapsedSeconds; }
    public boolean isAllowReattempt() { return allowReattempt; }
    public void setAllowReattempt(boolean allowReattempt) { this.allowReattempt = allowReattempt; }

    public double getPercentage() { return totalQuestions == 0 ? 0 : Math.round(correctCount * 1000.0 / totalQuestions) / 10.0; }
    public boolean isCompleted() { return "completed".equals(status); }
    public String getDisplayDate() { return java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm").withZone(java.time.ZoneId.of("Asia/Kolkata")).format(startedAt); }
}
