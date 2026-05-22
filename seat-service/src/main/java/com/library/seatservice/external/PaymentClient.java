package com.library.seatservice.external;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Component
public class PaymentClient {

    private final RestTemplate restTemplate;
    private final String paymentServiceUrl;

    public PaymentClient(RestTemplate restTemplate,
            @Value("${payment.service.url:http://localhost:8085}") String paymentServiceUrl) {
        this.restTemplate = restTemplate;
        this.paymentServiceUrl = paymentServiceUrl;
    }

    public boolean isMembershipActive(String studentId) {
        try {
            String url = String.format("%s/api/payments/memberships/%s/active", paymentServiceUrl, studentId);
            return Boolean.TRUE.equals(restTemplate.getForObject(url, Boolean.class));
        } catch (RestClientException ex) {
            throw new IllegalStateException("Failed to validate membership status", ex);
        }
    }
}
