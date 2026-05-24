package com.library.paymentservice.controller;

import com.library.paymentservice.dto.MembershipPlanDTO;
import com.library.paymentservice.entity.MembershipPlanEntity;
import com.library.paymentservice.repository.MembershipPlanRepository;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/plans")
public class AdminPlanController {

    private final MembershipPlanRepository planRepository;

    public AdminPlanController(MembershipPlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MembershipPlanDTO>> getAll() {
        List<MembershipPlanDTO> plans = planRepository.findAll().stream()
                .sorted((a, b) -> a.getPrice().compareTo(b.getPrice()))
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(plans);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MembershipPlanDTO> create(@RequestBody MembershipPlanDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plan name is required");
        if (planRepository.existsByNameIgnoreCase(dto.getName()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Plan with this name already exists");

        MembershipPlanEntity entity = fromDto(dto);
        entity.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(planRepository.save(entity)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MembershipPlanDTO> update(@PathVariable Long id, @RequestBody MembershipPlanDTO dto) {
        MembershipPlanEntity entity = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        entity.setDisplayName(dto.getDisplayName());
        entity.setPrice(dto.getPrice());
        entity.setDurationDays(dto.getDurationDays());
        entity.setDescription(dto.getDescription());
        entity.setFeaturesCsv(featuresToCsv(dto.getFeatures()));
        entity.setBadgeText(dto.getBadgeText());
        entity.setFeatured(dto.isFeatured());
        entity.setActive(dto.isActive());
        return ResponseEntity.ok(toDto(planRepository.save(entity)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        MembershipPlanEntity entity = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan not found"));
        entity.setActive(false);
        planRepository.save(entity);
        return ResponseEntity.noContent().build();
    }

    private MembershipPlanDTO toDto(MembershipPlanEntity e) {
        return MembershipPlanDTO.builder()
                .id(e.getId())
                .name(e.getName())
                .displayName(e.getDisplayName())
                .price(e.getPrice())
                .durationDays(e.getDurationDays())
                .description(e.getDescription())
                .features(csvToFeatures(e.getFeaturesCsv()))
                .badgeText(e.getBadgeText())
                .featured(e.isFeatured())
                .active(e.isActive())
                .build();
    }

    private MembershipPlanEntity fromDto(MembershipPlanDTO dto) {
        return MembershipPlanEntity.builder()
                .name(dto.getName().toUpperCase().replace(" ", "_"))
                .displayName(dto.getDisplayName())
                .price(dto.getPrice())
                .durationDays(dto.getDurationDays())
                .description(dto.getDescription())
                .featuresCsv(featuresToCsv(dto.getFeatures()))
                .badgeText(dto.getBadgeText())
                .featured(dto.isFeatured())
                .build();
    }

    private List<String> csvToFeatures(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private String featuresToCsv(List<String> features) {
        if (features == null || features.isEmpty()) return "";
        return features.stream().map(String::trim).collect(Collectors.joining(","));
    }
}
