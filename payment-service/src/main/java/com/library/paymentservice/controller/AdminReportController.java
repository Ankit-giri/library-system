package com.library.paymentservice.controller;

import com.library.paymentservice.dto.RevenueReportDTO;
import com.library.paymentservice.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportController {

    private final PaymentService paymentService;

    public AdminReportController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RevenueReportDTO> getRevenueReport(@RequestParam String month) {
        return ResponseEntity.ok(paymentService.getRevenueReport(month));
    }
}
