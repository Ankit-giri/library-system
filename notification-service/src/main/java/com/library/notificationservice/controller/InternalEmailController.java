package com.library.notificationservice.controller;

import com.library.notificationservice.service.EmailSimulatorService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal")
public class InternalEmailController {

    private final EmailSimulatorService emailSimulatorService;

    public InternalEmailController(EmailSimulatorService emailSimulatorService) {
        this.emailSimulatorService = emailSimulatorService;
    }

    @PostMapping("/email")
    public ResponseEntity<Void> sendEmail(@RequestBody Map<String, String> body) {
        emailSimulatorService.sendEmail(
                body.getOrDefault("userId", "system"),
                body.get("recipient"),
                body.get("subject"),
                body.get("body"));
        return ResponseEntity.ok().build();
    }
}
