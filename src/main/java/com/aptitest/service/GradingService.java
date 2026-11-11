package com.aptitest.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.*;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.*;
import org.springframework.stereotype.Service;

@Service
public class GradingService {
    public static final Set<String> TYPES = Set.of("mcq_single", "mcq_multiple", "numeric", "numeric_with_unit", "data_interpretation", "fraction", "ratio", "boolean", "fill_in_blank", "short_text");
    private static final Pattern NUMBER = Pattern.compile("^([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)\\s*(.*?)$");

    public boolean grade(String type, String correctJson, String configJson, String answer) {
        if (answer == null || answer.isBlank()) return false;
        try {
            JsonNode correct = JsonSupport.parse(correctJson), config = JsonSupport.parse(configJson);
            String expected = correct.has("value") ? correct.path("value").asText() : correct.asText();
            String actual = answer.trim();
            return switch (type.toLowerCase(Locale.ROOT)) {
                case "mcq_single" -> expected.trim().equalsIgnoreCase(actual);
                case "boolean" -> {
                    Boolean a = bool(actual), b = bool(expected);
                    yield a != null && b != null && a.equals(b);
                }
                case "mcq_multiple" -> normalizedSet(correct.has("values") ? correct.path("values") : correct.path("value"))
                        .equals(normalizedSet(JsonSupport.MAPPER.readTree(actual.startsWith("[") ? actual : JsonSupport.json(List.of(actual)))));
                case "fraction" -> fraction(correct, config, actual);
                case "ratio" -> ratio(correct, config, actual);
                case "numeric", "numeric_with_unit", "data_interpretation" -> {
                    Matcher m = NUMBER.matcher(actual.replace(",", ""));
                    if (!m.matches()) yield "data_interpretation".equals(type) && expected.trim().equalsIgnoreCase(actual);
                    BigDecimal difference = new BigDecimal(expected).subtract(new BigDecimal(m.group(1))).abs();
                    BigDecimal tolerance = new BigDecimal(config.path("tolerance").asText("0.01")).abs();
                    boolean unitOk = !"numeric_with_unit".equals(type) || !config.path("unit_required").asBoolean(false)
                            || correct.path("unit").asText().trim().equalsIgnoreCase(m.group(2).trim());
                    yield difference.compareTo(tolerance) <= 0 && unitOk;
                }
                default -> {
                    List<String> expectedValues = new ArrayList<>();
                    if (correct.path("answers").isArray()) correct.path("answers").forEach(n -> expectedValues.add(n.asText()));
                    else expectedValues.add(expected);
                    yield expectedValues.stream().anyMatch(s -> clean(s, config).equals(clean(actual, config)));
                }
            };
        } catch (Exception invalidAnswer) { return false; }
    }

    private boolean fraction(JsonNode correct, JsonNode config, String actual) {
        BigDecimal n = new BigDecimal(correct.path("numerator").asText()), d = new BigDecimal(correct.path("denominator").asText());
        if (d.signum() == 0) return false;
        String[] values = actual.split("/", -1);
        if (values.length == 2) {
            BigDecimal un = new BigDecimal(values[0].trim()), ud = new BigDecimal(values[1].trim());
            if (ud.signum() == 0) return false;
            if (n.multiply(ud).compareTo(un.multiply(d)) == 0) return true;
            return config.path("allow_decimal_equivalent").asBoolean(false)
                    && n.divide(d, MathContext.DECIMAL64).subtract(un.divide(ud, MathContext.DECIMAL64)).abs().compareTo(new BigDecimal("0.01")) <= 0;
        }
        return config.path("allow_decimal_equivalent").asBoolean(false)
                && n.divide(d, MathContext.DECIMAL64).subtract(new BigDecimal(actual)).abs().compareTo(new BigDecimal("0.01")) <= 0;
    }

    private boolean ratio(JsonNode correct, JsonNode config, String actual) {
        JsonNode expected = correct.path("values");
        String[] parts = actual.split(":", -1);
        if (!expected.isArray() || expected.size() < 2 || parts.length != expected.size()) return false;
        List<BigDecimal> a = new ArrayList<>(), b = new ArrayList<>();
        for (int i = 0; i < parts.length; i++) { a.add(new BigDecimal(expected.get(i).asText())); b.add(new BigDecimal(parts[i].trim())); }
        if (!config.path("allow_scaled_equivalent").asBoolean(false)) {
            for (int i = 0; i < a.size(); i++) if (a.get(i).compareTo(b.get(i)) != 0) return false;
            return true;
        }
        int pivot = -1;
        for (int i = 0; i < a.size(); i++) if (a.get(i).signum() != 0) { pivot = i; break; }
        if (pivot < 0 || b.get(pivot).signum() == 0) return false;
        for (int i = 0; i < a.size(); i++) if (a.get(i).multiply(b.get(pivot)).compareTo(b.get(i).multiply(a.get(pivot))) != 0) return false;
        return true;
    }

    private static Boolean bool(String value) {
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "true", "yes", "y", "1" -> true;
            case "false", "no", "n", "0" -> false;
            default -> null;
        };
    }
    private Set<String> normalizedSet(JsonNode node) {
        Set<String> result = new HashSet<>();
        if (node.isArray()) node.forEach(x -> result.add(x.asText().trim().toUpperCase(Locale.ROOT)));
        else if (!node.isMissingNode()) result.add(node.asText().trim().toUpperCase(Locale.ROOT));
        return result;
    }
    private String clean(String value, JsonNode config) {
        String result = Normalizer.normalize(value, Normalizer.Form.NFKC);
        if (!config.path("case_sensitive").asBoolean(false)) result = result.toLowerCase(Locale.ROOT);
        if (config.path("ignore_punctuation").asBoolean(false)) result = result.replaceAll("[\\p{Punct}]", "");
        if (config.path("trim_spaces").asBoolean(true)) result = result.trim().replaceAll("\\s+", " ");
        return result;
    }
}
