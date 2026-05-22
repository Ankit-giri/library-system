package com.library.paymentservice.service;

import com.library.paymentservice.dto.MembershipStatusDTO;
import com.library.paymentservice.dto.PaymentConfirmationRequest;
import com.library.paymentservice.dto.PaymentSessionDTO;
import com.library.paymentservice.entity.MembershipFeeEntity;
import com.library.paymentservice.entity.PaymentPlan;
import com.library.paymentservice.repository.MembershipFeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService unit tests")
@SuppressWarnings("null")   // Mockito thenReturn() is safe; @NonNull warnings are false positives here
class PaymentServiceTest {

    @Mock
    private MembershipFeeRepository membershipFeeRepository;

    @Mock
    private PaymentNotificationService notificationService;

    @InjectMocks
    private PaymentService paymentService;

    // ── Shared fixtures ────────────────────────────────────────────────────────

    private static final String STUDENT_ID = "STU0000001";

    /**
     * A saved MembershipFeeEntity whose expiry is 30 days from now
     * (active membership).
     */
    private MembershipFeeEntity activeFeeEntity;

    /**
     * A saved MembershipFeeEntity whose expiry was 1 day ago
     * (expired membership).
     */
    private MembershipFeeEntity expiredFeeEntity;

    @BeforeEach
    void setUp() {
        activeFeeEntity = MembershipFeeEntity.builder()
                .id(1L)
                .studentId(STUDENT_ID)
                .plan(PaymentPlan.MONTHLY.name())
                .amount(BigDecimal.valueOf(PaymentPlan.MONTHLY.getPrice()))
                .transactionId("TXN-001")
                .cardLastFour("1234")
                .expiryDate(LocalDate.now().plusDays(30))
                .paidAt(OffsetDateTime.now().minusDays(1))
                .build();

        expiredFeeEntity = MembershipFeeEntity.builder()
                .id(2L)
                .studentId(STUDENT_ID)
                .plan(PaymentPlan.MONTHLY.name())
                .amount(BigDecimal.valueOf(PaymentPlan.MONTHLY.getPrice()))
                .transactionId("TXN-002")
                .cardLastFour("5678")
                .expiryDate(LocalDate.now().minusDays(1))   // yesterday — expired
                .paidAt(OffsetDateTime.now().minusDays(32))
                .build();
    }

    // ── initiatePayment ────────────────────────────────────────────────────────

    @Test
    @DisplayName("initiatePayment — returns a session DTO with correct plan and amount")
    void testInitiatePayment_Success() {
        // Act
        PaymentSessionDTO session = paymentService.initiatePayment("MONTHLY", STUDENT_ID);

        // Assert — no repository interaction needed; this is in-memory only
        assertThat(session.getSessionId()).isNotBlank();
        assertThat(session.getAmount()).isEqualTo(PaymentPlan.MONTHLY.getPrice());
        assertThat(session.getPlan()).isEqualTo("MONTHLY");
        assertThat(session.getExpiresIn()).isEqualTo(300);

        verifyNoInteractions(membershipFeeRepository);
    }

    @Test
    @DisplayName("initiatePayment — unknown plan name throws IllegalArgumentException")
    void testInitiatePayment_InvalidPlan_ThrowsException() {
        // Act & Assert
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.initiatePayment("PLATINUM", STUDENT_ID));

