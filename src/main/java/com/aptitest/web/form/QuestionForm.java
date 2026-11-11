package com.aptitest.web.form;

import jakarta.validation.constraints.*;

public class QuestionForm {
    @NotBlank(message = "Category is required") @Size(max = 100)
    private String category = "";
    @Size(max = 100)
    private String subcategory = "General";
    @NotBlank
    private String difficulty = "basic";
    @NotBlank
    private String questionType = "mcq_single";
    @NotBlank(message = "Question text is required") @Size(max = 20000)
    private String questionText = "";
    @Size(max = 20000)
    private String passage = "";
    @Size(max = 20000)
    private String dataBlock = "";
    @Size(max = 20000)
    private String optionsJson = "{\"A\":\"First option\",\"B\":\"Second option\",\"C\":\"Third option\",\"D\":\"Fourth option\"}";
    @NotBlank(message = "A correct answer is required") @Size(max = 20000)
    private String correctAnswerJson = "{\"value\":\"A\"}";
    @Size(max = 2000)
    private String gradingConfigJson = "{}";
    @Size(max = 10000)
    private String solution = "";
    @NotBlank
    private String status = "pending";
    public String getCategory() { return category; }
    public void setCategory(String value) { category = value; }
    public String getSubcategory() { return subcategory; }
    public void setSubcategory(String value) { subcategory = value; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String value) { difficulty = value; }
    public String getQuestionType() { return questionType; }
    public void setQuestionType(String value) { questionType = value; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String value) { questionText = value; }
    public String getPassage() { return passage; }
    public void setPassage(String value) { passage = value; }
    public String getDataBlock() { return dataBlock; }
    public void setDataBlock(String value) { dataBlock = value; }
    public String getOptionsJson() { return optionsJson; }
    public void setOptionsJson(String value) { optionsJson = value; }
    public String getCorrectAnswerJson() { return correctAnswerJson; }
    public void setCorrectAnswerJson(String value) { correctAnswerJson = value; }
    public String getGradingConfigJson() { return gradingConfigJson; }
    public void setGradingConfigJson(String value) { gradingConfigJson = value; }
    public String getSolution() { return solution; }
    public void setSolution(String value) { solution = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
}
