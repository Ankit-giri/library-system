package com.library.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "admin-service")
public class AdminUrlProperties {
    private String seatServiceUrl = "http://localhost:8084";
    private String paymentServiceUrl = "http://localhost:8085";

    public String getSeatServiceUrl() {
        return seatServiceUrl;
    }

    public void setSeatServiceUrl(String seatServiceUrl) {
        this.seatServiceUrl = seatServiceUrl;
    }

    public String getPaymentServiceUrl() {
        return paymentServiceUrl;
    }

    public void setPaymentServiceUrl(String paymentServiceUrl) {
        this.paymentServiceUrl = paymentServiceUrl;
    }
}
