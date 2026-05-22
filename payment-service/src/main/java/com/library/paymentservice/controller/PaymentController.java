package com.library.paymentservice.controller;

import com.library.paymentservice.dto.MembershipStatusDTO;
import com.library.paymentservice.dto.PaymentConfirmationRequest;
import com.library.paymentservice.dto.PaymentDTO;
import com.library.paymentservice.dto.PaymentHistoryDTO;
import com.library.paymentservice.dto.PaymentSessionDTO;
import com.library.paymentservice.dto.PaymentStatsDTO;
import com.library.paymentservice.dto.PaymentsResponseDTO;
import com.library.paymentservice.dto.PendingRenewalsDTO;
import com.library.paymentservice.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping("/plans")
    public ResponseEntity<List<PaymentDTO>> getPlans() {
        return ResponseEntity.ok(paymentService.getPlans());
    }

    @GetMapping("/my-membership")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<MembershipStatusDTO> getMyMembership(@RequestHeader("X-Student-Id") String studentId) {
        return ResponseEntity.ok(paymentService.getMembershipStatus(studentId));
    }

    @GetMapping("/memberships/{studentId}/active")
    public ResponseEntity<Boolean> isMembershipActive(@PathVariable String studentId) {
        return ResponseEntity.ok(paymentService.isMembershipActive(studentId));
    }

    @PostMapping("/initiate")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<PaymentSessionDTO> initiatePayment(
            @RequestParam String plan,
            @RequestHeader("X-Student-Id") String studentId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.initiatePayment(plan, studentId));
    }

    @PostMapping("/confirm")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> confirmPayment(@Valid @RequestBody PaymentConfirmationRequest request) {
        paymentService.confirmPayment(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<PaymentHistoryDTO>> getPaymentHistory(@RequestHeader("X-Student-Id") String studentId) {
        return ResponseEntity.ok(paymentService.getPaymentHistory(studentId));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentsResponseDTO> getAllPayments(
            @RequestParam(required = false) String plan,
            @RequestParam(required = false) String studentId,
            @RequestParam(required = false) String month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(paymentService.getAllPayments(plan, studentId, month, page, size));
    }

    @GetMapping("/pending-renewals")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PendingRenewalsDTO> getPendingRenewals(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(paymentService.getPendingRenewals(days));
    }

    @GetMapping("/revenue-stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PaymentStatsDTO> getRevenueStats() {
        return ResponseEntity.ok(paymentService.getRevenueStats());
    }
}
