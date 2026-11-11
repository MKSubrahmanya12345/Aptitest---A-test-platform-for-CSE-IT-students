package com.aptitest.web;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.*;
import java.util.Map;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class SiteController implements ErrorController {
    private final JdbcTemplate jdbc;
    private volatile boolean ready;
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void markReady() { ready = true; }
    public SiteController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @GetMapping("/api/health") @ResponseBody public ResponseEntity<Map<String, String>> health() {
        if (!ready) return ResponseEntity.status(503).body(Map.of("status", "starting", "db", "initializing"));
        try { jdbc.queryForObject("SELECT 1", Integer.class); return ResponseEntity.ok(Map.of("status", "ok", "db", "connected")); }
        catch (Exception e) { return ResponseEntity.status(503).body(Map.of("status", "error", "db", "disconnected")); }
    }
    @RequestMapping("/forbidden") public String forbidden(HttpServletResponse response, Model model) {
        response.setStatus(403); model.addAttribute("statusCode", 403); model.addAttribute("message", "You do not have permission to access this page."); return "error";
    }
    @RequestMapping("/error") public String error(HttpServletRequest request, HttpServletResponse response, Model model) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int code = status instanceof Integer n ? n : 500;
        response.setStatus(code); model.addAttribute("statusCode", code);
        model.addAttribute("message", code == 404 ? "We couldn't find that page." : code == 403 ? "You do not have permission to access this page." : "Something went wrong. Please try again.");
        return "error";
    }
    @GetMapping("/review") public String review() { return "redirect:/admin/manage-questions"; }
}
