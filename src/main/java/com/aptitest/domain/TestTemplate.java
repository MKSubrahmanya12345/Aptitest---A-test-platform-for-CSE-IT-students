package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_templates")
public class TestTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 2000)
    private String description;
    @Column(nullable = false, length = 20)
    private String difficulty = "mixed";
    @Column(nullable = false)
    private int questionCount = 10;
    @Column(nullable = false)
    private int durationSeconds = 600;
    @Column(length = 2000)
    private String categoriesCsv = "";
    @Column(length = 2000)
    private String subcategoriesCsv = "";
    @Column(length = 1000)
    private String questionTypesCsv = "";
    @Column(nullable = false)
    private boolean paid = false;
    @Column(nullable = false)
    private int pricePaise = 0;
    @Column(nullable = false)
    private boolean active = true;
    @Column(nullable = false)
    private boolean allowReattempt = true;
    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    public String getCategoriesCsv() { return categoriesCsv; }
    public void setCategoriesCsv(String categoriesCsv) { this.categoriesCsv = categoriesCsv; }
    public String getSubcategoriesCsv() { return subcategoriesCsv; }
    public void setSubcategoriesCsv(String subcategoriesCsv) { this.subcategoriesCsv = subcategoriesCsv; }
    public String getQuestionTypesCsv() { return questionTypesCsv; }
    public void setQuestionTypesCsv(String questionTypesCsv) { this.questionTypesCsv = questionTypesCsv; }
    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }
    public int getPricePaise() { return pricePaise; }
    public void setPricePaise(int pricePaise) { this.pricePaise = pricePaise; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isAllowReattempt() { return allowReattempt; }
    public void setAllowReattempt(boolean allowReattempt) { this.allowReattempt = allowReattempt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public int getDurationMinutes() { return durationSeconds / 60; }
    public String getPriceDisplay() { return String.format(java.util.Locale.ROOT, "₹%.2f", pricePaise / 100.0); }
}
