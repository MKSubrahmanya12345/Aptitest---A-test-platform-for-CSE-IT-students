package com.aptitest.repository;

import com.aptitest.domain.Question;
import java.util.List;
import org.springframework.data.jpa.repository.*;

public interface QuestionRepository extends JpaRepository<Question, Long>, JpaSpecificationExecutor<Question> {
    List<Question> findByStatus(String status);
    long countByStatus(String status);
    boolean existsBySourceRef(String sourceRef);
    @Query("select distinct q.category from Question q where q.status = 'active' order by q.category")
    List<String> activeCategories();
}
