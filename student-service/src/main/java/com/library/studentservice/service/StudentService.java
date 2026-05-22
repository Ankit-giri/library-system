package com.library.studentservice.service;

import com.library.studentservice.dto.ProfileUpdateRequest;
import com.library.studentservice.dto.StudentProfileDTO;
import com.library.studentservice.entity.UserEntity;
import com.library.studentservice.exception.ResourceNotFoundException;
import com.library.studentservice.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentService {

    private final UserRepository userRepository;

    public StudentService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public StudentProfileDTO getProfile(String email) {
        UserEntity user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        return toDto(user);
    }

    @Transactional
    public StudentProfileDTO updateProfile(String email, ProfileUpdateRequest request) {
        UserEntity user = userRepository.findByEmailAndDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        user.setFullName(request.getFullName());
        return toDto(userRepository.save(user));
    }

    private StudentProfileDTO toDto(UserEntity user) {
        return StudentProfileDTO.builder()
                .id(user.getId())
                .studentId(user.getStudentId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .active(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
