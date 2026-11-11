package com.aptitest.service;

import com.fasterxml.jackson.databind.*;
import java.util.*;

/** Accepts the JSON structures used by the original TypeScript question bank. */
public final class JsonSupport {
    public static final ObjectMapper MAPPER = new ObjectMapper();
    private JsonSupport() { }

    public static JsonNode parse(String value) {
        try { return MAPPER.readTree(value == null || value.isBlank() ? "{}" : value); }
        catch (Exception e) { throw new BusinessException("Invalid JSON. Check brackets, quotes, and commas."); }
    }

    public static String json(Object value) {
        try { return MAPPER.writeValueAsString(value); }
        catch (Exception e) { throw new BusinessException("Could not encode the answer."); }
    }

    public static Map<String, String> options(String raw) {
        JsonNode node = parse(raw);
        Map<String, String> options = new LinkedHashMap<>();
        if (node.isObject()) node.properties().forEach(e -> options.put(e.getKey(), e.getValue().asText()));
        if (node.isArray()) {
            int i = 0;
            for (JsonNode item : node) {
                String key = item.isObject() ? item.path("label").asText(item.path("key").asText("" + (char) ('A' + i))) : "" + (char) ('A' + i);
                options.put(key, item.isObject() ? item.path("text").asText(item.path("value").asText()) : item.asText());
                i++;
            }
        }
        return options;
    }

    public static Set<String> selections(String answer) {
        if (answer == null || answer.isBlank()) return Set.of();
        try {
            JsonNode parsed = MAPPER.readTree(answer);
            if (parsed != null && parsed.isArray()) {
                Set<String> values = new LinkedHashSet<>();
                parsed.forEach(n -> values.add(n.asText()));
                return values;
            }
        } catch (Exception ignored) { /* A single selection is plain text. */ }
        return Set.of(answer);
    }

    public static String answerDisplay(String raw) {
        JsonNode n = parse(raw);
        if (n.has("numerator")) return n.path("numerator").asText() + "/" + n.path("denominator").asText();
        if (n.has("values")) {
            List<String> a = new ArrayList<>();
            n.path("values").forEach(x -> a.add(x.asText()));
            return String.join(", ", a);
        }
        if (n.has("answers")) {
            List<String> a = new ArrayList<>();
            n.path("answers").forEach(x -> a.add(x.asText()));
            return String.join(" / ", a);
        }
        if (n.has("value")) return n.path("value").asText() + (n.has("unit") ? " " + n.path("unit").asText() : "");
        return n.isValueNode() ? n.asText() : n.toString();
    }

    public static List<String> csv(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
    }
}
