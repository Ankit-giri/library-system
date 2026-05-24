package com.library.auth.service;

import com.library.auth.dto.AuthResponse;
import com.library.auth.dto.LoginRequest;
import com.library.auth.dto.RegisterRequest;
import com.library.auth.entity.UserEntity;
import com.library.auth.entity.UserRole;
import com.library.auth.repository.UserRepository;
import com.library.auth.security.JwtUtil;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final RestTemplate restTemplate;
    private final String notificationServiceUrl;
    private final ConcurrentMap<String, Instant> tokenBlacklist = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, ResetToken> resetTokens = new ConcurrentHashMap<>();

    private record ResetToken(String email, Instant expiresAt) {}

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            @Lazy AuthenticationManager authenticationManager,
            RestTemplate restTemplate,
            @Value("${notification.service.url:http://localhost:8085}") String notificationServiceUrl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
        this.restTemplate = restTemplate;
        this.notificationServiceUrl = notificationServiceUrl;
    }

    @SuppressWarnings("null")
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateRegistration(request);

        String studentId = generateStudentId();

        UserEntity user = UserEntity.builder()
                .studentId(studentId)
                .fullName(request.getFullName())
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.STUDENT)
                .isActive(true)
                .build();

        UserEntity saved = userRepository.save(user);
        UserDetails userDetails = buildUserDetails(saved);
        String token = jwtUtil.generateToken(userDetails, saved.getStudentId(), saved.getId(), saved.getFullName());
        return createAuthResponse(saved, token);
    }

    public AuthResponse authenticate(LoginRequest request) {
        String email = request.getEmail().toLowerCase();

        // Check user existence first so we can return a specific error
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account found with this email. Please register first."));

        if (!user.getIsActive()) {
            throw new org.springframework.security.authentication.DisabledException(
                    "Your account has been deactivated. Please contact the library admin.");
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (Exception ex) {
            throw new BadCredentialsException("Incorrect password. Please try again.");
        }

        UserDetails userDetails = buildUserDetails(user);
        String token = jwtUtil.generateToken(userDetails, user.getStudentId(), user.getId(), user.getFullName());
        return createAuthResponse(user, token);
    }

    public String forgotPassword(String email) {
        email = email.toLowerCase();
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account found with this email."));

        String token = UUID.randomUUID().toString();
        resetTokens.put(token, new ResetToken(email, Instant.now().plusSeconds(900))); // 15 min expiry

        String resetLink = "http://localhost:5173/reset-password?token=" + token;
        String body = String.format(
                "Hi %s,\n\nYou requested a password reset. Use the link below (valid for 15 minutes):\n\n%s\n\nIf you didn't request this, ignore this email.",
                user.getFullName(), resetLink);

        sendSimulatedEmail(email, "LibraryOS – Password Reset", body, user.getStudentId());
        return token; // returned so it can be shown in dev/test mode
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        ResetToken rt = resetTokens.get(token);
        if (rt == null || rt.expiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Reset token is invalid or has expired.");
        }

        UserEntity user = userRepository.findByEmail(rt.email())
                .orElseThrow(() -> new UsernameNotFoundException("User not found."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        resetTokens.remove(token);
    }

    public void logout(String token) {
        Date expiration = jwtUtil.extractExpiration(token);
        if (expiration != null) {
            tokenBlacklist.put(token, expiration.toInstant());
        }
    }

    public boolean isTokenBlacklisted(String token) {
        Instant expiry = tokenBlacklist.get(token);
        if (expiry == null) return false;
        if (expiry.isBefore(Instant.now())) {
            tokenBlacklist.remove(token);
            return false;
        }
        return true;
    }

    public UserEntity getCurrentUser(String username) {
        return userRepository.findByEmailAndDeletedFalse(username.toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        UserEntity user = userRepository.findByEmailAndDeletedFalse(username.toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return buildUserDetails(user);
    }

    private void sendSimulatedEmail(String recipient, String subject, String body, String userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> payload = Map.of(
                    "userId", userId != null ? userId : "system",
                    "recipient", recipient,
                    "subject", subject,
                    "body", body);
            restTemplate.postForEntity(
                    notificationServiceUrl + "/api/internal/email",
                    new HttpEntity<>(payload, headers),
                    Void.class);
        } catch (Exception ex) {
            // Non-critical — log and continue
            System.err.println("[AuthService] Failed to send simulated email: " + ex.getMessage());
        }
    }

    private UserDetails buildUserDetails(UserEntity user) {
        return User.builder()
                .username(user.getEmail())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(!user.getIsActive() || user.getDeleted())
                .build();
    }

    private AuthResponse createAuthResponse(UserEntity user, String token) {
        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .role(user.getRole().name())
                .expiresAt(jwtUtil.extractExpiration(token).toInstant())
                .build();
    }

    private String generateStudentId() {
        String id;
        do {
            long seq = userRepository.count() + 1 + (long)(Math.random() * 100);
            id = String.format("STU%07d", seq);
        } while (userRepository.existsByStudentId(id));
        return id;
    }

    private void validateRegistration(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            throw new IllegalArgumentException("Email is already registered");
        }
    }
}
