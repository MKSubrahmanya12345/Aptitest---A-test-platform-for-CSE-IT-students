package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_questions", indexes = {@Index(name = "idx_at_questions_filter", columnList = "status,category,difficulty"), @Index(name = "idx_at_questions_source", columnList = "source_ref")})
public class Question {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String category;
    @Column(length = 100)
    private String subcategory = "General";
    @Column(nullable = false, length = 20)
    private String difficulty = "basic";
    @Column(nullable = false, length = 40)
    private String questionType = "mcq_single";
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARCHAR)
    @Column(nullable = false, length = 20000)
    private String questionText;
    @Lob
    private String passage;
    @Lob
    private String dataBlock;
    @Lob
    private String optionsJson = "{}";
    @Lob @Column(nullable = false)
    private String correctAnswerJson;
    @Lob
    private String gradingConfigJson = "{}";
    @Lob
    private String solution;
    @Column(length = 255)
    private String sourceRef = "admin-created";
    @Column(nullable = false, length = 20)
    private String status = "pending";
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getSubcategory() { return subcategory; }
    public void setSubcategory(String subcategory) { this.subcategory = subcategory; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
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
    public String getSourceRef() { return sourceRef; }
    public void setSourceRef(String sourceRef) { this.sourceRef = sourceRef; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PreUpdate
    public void touch() { updatedAt = Instant.now(); }

    public java.util.Map<String, String> getOptionMap() { return com.aptitest.service.JsonSupport.options(optionsJson); }
    public String getCorrectDisplay() { String text = com.aptitest.service.JsonSupport.answerDisplay(correctAnswerJson); return "ratio".equals(questionType) ? text.replace(", ", ":") : text; }
}
