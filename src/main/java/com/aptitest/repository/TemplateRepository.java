package com.aptitest.repository;

import com.aptitest.domain.TestTemplate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateRepository extends JpaRepository<TestTemplate, Long> {
    List<TestTemplate> findByActiveTrueOrderByIdAsc();
    boolean existsByName(String name);
}
