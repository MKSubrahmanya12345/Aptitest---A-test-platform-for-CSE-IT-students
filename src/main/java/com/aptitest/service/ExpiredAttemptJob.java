package com.aptitest.service;

import com.aptitest.repository.AttemptRepository;
import java.time.Instant;
import org.slf4j.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ExpiredAttemptJob {
    private static final Logger log = LoggerFactory.getLogger(ExpiredAttemptJob.class);
    private final AttemptRepository attempts;
    private final AttemptService service;
    public ExpiredAttemptJob(AttemptRepository attempts, AttemptService service) { this.attempts = attempts; this.service = service; }
    @Scheduled(fixedDelayString = "${app.auto-submit-delay-ms:15000}", initialDelay = 15000)
    public void run() {
        for (var a : attempts.findTop100ByStatusAndExpiresAtBefore("in_progress", Instant.now())) {
            try { service.autoSubmit(a.getId()); }
            catch (Exception e) { log.warn("Could not auto-submit attempt {}: {}", a.getId(), e.getClass().getSimpleName()); }
        }
    }
}
