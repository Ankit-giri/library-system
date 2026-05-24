package com.library.paymentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateOrderResponse {
    private String orderId;
    private int amount;
    private String currency;
    private String keyId;
}
