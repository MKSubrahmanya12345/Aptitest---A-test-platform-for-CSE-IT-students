package com.aptitest.repository;

import com.aptitest.domain.AttemptQuestion;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttemptQuestionRepository extends JpaRepository<AttemptQuestion, Long> {
    List<AttemptQuestion> findByAttemptIdOrderByPositionAsc(Long attemptId);
    Optional<AttemptQuestion> findByAttemptIdAndPosition(Long attemptId, int position);
    List<AttemptQuestion> findByAttemptIdIn(Collection<Long> attemptIds);
}
