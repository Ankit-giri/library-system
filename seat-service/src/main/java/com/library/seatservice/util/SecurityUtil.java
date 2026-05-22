package com.library.seatservice.util;

import java.util.Collection;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtil {

    private SecurityUtil() {
    }

    public static boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return hasAuthority(authentication.getAuthorities(), "ROLE_ADMIN");
    }

    private static boolean hasAuthority(Collection<? extends GrantedAuthority> authorities, String authority) {
        return authorities.stream().anyMatch(grantedAuthority -> grantedAuthority.getAuthority().equals(authority));
    }
}
