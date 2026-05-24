package com.library.adminservice.controller;

import com.library.adminservice.dto.StudentDetailDTO;
import com.library.adminservice.dto.StudentSummaryDTO;
import com.library.adminservice.service.AdminStudentService;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/students")
public class AdminStudentController {

    private final AdminStudentService adminStudentService;

    public AdminStudentController(AdminStudentService adminStudentService) {
        this.adminStudentService = adminStudentService;
    }

    @GetMapping("/admins")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StudentSummaryDTO>> getAdmins() {
        return ResponseEntity.ok(adminStudentService.findAdmins());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<StudentSummaryDTO>> getStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            Pageable pageable) {
        return ResponseEntity.ok(adminStudentService.findStudents(search, active, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<StudentDetailDTO> getStudent(@PathVariable Long id) {
        return ResponseEntity.ok(adminStudentService.getStudentDetail(id));
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> updateStudentActive(
            @PathVariable Long id,
            @RequestParam boolean active) {
        adminStudentService.updateStudentActive(id, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> softDeleteStudent(@PathVariable Long id) {
        adminStudentService.softDeleteStudent(id);
        return ResponseEntity.noContent().build();
    }
}
