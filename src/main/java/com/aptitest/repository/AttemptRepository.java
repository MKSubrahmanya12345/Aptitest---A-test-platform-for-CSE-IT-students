package com.aptitest.repository;

import com.aptitest.domain.TestAttempt;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AttemptRepository extends JpaRepository<TestAttempt, Long> {
    List<TestAttempt> findByUserIdOrderByStartedAtDesc(Long userId);
    Page<TestAttempt> findByUserIdOrderByStartedAtDesc(Long userId, Pageable page);
    Optional<TestAttempt> findFirstByUserIdAndStatusOrderByStartedAtDesc(Long userId, String status);
    List<TestAttempt> findByStatus(String status);
    List<TestAttempt> findTop100ByStatusAndExpiresAtBefore(String status, Instant now);
    long countByStatus(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TestAttempt a where a.id = :id")
    Optional<TestAttempt> lockById(@Param("id") Long id);
}
