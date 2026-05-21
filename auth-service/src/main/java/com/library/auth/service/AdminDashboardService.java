package com.library.auth.service;

import com.library.auth.config.AdminUrlProperties;
import com.library.auth.dto.AdminDashboardDTO;
import com.library.auth.dto.BookingHistoryDTO;
import com.library.auth.dto.PaymentHistorySummaryDTO;
import com.library.auth.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.net.URI;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final AdminUrlProperties adminUrlProperties;

    public AdminDashboardService(UserRepository userRepository,
            RestTemplate restTemplate,
            AdminUrlProperties adminUrlProperties) {
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
        this.adminUrlProperties = adminUrlProperties;
    }

    public AdminDashboardDTO getDashboard() {
        long totalStudents = userRepository.countByDeletedFalse();
        int activeBookingsToday = fetchActiveBookingsToday();
        List<Map<String, Object>> occupancy = fetchSeatOccupancy();
        int availableSeats = occupancy.stream().mapToInt(this::toInt).sum();
        int totalSeats = occupancy.stream()
                .mapToInt(entry -> toInt(entry.get("available")) + toInt(entry.get("occupied"))
                        + toInt(entry.get("maintenance")))
                .sum();
        BigDecimal monthlyRevenue = fetchMonthlyRevenue();
        int pendingRenewals = fetchPendingRenewals(30);
        List<BookingHistoryDTO> recentBookings = fetchRecentBookings();
        List<PaymentHistorySummaryDTO> recentPayments = fetchRecentPayments();

        return AdminDashboardDTO.builder()
                .totalStudents(totalStudents)
                .activeBookingsToday(activeBookingsToday)
                .availableSeats(availableSeats)
                .totalSeats(totalSeats)
                .monthlyRevenue(monthlyRevenue)
                .pendingRenewals(pendingRenewals)
                .recentBookings(recentBookings)
                .recentPayments(recentPayments)
                .build();
    }

    private int fetchActiveBookingsToday() {
        try {
            URI uri = Objects
                    .requireNonNull(URI.create(adminUrlProperties.getSeatServiceUrl() + "/api/bookings/today"));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            return body != null ? toInt(body.get("activeBookings")) : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private List<Map<String, Object>> fetchSeatOccupancy() {
        try {
            URI uri = Objects.requireNonNull(URI.create(adminUrlProperties.getSeatServiceUrl()
                    + "/api/admin/seats/occupancy"));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    });
            return response.getBody() != null ? response.getBody() : Collections.emptyList();
        } catch (Exception ignored) {
            return Collections.emptyList();
        }
    }

    private BigDecimal fetchMonthlyRevenue() {
        try {
            String month = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
            URI uri = Objects.requireNonNull(URI.create(adminUrlProperties.getPaymentServiceUrl()
                    + "/api/admin/reports/revenue?month=" + month));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            return toBigDecimal(body != null ? body.get("totalRevenue") : null);
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private int fetchPendingRenewals(int days) {
        try {
            URI uri = Objects.requireNonNull(URI.create(adminUrlProperties.getPaymentServiceUrl()
                    + "/api/payments/pending-renewals?days=" + days));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            return body != null ? toInt(body.get("count")) : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private List<BookingHistoryDTO> fetchRecentBookings() {
        try {
            URI uri = Objects.requireNonNull(URI.create(adminUrlProperties.getSeatServiceUrl()
                    + "/api/admin/bookings/recent?page=0&size=5"));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            if (body != null && body.get("content") instanceof List<?> content) {
                return content.stream()
                        .filter(Map.class::isInstance)
                        .map(Map.class::cast)
                        .map(this::mapRecentBooking)
                        .collect(Collectors.toList());
            }
        } catch (Exception ignored) {
        }
        return Collections.emptyList();
    }

    private List<PaymentHistorySummaryDTO> fetchRecentPayments() {
        try {
            URI uri = Objects.requireNonNull(URI.create(adminUrlProperties.getPaymentServiceUrl()
                    + "/api/payments?page=0&size=5"));
            HttpHeaders headers = buildAuthHeaders();
            HttpEntity<HttpHeaders> entity = new HttpEntity<>(Objects.requireNonNull(headers));
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(uri,
                    Objects.requireNonNull(HttpMethod.GET), entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });
            Map<String, Object> body = response.getBody();
            Object payments = body != null ? body.get("payments") : null;
            if (payments instanceof List<?> list) {
                return list.stream()
                        .filter(Map.class::isInstance)
                        .map(Map.class::cast)
                        .map(this::mapRecentPayment)
                        .collect(Collectors.toList());
            }
        } catch (Exception ignored) {
        }
        return Collections.emptyList();
    }

    private BookingHistoryDTO mapRecentBooking(Map<String, Object> map) {
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

    private PaymentHistorySummaryDTO mapRecentPayment(Map<String, Object> map) {
        return PaymentHistorySummaryDTO.builder()
                .transactionId(getString(map.get("transactionId")))
                .plan(getString(map.get("plan")))
                .amount(getString(map.get("amount")))
                .expiryDate(getString(map.get("expiryDate")))
                .paidAt(getString(map.get("paidAt")))
                .build();
    }

    private int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String string) {
            return Integer.parseInt(string);
        }
        return 0;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String string) {
            return new BigDecimal(string);
        }
        return BigDecimal.ZERO;
    }

    private Long getLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String string) {
            return Long.parseLong(string);
        }
        return null;
    }

    private Integer getInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String string) {
            return Integer.parseInt(string);
        }
        return null;
    }

    private String getString(Object value) {
        return value == null ? null : value.toString();
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
}
