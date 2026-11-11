package com.aptitest.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "at_payments", indexes = @Index(name = "idx_at_payments_access", columnList = "user_id,template_id,status"))
public class PaymentRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "template_id", nullable = false)
    private Long templateId;
    @Column(nullable = false, unique = true, length = 100)
    private String orderId;
    @Column(unique = true, length = 100)
    private String gatewayPaymentId;
    @Column(nullable = false, length = 20)
    private String gateway;
    @Column(nullable = false, length = 20)
    private String status = "pending";
    @Column(nullable = false)
    private int amountPaise;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false, nullable = false, foreignKey = @ForeignKey(name = "fk_at_paymentrecord_user"))
    private AppUser user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", insertable = false, updatable = false, nullable = false, foreignKey = @ForeignKey(name = "fk_at_paymentrecord_template"))
    private TestTemplate template;

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getTemplateId() { return templateId; }
    public void setTemplateId(Long templateId) { this.templateId = templateId; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getGatewayPaymentId() { return gatewayPaymentId; }
    public void setGatewayPaymentId(String gatewayPaymentId) { this.gatewayPaymentId = gatewayPaymentId; }
    public String getGateway() { return gateway; }
    public void setGateway(String gateway) { this.gateway = gateway; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getAmountPaise() { return amountPaise; }
    public void setAmountPaise(int amountPaise) { this.amountPaise = amountPaise; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
