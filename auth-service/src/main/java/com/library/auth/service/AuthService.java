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
import org.springframework.context.annotation.Lazy;
import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final ConcurrentMap<String, Instant> tokenBlacklist = new ConcurrentHashMap<>();

    public AuthService(UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            @Lazy AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
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
        String token = jwtUtil.generateToken(userDetails);
        return createAuthResponse(saved, token);
    }

    public AuthResponse authenticate(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase(), request.getPassword()));
        } catch (Exception ex) {
            throw new BadCredentialsException("Invalid email or password");
        }

        UserEntity user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        UserDetails userDetails = buildUserDetails(user);
        String token = jwtUtil.generateToken(userDetails);
        return createAuthResponse(user, token);
    }

    public void logout(String token) {
        Date expiration = jwtUtil.extractExpiration(token);
        if (expiration != null) {
            tokenBlacklist.put(token, expiration.toInstant());
        }
    }

    public boolean isTokenBlacklisted(String token) {
        Instant expiry = tokenBlacklist.get(token);
        if (expiry == null) {
            return false;
        }
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
