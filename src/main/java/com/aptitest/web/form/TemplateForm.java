package com.aptitest.web.form;

import jakarta.validation.constraints.*;

public class TemplateForm {
    @NotBlank(message = "Template name is required") @Size(max = 160)
    private String name = "";
    @Size(max = 2000)
    private String description = "";
    @NotBlank
    private String difficulty = "mixed";
    @Min(value = 1, message = "At least one question is required") @Max(100)
    private int questionCount = 10;
    @Min(1) @Max(180)
    private int durationMinutes = 10;
    @Size(max = 2000)
    private String categoriesCsv = "";
    @Size(max = 2000)
    private String subcategoriesCsv = "";
    @Size(max = 1000)
    private String questionTypesCsv = "";
    private boolean paid = false;
    @NotNull @DecimalMin("0.00") @Digits(integer = 5, fraction = 2)
    private java.math.BigDecimal priceRupees = java.math.BigDecimal.ZERO;
    private boolean active = true;
    private boolean allowReattempt = true;
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String value) { difficulty = value; }
    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int value) { questionCount = value; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int value) { durationMinutes = value; }
    public String getCategoriesCsv() { return categoriesCsv; }
    public void setCategoriesCsv(String value) { categoriesCsv = value; }
    public String getSubcategoriesCsv() { return subcategoriesCsv; }
    public void setSubcategoriesCsv(String value) { subcategoriesCsv = value; }
    public String getQuestionTypesCsv() { return questionTypesCsv; }
    public void setQuestionTypesCsv(String value) { questionTypesCsv = value; }
    public boolean isPaid() { return paid; }
    public void setPaid(boolean value) { paid = value; }
    public java.math.BigDecimal getPriceRupees() { return priceRupees; }
    public void setPriceRupees(java.math.BigDecimal value) { priceRupees = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
    public boolean isAllowReattempt() { return allowReattempt; }
    public void setAllowReattempt(boolean value) { allowReattempt = value; }
}
