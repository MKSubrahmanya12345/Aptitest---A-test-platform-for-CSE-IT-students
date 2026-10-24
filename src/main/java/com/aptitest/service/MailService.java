package com.aptitest.service;

import java.net.http.HttpClient;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class MailService {
    public record DemoMail(String recipient, String subject, String path, Instant createdAt) {
        public String getRecipient() { return recipient; }
        public String getSubject() { return subject; }
        public String getPath() { return path; }
        public Instant getCreatedAt() { return createdAt; }
    }
    private final String mode, baseUrl, from, apiKey;
    private final RestClient sender;
    private final Deque<DemoMail> outbox = new ConcurrentLinkedDeque<>();

    public MailService(@Value("${app.mail-mode}") String mode, @Value("${app.base-url}") String baseUrl,
                       @Value("${app.mail-from}") String from, @Value("${app.mail-api-key:}") String apiKey) {
        this.mode = mode; this.baseUrl = baseUrl.replaceAll("/+$", ""); this.from = from; this.apiKey = apiKey;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        sender = RestClient.builder().baseUrl("https://api.sendgrid.com/v3").requestFactory(factory)
                .defaultHeaders(h -> h.setBearerAuth(apiKey)).build();
    }
    public void sendLink(String email, String subject, String path) {
        if ("demo".equals(mode)) {
            outbox.addFirst(new DemoMail(email, subject, path, Instant.now()));
            while (outbox.size() > 50) outbox.pollLast();
            return;
        }
        if (!"sendgrid".equals(mode) || apiKey.isBlank()) throw new BusinessException("Email delivery is not configured. Please contact the administrator.");
        try {
            sender.post().uri("/mail/send").body(Map.of(
                    "personalizations", List.of(Map.of("to", List.of(Map.of("email", email)))),
                    "from", Map.of("email", from), "subject", subject,
                    "content", List.of(Map.of("type", "text/plain", "value", subject + "\n\n" + baseUrl + path
                            + "\n\nIf you did not request this, ignore this message."))))
                .retrieve().toBodilessEntity();
        } catch (Exception e) { throw new BusinessException("Email could not be sent. Please try again later or contact the administrator."); }
    }
    public List<DemoMail> getOutbox() { return List.copyOf(outbox); }
}
