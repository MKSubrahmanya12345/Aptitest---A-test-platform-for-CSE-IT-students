package com.aptitest.repository;

import com.aptitest.domain.AppUser;
import com.aptitest.domain.Role;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    Optional<AppUser> findByVerificationHash(String hash);
    Optional<AppUser> findByResetHash(String hash);
    boolean existsByEmailIgnoreCase(String email);
    List<AppUser> findByRoleOrderByNameAsc(Role role);
    long countByRole(Role role);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> lockById(@Param("id") Long id);
}
