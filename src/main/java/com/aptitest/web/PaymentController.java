package com.aptitest.web;

import com.aptitest.config.AppPrincipal;
import com.aptitest.service.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/checkout")
public class PaymentController {
    private final PaymentService payments;
    private final TemplateService templates;
    public PaymentController(PaymentService payments, TemplateService templates) { this.payments = payments; this.templates = templates; }
    @GetMapping("/{id}") public String checkout(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p, Model model) {
        var t = templates.get(id);
        if (payments.hasAccess(p.getId(), t)) return "redirect:/dashboard";
        model.addAttribute("template", t); model.addAttribute("order", payments.createOrder(p.getId(), id));
        model.addAttribute("paymentMode", payments.getMode()); model.addAttribute("razorpayKeyId", payments.getKeyId());
        return "checkout";
    }
    @PostMapping("/{id}/demo") public String demo(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p, @RequestParam String orderId, RedirectAttributes flash) {
        payments.completeDemo(p.getId(), id, orderId); flash.addFlashAttribute("success", "Demo access granted. No money was charged."); return "redirect:/dashboard";
    }
    @PostMapping("/{id}/verify") public String verify(@PathVariable Long id, @AuthenticationPrincipal AppPrincipal p, @RequestParam String orderId,
            @RequestParam String paymentId, @RequestParam String signature, RedirectAttributes flash) {
        payments.verifyRazorpay(p.getId(), id, orderId, paymentId, signature); flash.addFlashAttribute("success", "Payment verified. Your test is now unlocked."); return "redirect:/dashboard";
    }
}
