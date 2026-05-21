package com.library.paymentservice.service;

import com.library.paymentservice.entity.MembershipFeeEntity;
import org.springframework.stereotype.Service;

@Service
public class PaymentNotificationService {

    public void sendMembershipPaymentNotification(MembershipFeeEntity fee) {
        System.out.printf("[PaymentNotification] Student %s successfully paid %s for plan %s. Expiry: %s%n",
                fee.getStudentId(), fee.getAmount(), fee.getPlan(), fee.getExpiryDate());
    }
}