        assertThat(ex.getMessage()).contains("Invalid payment plan");
        verifyNoInteractions(membershipFeeRepository);
    }

    // ── confirmPayment ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("confirmPayment — success path persists fee and sends notification")
    void testConfirmPayment_Success_ExtendsMembership() {
        // Arrange — create a live session first (the only way to populate the internal map)
        PaymentSessionDTO session = paymentService.initiatePayment("MONTHLY", STUDENT_ID);

        // Student has no existing membership → base date will be today
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(Collections.emptyList());

        MembershipFeeEntity savedFee = MembershipFeeEntity.builder()
                .id(10L)
                .studentId(STUDENT_ID)
                .plan(PaymentPlan.MONTHLY.name())
                .amount(BigDecimal.valueOf(PaymentPlan.MONTHLY.getPrice()))
                .transactionId("TXN-MOCK")
                .cardLastFour("9999")
                .expiryDate(LocalDate.now().plusDays(PaymentPlan.MONTHLY.getDurationDays()))
                .paidAt(OffsetDateTime.now())
                .build();

        when(membershipFeeRepository.save(any(MembershipFeeEntity.class))).thenReturn(savedFee);

        PaymentConfirmationRequest request = new PaymentConfirmationRequest();
        request.setSessionId(session.getSessionId());
        request.setCardLastFour("9999");
        request.setSimulateSuccess(true);

        // Act — should complete without exception
        paymentService.confirmPayment(request);

        // Assert — fee saved and notification sent
        verify(membershipFeeRepository).save(any(MembershipFeeEntity.class));
        verify(notificationService).sendMembershipPaymentNotification(any(MembershipFeeEntity.class));
    }

    @Test
    @DisplayName("confirmPayment — simulateSuccess=false throws IllegalStateException, no fee persisted")
    void testConfirmPayment_Failed_NoExtension() {
        // Arrange — create a live session
        PaymentSessionDTO session = paymentService.initiatePayment("MONTHLY", STUDENT_ID);

        PaymentConfirmationRequest request = new PaymentConfirmationRequest();
        request.setSessionId(session.getSessionId());
        request.setCardLastFour("9999");
        request.setSimulateSuccess(false);   // ← simulate failure

        // Act & Assert
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> paymentService.confirmPayment(request));

        assertThat(ex.getMessage()).contains("Payment failed");

        // No membership record must be saved on failure
        verify(membershipFeeRepository, never()).save(any());
        verify(notificationService, never()).sendMembershipPaymentNotification(any());
    }

    @Test
    @DisplayName("confirmPayment — expired/unknown sessionId throws IllegalArgumentException")
    void testConfirmPayment_InvalidSession_ThrowsException() {
        // Arrange — a sessionId that was never created
        PaymentConfirmationRequest request = new PaymentConfirmationRequest();
        request.setSessionId("non-existent-session-id");
        request.setCardLastFour("1234");
        request.setSimulateSuccess(true);

        // Act & Assert
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> paymentService.confirmPayment(request));

        assertThat(ex.getMessage()).contains("expired or invalid");
        verify(membershipFeeRepository, never()).save(any());
    }

    // ── isMembershipActive ─────────────────────────────────────────────────────

    @Test
    @DisplayName("isMembershipActive — future expiry returns true")
    void testIsMembershipActive_ActiveMembership_ReturnsTrue() {
        // Arrange — latest payment record expires 30 days from now
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(List.of(activeFeeEntity));

        // Act
        boolean result = paymentService.isMembershipActive(STUDENT_ID);

        // Assert
        assertThat(result).isTrue();
        verify(membershipFeeRepository).findByStudentIdOrderByPaidAtDesc(STUDENT_ID);
    }

    @Test
    @DisplayName("isMembershipActive — past expiry returns false")
    void testIsMembershipActive_ExpiredMembership_ReturnsFalse() {
        // Arrange — latest payment record expired yesterday
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(List.of(expiredFeeEntity));

        // Act
        boolean result = paymentService.isMembershipActive(STUDENT_ID);

        // Assert
        assertThat(result).isFalse();
        verify(membershipFeeRepository).findByStudentIdOrderByPaidAtDesc(STUDENT_ID);
    }

    @Test
    @DisplayName("isMembershipActive — no payment history returns false")
    void testIsMembershipActive_NoHistory_ReturnsFalse() {
        // Arrange — student has never paid
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(Collections.emptyList());

        // Act
        boolean result = paymentService.isMembershipActive(STUDENT_ID);

        // Assert
        assertThat(result).isFalse();
    }

    // ── getMembershipStatus ────────────────────────────────────────────────────

    @Test
    @DisplayName("getMembershipStatus — active entity returns DTO with active=true and correct expiry")
    void testGetMembershipStatus_ActiveMembership() {
        // Arrange
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(List.of(activeFeeEntity));

        // Act
        MembershipStatusDTO status = paymentService.getMembershipStatus(STUDENT_ID);

        // Assert
        assertThat(status.isActive()).isTrue();
        assertThat(status.getPlan()).isEqualTo(PaymentPlan.MONTHLY.name());
        assertThat(status.getExpiryDate()).isEqualTo(activeFeeEntity.getExpiryDate());
    }

    @Test
    @DisplayName("getMembershipStatus — uses most-recent record when multiple payments exist")
    void testGetMembershipStatus_UsesLatestRecord() {
        // Arrange — two records; the first one (index 0) is what findByStudentIdOrderByPaidAtDesc returns first
        // Active record comes back first (repo orders by paidAt DESC)
        when(membershipFeeRepository.findByStudentIdOrderByPaidAtDesc(STUDENT_ID))
                .thenReturn(List.of(activeFeeEntity, expiredFeeEntity));

        // Act
        MembershipStatusDTO status = paymentService.getMembershipStatus(STUDENT_ID);

        // Assert — only the first (most recent) record is used
        assertThat(status.isActive()).isTrue();
        assertThat(status.getExpiryDate()).isEqualTo(activeFeeEntity.getExpiryDate());
    }
}
