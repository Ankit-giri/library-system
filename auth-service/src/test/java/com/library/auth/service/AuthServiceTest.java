package com.library.auth.service;

import com.library.auth.dto.AuthResponse;
import com.library.auth.dto.LoginRequest;
import com.library.auth.dto.RegisterRequest;
import com.library.auth.entity.UserEntity;
import com.library.auth.entity.UserRole;
import com.library.auth.repository.UserRepository;
import com.library.auth.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService unit tests")
@SuppressWarnings("null")   // Mockito thenReturn() is safe; @NonNull warnings are false positives here
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    // ── Shared fixtures ────────────────────────────────────────────────────────

    private static final String STUDENT_ID    = "STU0000001";
    private static final String FULL_NAME     = "Test Student";
    private static final String EMAIL         = "test@library.com";
    private static final String RAW_PASSWORD  = "Password1";
    private static final String HASHED_PW     = "$2a$10$hashedpassword";
    private static final String MOCK_TOKEN    = "mock.jwt.token";

    /** A saved UserEntity as it would come back from the repository. */
    private UserEntity savedUser;

    /** A Date one day in the future — used as JWT expiry stub. */
    private Date futureExpiry;

    @BeforeEach
    void setUp() {
        savedUser = UserEntity.builder()
                .id(1L)
                .studentId(STUDENT_ID)
                .fullName(FULL_NAME)
                .email(EMAIL)
                .passwordHash(HASHED_PW)
                .role(UserRole.STUDENT)
                .isActive(true)
                .deleted(false)
                .build();

        futureExpiry = Date.from(Instant.now().plusSeconds(86_400));
    }

    // ── register ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register — new student gets saved and JWT is returned")
    void testRegister_Success() {
        // Arrange — no duplicates exist
        when(userRepository.existsByEmail(EMAIL)).thenReturn(false);
        when(userRepository.existsByStudentId(STUDENT_ID)).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(HASHED_PW);
        when(userRepository.save(any(UserEntity.class))).thenReturn(savedUser);
        when(jwtUtil.generateToken(any(UserDetails.class))).thenReturn(MOCK_TOKEN);
        when(jwtUtil.extractExpiration(MOCK_TOKEN)).thenReturn(futureExpiry);

        RegisterRequest request = new RegisterRequest();
        request.setStudentId(STUDENT_ID);
        request.setFullName(FULL_NAME);
        request.setEmail(EMAIL);
        request.setPassword(RAW_PASSWORD);

        // Act
        AuthResponse response = authService.register(request);

        // Assert — response contains token and correct metadata
        assertThat(response.getToken()).isEqualTo(MOCK_TOKEN);
        assertThat(response.getRole()).isEqualTo("STUDENT");
        assertThat(response.getUserId()).isEqualTo(1L);
        assertThat(response.getExpiresAt()).isAfter(Instant.now());

        // Collaborations
        verify(userRepository).save(any(UserEntity.class));
        verify(passwordEncoder).encode(RAW_PASSWORD);
        verify(jwtUtil).generateToken(any(UserDetails.class));
    }

    @Test
    @DisplayName("register — duplicate Student ID throws IllegalArgumentException")
    void testRegister_DuplicateStudentId_ThrowsException() {
        // Arrange — email is free, but studentId is already taken
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByStudentId(STUDENT_ID)).thenReturn(true);

        RegisterRequest request = new RegisterRequest();
        request.setStudentId(STUDENT_ID);
        request.setFullName(FULL_NAME);
        request.setEmail(EMAIL);
        request.setPassword(RAW_PASSWORD);

        // Act & Assert
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request));

        assertThat(ex.getMessage()).contains("Student ID");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register — duplicate email throws IllegalArgumentException")
    void testRegister_DuplicateEmail_ThrowsException() {
        // Arrange — email already registered
        when(userRepository.existsByEmail(EMAIL)).thenReturn(true);

        RegisterRequest request = new RegisterRequest();
        request.setStudentId(STUDENT_ID);
        request.setFullName(FULL_NAME);
        request.setEmail(EMAIL);
        request.setPassword(RAW_PASSWORD);

        // Act & Assert
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> authService.register(request));

        assertThat(ex.getMessage()).contains("Email");
        verify(userRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }

    // ── authenticate ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("authenticate — valid credentials return a JWT response")
    void testLogin_Success_ReturnsToken() {
        // Arrange — authenticationManager does not throw
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);  // return value unused by service

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(savedUser));
        when(jwtUtil.generateToken(any(UserDetails.class))).thenReturn(MOCK_TOKEN);
        when(jwtUtil.extractExpiration(MOCK_TOKEN)).thenReturn(futureExpiry);

        LoginRequest request = new LoginRequest();
        request.setEmail(EMAIL);
        request.setPassword(RAW_PASSWORD);

        // Act
        AuthResponse response = authService.authenticate(request);

        // Assert
        assertThat(response.getToken()).isEqualTo(MOCK_TOKEN);
        assertThat(response.getRole()).isEqualTo("STUDENT");

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil).generateToken(any(UserDetails.class));
    }

    @Test
    @DisplayName("authenticate — wrong password throws BadCredentialsException")
    void testLogin_WrongPassword_ThrowsBadCredentials() {
        // Arrange — authenticationManager throws on wrong credentials
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager)
                .authenticate(any(UsernamePasswordAuthenticationToken.class));

        LoginRequest request = new LoginRequest();
        request.setEmail(EMAIL);
        request.setPassword("WrongPassword1");

        // Act & Assert
        BadCredentialsException ex = assertThrows(
                BadCredentialsException.class,
                () -> authService.authenticate(request));

        assertThat(ex.getMessage()).isEqualTo("Invalid email or password");

        // Repository must never be queried after failed authentication
        verify(userRepository, never()).findByEmail(anyString());
        verify(jwtUtil, never()).generateToken(any());
    }
}
