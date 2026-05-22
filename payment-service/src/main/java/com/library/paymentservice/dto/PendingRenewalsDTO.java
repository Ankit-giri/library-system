package com.library.paymentservice.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PendingRenewalsDTO {
    private int count;
}
