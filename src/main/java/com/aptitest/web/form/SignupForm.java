package com.aptitest.web.form;

import jakarta.validation.constraints.*;

public class SignupForm {
    @NotBlank(message = "Name is required") @Size(max = 100, message = "Name must be at most 100 characters")
    private String name = "";
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @Size(max = 254)
    private String email = "";
    @NotBlank(message = "Password is required") @Size(min = 8, max = 72, message = "Password must be 8–72 characters")
    private String password = "";
    @NotBlank(message = "Confirm your password")
    private String confirmPassword = "";
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getEmail() { return email; }
    public void setEmail(String value) { email = value; }
    public String getPassword() { return password; }
    public void setPassword(String value) { password = value; }
    public String getConfirmPassword() { return confirmPassword; }
    public void setConfirmPassword(String value) { confirmPassword = value; }
}
