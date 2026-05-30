/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.security;

public class AuthUser {
    public Integer personId;
    public String name;
    public String role;
    public long expiresAt;

    public boolean isAdmin() {
        return "Admin".equals(role) ||
                isSuperAdmin();
    }

    public boolean isSuperAdmin() {
        return "SuperAdmin".equals(role);
    }
}
