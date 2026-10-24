package com.aptitest.service;

import com.aptitest.domain.*;
import com.aptitest.repository.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final TemplateService templates;
    private final String mode, keyId, keySecret;
    private final boolean demoEnabled;
    private final RestClient gateway;

    public PaymentService(PaymentRepository payments, TemplateService templates,
            @Value("${app.payment-mode}") String mode, @Value("${app.demo-enabled}") boolean demoEnabled,
            @Value("${app.razorpay-key-id}") String keyId, @Value("${app.razorpay-key-secret}") String keySecret) {
        this.payments = payments; this.templates = templates; this.mode = mode; this.demoEnabled = demoEnabled; this.keyId = keyId; this.keySecret = keySecret;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        gateway = RestClient.builder().baseUrl("https://api.razorpay.com/v1").requestFactory(factory)
                .defaultHeaders(h -> h.setBasicAuth(keyId, keySecret)).build();
    }
    public String getMode() { return mode; }
    public String getKeyId() { return keyId; }
    public boolean hasAccess(Long userId, TestTemplate t) { return !t.isPaid() || payments.existsByUserIdAndTemplateIdAndStatus(userId, t.getId(), "succeeded"); }
    public Set<Long> accessIds(Long userId) {
        Set<Long> ids = new HashSet<>();
        payments.findByUserIdAndStatus(userId, "succeeded").forEach(p -> ids.add(p.getTemplateId()));
        return ids;
    }
    public void requireAccess(Long userId, TestTemplate t) { if (!hasAccess(userId, t)) throw new BusinessException("Unlock this paid template before starting the test."); }

    @Transactional
    public PaymentRecord createOrder(Long userId, Long templateId) {
        TestTemplate t = templates.get(templateId);
        if (!t.isActive() || !t.isPaid()) throw new BusinessException("This template is not available for purchase.");
        if (hasAccess(userId, t)) throw new BusinessException("You already have access to this template.");
        if (!("demo".equals(mode) && demoEnabled) && !"razorpay".equals(mode)) throw new BusinessException("Paid checkout is disabled. Please choose a free test.");
        if ("razorpay".equals(mode) && (keyId.isBlank() || keySecret.isBlank())) throw new BusinessException("Razorpay has not been configured. Please contact the administrator.");
        var existing = payments.findFirstByUserIdAndTemplateIdAndStatusAndGatewayOrderByCreatedAtDesc(userId, templateId, "pending", mode);
        if (existing.isPresent() && existing.get().getAmountPaise() == t.getPricePaise()) return existing.get();
        PaymentRecord p = new PaymentRecord();
        p.setUserId(userId); p.setTemplateId(templateId); p.setAmountPaise(t.getPricePaise()); p.setGateway(mode);
        if ("demo".equals(mode)) p.setOrderId("demo_" + UUID.randomUUID());
        else {
            try {
                JsonNode result = gateway.post().uri("/orders").body(Map.of("amount", t.getPricePaise(), "currency", "INR", "receipt", "at_" + UUID.randomUUID().toString().substring(0, 30))).retrieve().body(JsonNode.class);
                if (result == null || result.path("id").asText().isBlank()) throw new IllegalStateException();
                p.setOrderId(result.path("id").asText());
            } catch (Exception e) { throw new BusinessException("The payment gateway is unavailable. No local access was granted. Try again later."); }
        }
        return payments.save(p);
    }
    @Transactional
    public void completeDemo(Long userId, Long templateId, String orderId) {
        if (!demoEnabled || !"demo".equals(mode)) throw new BusinessException("Demo checkout is disabled.");
        PaymentRecord p = ownedOrder(userId, templateId, orderId);
        if (!"demo".equals(p.getGateway())) throw new BusinessException("Invalid demo order.");
        p.setStatus("succeeded"); p.setGatewayPaymentId("demo_payment_" + p.getOrderId());
    }
    @Transactional
    public void verifyRazorpay(Long userId, Long templateId, String orderId, String paymentId, String signature) {
        if (!"razorpay".equals(mode)) throw new BusinessException("Razorpay checkout is disabled.");
        PaymentRecord p = ownedOrder(userId, templateId, orderId);
        if (!"razorpay".equals(p.getGateway()) || !validSignature(orderId, paymentId, signature, keySecret)) throw new BusinessException("Payment signature could not be verified.");
        if ("succeeded".equals(p.getStatus())) return;
        if (paymentId == null || !paymentId.matches("pay_[A-Za-z0-9]+")) throw new BusinessException("Invalid payment reference.");
        try {
            JsonNode details = gateway.get().uri("/payments/{id}", paymentId).retrieve().body(JsonNode.class);
            if (details == null || !orderId.equals(details.path("order_id").asText()) || details.path("amount").asInt() != p.getAmountPaise()
                    || !"INR".equalsIgnoreCase(details.path("currency").asText()) || !"captured".equals(details.path("status").asText())) {
                throw new BusinessException("Payment is not captured or does not match the order. No access was granted; contact the administrator with your payment ID.");
            }
            p.setGatewayPaymentId(paymentId); p.setStatus("succeeded");
        } catch (BusinessException e) { throw e; }
        catch (Exception e) { throw new BusinessException("Payment confirmation is temporarily unavailable. Please contact the administrator before paying again."); }
    }
    private PaymentRecord ownedOrder(Long userId, Long templateId, String orderId) {
        PaymentRecord p = payments.findByOrderId(orderId).orElseThrow(() -> new BusinessException("Payment order not found."));
        if (!p.getUserId().equals(userId) || !p.getTemplateId().equals(templateId)) throw new BusinessException("Payment order does not belong to this account and template.");
        return p;
    }
    public static boolean validSignature(String order, String payment, String signature, String secret) {
        if (signature == null || !signature.matches("[0-9a-fA-F]{64}") || secret == null || secret.isBlank()) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return MessageDigest.isEqual(mac.doFinal((order + "|" + payment).getBytes(StandardCharsets.UTF_8)), HexFormat.of().parseHex(signature));
        } catch (Exception e) { return false; }
    }
}
