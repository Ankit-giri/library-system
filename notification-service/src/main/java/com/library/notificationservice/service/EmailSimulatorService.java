package com.library.notificationservice.service;

import com.library.notificationservice.entity.SimulatedEmailEntity;
import com.library.notificationservice.repository.SimulatedEmailRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.OffsetDateTime;

@Service
public class EmailSimulatorService {
    private final SimulatedEmailRepository simulatedEmailRepository;
    private final Path emailLogPath = Path.of("logs", "emails.log");

    public EmailSimulatorService(SimulatedEmailRepository simulatedEmailRepository) {
        this.simulatedEmailRepository = simulatedEmailRepository;
    }

    @Transactional
    public void sendEmail(String userId, String recipient, String subject, String body) {
        persistEmail(userId, recipient, subject, body);
        appendToLog(recipient, subject, body);
    }

    private void persistEmail(String userId, String recipient, String subject, String body) {
        SimulatedEmailEntity email = new SimulatedEmailEntity();
        email.setUserId(userId);
        email.setRecipient(recipient);
        email.setSubject(subject);
        email.setBody(body);
        email.setStatus("SENT");
        email.setSentAt(OffsetDateTime.now());
        simulatedEmailRepository.save(email);
    }

    private void appendToLog(String recipient, String subject, String body) {
        try {
            Files.createDirectories(emailLogPath.getParent());
            String entry = String.format("%s | recipient=%s | subject=%s | body=%s%n",
                    OffsetDateTime.now(), recipient, subject, body.replaceAll("\r?\n", " "));
            Files.writeString(emailLogPath, entry, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to write simulated email log", ex);
        }
    }
}
