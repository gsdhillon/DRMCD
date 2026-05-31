/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.role;

import com.rssd.config.Database;
import jakarta.enterprise.context.ApplicationScoped;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class RoleDao {
    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public List<Role> getAll() {
        ensureRolesTable();
        List<Role> list = new ArrayList<>();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("SELECT id,role,color FROM roles ORDER BY id");
                ResultSet rs = ps.executeQuery()
        ) {
            while (rs.next()) {
                list.add(readRole(rs));
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return list;
    }

    public Role getById(int id) {
        ensureRolesTable();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("SELECT id,role,color FROM roles WHERE id=?")
        ) {
            ps.setInt(1, id);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return readRole(rs);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return null;
    }

    public Role create(Role role) {
        ensureRolesTable();
        role.color = normalizeColor(role.color);

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        "INSERT INTO roles (role,color) VALUES (?,?)",
                        Statement.RETURN_GENERATED_KEYS
                )
        ) {
            ps.setString(1, role.role);
            ps.setString(2, role.color);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    role.id = rs.getInt(1);
                }
            }

            return role;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Role update(Role role) {
        ensureRolesTable();
        role.color = normalizeColor(role.color);

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("UPDATE roles SET role=?, color=? WHERE id=?")
        ) {
            ps.setString(1, role.role);
            ps.setString(2, role.color);
            ps.setInt(3, role.id);
            ps.executeUpdate();
            return role;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(int id) {
        ensureRolesTable();

        try (Connection con = getConnection()) {
            try (PreparedStatement check = con.prepareStatement("SELECT COUNT(*) FROM persons WHERE role_id=?")) {
                check.setInt(1, id);

                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next() && rs.getInt(1) > 0) {
                        throw new IllegalStateException("Role is assigned to persons");
                    }
                }
            }

            try (PreparedStatement ps = con.prepareStatement("DELETE FROM roles WHERE id=?")) {
                ps.setInt(1, id);
                ps.executeUpdate();
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Integer idForRole(String role) {
        ensureRolesTable();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("SELECT id FROM roles WHERE LOWER(role)=LOWER(?)")
        ) {
            ps.setString(1, role == null || role.isBlank() ? "User" : role);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return defaultUserRoleId();
    }

    public Integer defaultUserRoleId() {
        ensureRolesTable();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("SELECT id FROM roles WHERE role='User'")
        ) {
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return 3;
    }

    public void ensureRolesTable() {
        try (Connection con = getConnection()) {
            ensureRolesTable(con);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void ensureRolesTable(Connection con) throws SQLException {
        try (Statement statement = con.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS roles (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        role VARCHAR(40) NOT NULL UNIQUE,
                        color VARCHAR(6) NOT NULL
                    )
                    """);

            statement.executeUpdate("""
                    INSERT IGNORE INTO roles (id, role, color)
                    VALUES
                        (1, 'SuperAdmin', 'FF0000'),
                        (2, 'Admin', '0000FF'),
                        (3, 'User', '00FF00')
                    """);
        }
    }

    private Role readRole(ResultSet rs) throws SQLException {
        Role role = new Role();
        role.id = rs.getInt("id");
        role.role = rs.getString("role");
        role.color = normalizeColor(rs.getString("color"));
        return role;
    }

    private String normalizeColor(String color) {
        String value = color == null ? "" : color.trim();

        if (value.startsWith("#")) {
            value = value.substring(1);
        }

        return value.toUpperCase();
    }
}
