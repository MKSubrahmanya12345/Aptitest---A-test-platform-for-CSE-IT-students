package com.aptitest.service;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

class GradingServiceTest {
    private final GradingService grader = new GradingService();
    static Stream<Arguments> cases() {
        return Stream.of(
            Arguments.of("mcq_single", "{\"value\":\"A\"}", "{}", " a ", true),
            Arguments.of("mcq_single", "{\"value\":\"B\"}", "{}", "A", false),
            Arguments.of("mcq_multiple", "{\"values\":[\"A\",\"C\"]}", "{}", "[\"c\",\"A\"]", true),
            Arguments.of("mcq_multiple", "{\"values\":[\"A\",\"C\"]}", "{}", "[\"A\"]", false),
            Arguments.of("numeric", "{\"value\":0}", "{}", "0", true),
            Arguments.of("numeric", "{\"value\":1200}", "{}", "1,200", true),
            Arguments.of("numeric", "{\"value\":0.5}", "{}", ".5", true),
            Arguments.of("numeric", "{\"value\":-25}", "{\"tolerance\":0}", "-2.5e1", true),
            Arguments.of("numeric", "{\"value\":10}", "{\"tolerance\":0.1}", "10.1", true),
            Arguments.of("numeric", "{\"value\":10}", "{\"tolerance\":0.1}", "10.11", false),
            Arguments.of("numeric", "{\"value\":10}", "{}", "NaN", false),
            Arguments.of("numeric", "{\"value\":10}", "{}", "Infinity", false),
            Arguments.of("numeric_with_unit", "{\"value\":50,\"unit\":\"km/h\"}", "{\"unit_required\":true}", "50 KM/H", true),
            Arguments.of("numeric_with_unit", "{\"value\":50,\"unit\":\"km/h\"}", "{\"unit_required\":true}", "50", false),
            Arguments.of("numeric_with_unit", "{\"value\":50,\"unit\":\"km/h\"}", "{\"unit_required\":true}", "50 m/s", false),
            Arguments.of("data_interpretation", "{\"value\":\"Tuesday\"}", "{}", "tuesday", true),
            Arguments.of("fraction", "{\"numerator\":1,\"denominator\":2}", "{}", "2/4", true),
            Arguments.of("fraction", "{\"numerator\":-1,\"denominator\":2}", "{}", "1/-2", true),
            Arguments.of("fraction", "{\"numerator\":1,\"denominator\":2}", "{}", "1/0", false),
            Arguments.of("fraction", "{\"numerator\":1,\"denominator\":2}", "{}", "0.5", false),
            Arguments.of("fraction", "{\"numerator\":1,\"denominator\":2}", "{\"allow_decimal_equivalent\":true}", "0.5", true),
            Arguments.of("ratio", "{\"values\":[2,3]}", "{\"allow_scaled_equivalent\":true}", "4:6", true),
            Arguments.of("ratio", "{\"values\":[2,3]}", "{}", "4:6", false),
            Arguments.of("ratio", "{\"values\":[30,60,90]}", "{}", "30:60:90", true),
            Arguments.of("ratio", "{\"values\":[2,3]}", "{\"allow_scaled_equivalent\":true}", "0:0", false),
            Arguments.of("boolean", "{\"value\":false}", "{}", "false", true),
            Arguments.of("boolean", "{\"value\":false}", "{}", "nonsense", false),
            Arguments.of("boolean", "{\"value\":true}", "{}", "yes", true),
            Arguments.of("short_text", "{\"answers\":[\"dynamic programming\",\"DP\"]}", "{}", " Dynamic   Programming ", true),
            Arguments.of("fill_in_blank", "{\"value\":\"new\"}", "{\"case_sensitive\":true}", "NEW", false),
            Arguments.of("short_text", "{\"value\":\"hello world\"}", "{\"ignore_punctuation\":true}", "Hello, world!", true)
        );
    }
    @ParameterizedTest @MethodSource("cases")
    void gradesLegacyQuestionTypes(String type, String correct, String config, String answer, boolean expected) {
        assertThat(grader.grade(type, correct, config, answer)).isEqualTo(expected);
    }
    @Test void missingAnswerIsNotCorrect() {
        assertThat(grader.grade("numeric", "{\"value\":0}", "{}", null)).isFalse();
        assertThat(grader.grade("boolean", "{\"value\":false}", "{}", "")).isFalse();
    }
    @Test void rejectsInvalidPaymentSignatures() {
        assertThat(PaymentService.validSignature("order_1", "pay_1", "bogus", "secret")).isFalse();
        assertThat(PaymentService.validSignature("order_1", "pay_1", "0".repeat(64), "secret")).isFalse();
    }
    @Test void verifiesKnownHmacAndRejectsTampering() throws Exception {
        var mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec("secret".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = java.util.HexFormat.of().formatHex(mac.doFinal("order_1|pay_1".getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        assertThat(PaymentService.validSignature("order_1", "pay_1", signature, "secret")).isTrue();
        assertThat(PaymentService.validSignature("order_2", "pay_1", signature, "secret")).isFalse();
    }
}
