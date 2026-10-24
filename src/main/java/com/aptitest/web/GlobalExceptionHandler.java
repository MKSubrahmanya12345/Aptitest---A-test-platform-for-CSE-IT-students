package com.aptitest.web;

import com.aptitest.service.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@ControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(BusinessException.class) public Object business(BusinessException e, HttpServletRequest request) { return reply(400, e.getMessage(), request); }
    @ExceptionHandler(AccessDeniedException.class) public Object denied(HttpServletRequest request) { return reply(403, "You do not have permission to access this resource.", request); }
    @ExceptionHandler(NoResourceFoundException.class) public Object missing(HttpServletRequest request) { return reply(404, "We couldn't find that page.", request); }
    @ExceptionHandler(MaxUploadSizeExceededException.class) public Object upload(HttpServletRequest request) { return reply(400, "The upload must be 2 MB or smaller.", request); }
    @ExceptionHandler({DataIntegrityViolationException.class, ObjectOptimisticLockingFailureException.class}) public Object conflict(HttpServletRequest request) { return reply(409, "This record was changed or already exists. Refresh the page and try again.", request); }
    @ExceptionHandler({org.springframework.web.bind.MissingServletRequestParameterException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class, org.springframework.validation.BindException.class})
    public Object invalid(HttpServletRequest request) { return reply(400, "The request contains missing or invalid fields.", request); }
    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class) public Object responseStatus(org.springframework.web.server.ResponseStatusException e, HttpServletRequest request) { return reply(e.getStatusCode().value(), "The requested resource is not available.", request); }
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class) public Object method(HttpServletRequest request) { return reply(405, "That HTTP method is not supported for this page.", request); }
    @ExceptionHandler(Exception.class) public Object unexpected(Exception e, HttpServletRequest request) {
        log.error("Request failed at {}", request.getRequestURI(), e); return reply(500, "Something went wrong. Please try again or contact the administrator.", request);
    }
    private Object reply(int status, String message, HttpServletRequest request) {
        if (request.getRequestURI().endsWith("/autosave") || String.valueOf(request.getHeader("Accept")).contains("application/json")) return ResponseEntity.status(status).body(Map.of("message", message));
        ModelAndView view = new ModelAndView("error"); view.setStatus(org.springframework.http.HttpStatus.valueOf(status)); view.addObject("message", message); view.addObject("statusCode", status); return view;
    }
}
