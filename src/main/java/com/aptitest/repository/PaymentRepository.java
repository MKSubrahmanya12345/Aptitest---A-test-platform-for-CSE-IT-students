package com.aptitest.repository;

import com.aptitest.domain.PaymentRecord;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<PaymentRecord, Long> {
    boolean existsByUserIdAndTemplateIdAndStatus(Long userId, Long templateId, String status);
    Optional<PaymentRecord> findFirstByUserIdAndTemplateIdAndStatusAndGatewayOrderByCreatedAtDesc(Long userId, Long templateId, String status, String gateway);
    Optional<PaymentRecord> findByOrderId(String orderId);
    List<PaymentRecord> findByUserIdAndStatus(Long userId, String status);
}
