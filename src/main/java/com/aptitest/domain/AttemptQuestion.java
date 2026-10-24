package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_attempt_questions", uniqueConstraints = @UniqueConstraint(columnNames = {"attempt_id", "position"}))
public class AttemptQuestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;
    @Column(name = "question_id", nullable = false)
    private Long questionId;
    @Column(nullable = false)
    private int position;
    @Column(nullable = false, length = 100)
    private String category;
    @Column(nullable = false, length = 40)
    private String questionType;
    @Lob @Column(nullable = false)
    private String questionText;
    @Lob
    private String passage;
    @Lob
    private String dataBlock;
    @Lob
    private String optionsJson;
    @Lob @Column(nullable = false)
    private String correctAnswerJson;
    @Lob
    private String gradingConfigJson;
    @Lob
    private String solution;
    @Lob
    private String userAnswer;
    @Column(nullable = false)
    private boolean flagged = false;
    private Boolean correct;
    private Instant viewedAt;
    @Column(nullable = false)
    private long timeTakenMillis = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attempt_id", insertable = false, updatable = false, nullable = false, foreignKey = @ForeignKey(name = "fk_at_attemptquestion_attempt"))
    private TestAttempt attempt;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", insertable = false, updatable = false, nullable = false, foreignKey = @ForeignKey(name = "fk_at_attemptquestion_question"))
    private Question question;

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getPassage() { return passage; }
    public void setPassage(String passage) { this.passage = passage; }
    public String getDataBlock() { return dataBlock; }
    public void setDataBlock(String dataBlock) { this.dataBlock = dataBlock; }
    public String getOptionsJson() { return optionsJson; }
    public void setOptionsJson(String optionsJson) { this.optionsJson = optionsJson; }
    public String getCorrectAnswerJson() { return correctAnswerJson; }
    public void setCorrectAnswerJson(String correctAnswerJson) { this.correctAnswerJson = correctAnswerJson; }
    public String getGradingConfigJson() { return gradingConfigJson; }
    public void setGradingConfigJson(String gradingConfigJson) { this.gradingConfigJson = gradingConfigJson; }
    public String getSolution() { return solution; }
    public void setSolution(String solution) { this.solution = solution; }
    public String getUserAnswer() { return userAnswer; }
    public void setUserAnswer(String userAnswer) { this.userAnswer = userAnswer; }
    public boolean isFlagged() { return flagged; }
    public void setFlagged(boolean flagged) { this.flagged = flagged; }
    public Boolean getCorrect() { return correct; }
    public void setCorrect(Boolean correct) { this.correct = correct; }
    public Instant getViewedAt() { return viewedAt; }
    public void setViewedAt(Instant viewedAt) { this.viewedAt = viewedAt; }
    public int getTimeTakenSeconds() { return (int) (timeTakenMillis / 1000); }
    public long getTimeTakenMillis() { return timeTakenMillis; }
    public void setTimeTakenMillis(long value) { this.timeTakenMillis = value; }

    public java.util.Map<String, String> getOptionMap() { return com.aptitest.service.JsonSupport.options(optionsJson); }
    public String getCorrectDisplay() { String text = com.aptitest.service.JsonSupport.answerDisplay(correctAnswerJson); return "ratio".equals(questionType) ? text.replace(", ", ":") : text; }

    public boolean isAnswered() { return userAnswer != null && !userAnswer.isBlank(); }
    public boolean isMultipleChoice() { return "mcq_multiple".equals(questionType); }
    public java.util.Set<String> getSelectedOptions() { return com.aptitest.service.JsonSupport.selections(userAnswer); }
}
