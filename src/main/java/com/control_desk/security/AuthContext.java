/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.security;

import jakarta.enterprise.context.RequestScoped;

@RequestScoped
public class AuthContext {
    private AuthUser user;

    public AuthUser getUser() {
        return user;
    }

    public void setUser(AuthUser user) {
        this.user = user;
    }

    public Integer personId() {
        return user == null ? null : user.personId;
    }

    public String role() {
        return user == null ? null : user.role;
    }

    public boolean isAdmin() {
        return user != null && user.isAdmin();
    }

    public boolean isSuperAdmin() {
        return user != null && user.isSuperAdmin();
    }
}
