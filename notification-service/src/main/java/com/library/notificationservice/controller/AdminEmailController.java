package com.library.notificationservice.controller;

import com.library.notificationservice.dto.EmailBroadcastRequest;
import com.library.notificationservice.dto.SimulatedEmailDTO;
import com.library.notificationservice.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/emails")
public class AdminEmailController {

    private final NotificationService notificationService;

    public AdminEmailController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<SimulatedEmailDTO>> getEmails(Pageable pageable) {
        return ResponseEntity.ok(notificationService.getSentEmails(pageable));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> broadcastEmail(@RequestBody EmailBroadcastRequest request) {
        notificationService.broadcastEmail(request.getSubject(), request.getMessage());
        return ResponseEntity.noContent().build();
    }
}
