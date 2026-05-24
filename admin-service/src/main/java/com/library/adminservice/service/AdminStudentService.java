package com.library.adminservice.service;

import com.library.adminservice.config.AdminUrlProperties;
import com.library.adminservice.dto.BookingHistoryDTO;
import com.library.adminservice.dto.PaymentHistorySummaryDTO;
import com.library.adminservice.dto.StudentDetailDTO;
import com.library.adminservice.dto.StudentSummaryDTO;
import com.library.adminservice.entity.UserEntity;
import com.library.adminservice.exception.ResourceNotFoundException;
import com.library.adminservice.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class AdminStudentService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final String seatServiceUrl;
    private final String paymentServiceUrl;

    public AdminStudentService(UserRepository userRepository,
            RestTemplate restTemplate,
            AdminUrlProperties adminUrlProperties) {
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
        this.seatServiceUrl = adminUrlProperties.getSeatServiceUrl();
        this.paymentServiceUrl = adminUrlProperties.getPaymentServiceUrl();
    }

    public Page<StudentSummaryDTO> findStudents(String search, Boolean active, Pageable pageable) {
        return userRepository.searchActiveStudents(search, active, pageable)
                .map(this::toSummaryDto);
    }

    public List<StudentSummaryDTO> findAdmins() {
        return userRepository.findAllAdmins().stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    public StudentDetailDTO getStudentDetail(Long id) {
        UserEntity user = userRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return StudentDetailDTO.builder()
                .id(user.getId())
                .studentId(user.getStudentId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .active(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .bookingHistory(fetchBookingHistory(user.getStudentId()))
                .paymentHistory(fetchPaymentHistory(user.getStudentId()))
                .build();
    }

    @Transactional
    public void updateStudentActive(Long id, boolean active) {
        UserEntity user = userRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        user.setIsActive(active);
        userRepository.save(user);
    }

    @Transactional
    public void softDeleteStudent(Long id) {
        UserEntity user = userRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        user.setDeleted(true);
        user.setIsActive(false);
        userRepository.save(user);
    }

    private List<BookingHistoryDTO> fetchBookingHistory(String studentId) {
        try {
            URI uri = URI.create(String.format("%s/api/bookings?studentId=%s&page=0&size=50",
                    seatServiceUrl, studentId));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri, HttpMethod.GET,
                    new HttpEntity<>(buildAuthHeaders()),
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            if (body != null && body.get("content") instanceof List<?> list) {
                return list.stream()
                        .filter(Map.class::isInstance)
                        .map(Map.class::cast)
                        .map(this::mapBooking)
                        .collect(Collectors.toList());
            }
        } catch (Exception ignored) {
        }
        return Collections.emptyList();
    }

    private List<PaymentHistorySummaryDTO> fetchPaymentHistory(String studentId) {
        try {
            URI uri = URI.create(String.format("%s/api/payments?studentId=%s", paymentServiceUrl, studentId));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri, HttpMethod.GET,
                    new HttpEntity<>(buildAuthHeaders()),
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> body = response.getBody();
            Object payments = body != null ? body.get("payments") : null;
            if (payments instanceof List<?> list) {
                return list.stream()
                        .filter(Map.class::isInstance)
                        .map(Map.class::cast)
                        .map(this::mapPayment)
                        .collect(Collectors.toList());
            }
        } catch (Exception ignored) {
        }
        return Collections.emptyList();
    }

    private HttpHeaders buildAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        HttpServletRequest request = getCurrentHttpRequest();
        if (request != null) {
            String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (authorization != null) {
                headers.set(HttpHeaders.AUTHORIZATION, authorization);
            }
        }
        return headers;
    }

    private HttpServletRequest getCurrentHttpRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    private StudentSummaryDTO toSummaryDto(UserEntity user) {
        return StudentSummaryDTO.builder()
                .id(user.getId())
                .studentId(user.getStudentId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .active(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private BookingHistoryDTO mapBooking(Map<String, Object> map) {
        return BookingHistoryDTO.builder()
                .id(getLong(map.get("id")))
                .userEmail(getString(map.get("userEmail")))
                .studentId(getString(map.get("studentId")))
                .seatId(getLong(map.get("seatId")))
                .seatNumber(getString(map.get("seatNumber")))
                .zone(getString(map.get("zone")))
                .floor(getInteger(map.get("floor")))
                .status(getString(map.get("status")))
                .bookingDate(getString(map.get("bookingDate")))
                .timeSlot(getString(map.get("timeSlot")))
                .build();
    }

    private PaymentHistorySummaryDTO mapPayment(Map<String, Object> map) {
        return PaymentHistorySummaryDTO.builder()
                .transactionId(getString(map.get("transactionId")))
                .plan(getString(map.get("plan")))
                .amount(getString(map.get("amount")))
                .expiryDate(getString(map.get("expiryDate")))
                .paidAt(getString(map.get("paidAt")))
                .build();
    }

    private Long getLong(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value instanceof String s) return Long.parseLong(s);
        return null;
    }

    private Integer getInteger(Object value) {
        if (value instanceof Number n) return n.intValue();
        if (value instanceof String s) return Integer.parseInt(s);
        return null;
    }

    private String getString(Object value) {
        return value == null ? null : value.toString();
    }
}
