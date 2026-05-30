/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.modules.group;

import com.control_desk.config.Database;
import jakarta.enterprise.context.ApplicationScoped;

import java.sql.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class GroupDao {
    private static final DateTimeFormatter API_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public List<Group> getAll(boolean admin, int personId) {
        ensureTables();

        String sql = admin
                ? """
                SELECT g.id, g.name, g.created_by, g.created_on, p.name AS created_by_name, gp.role AS current_user_role
                FROM groups g
                LEFT JOIN group_person gp ON gp.gId=g.id AND gp.pId=?
                LEFT JOIN persons p ON p.id=g.created_by
                ORDER BY g.id
                """
                : """
                SELECT DISTINCT g.id, g.name, g.created_by, g.created_on, p.name AS created_by_name, gp.role AS current_user_role
                FROM groups g
                JOIN group_person gp ON gp.gId=g.id
                LEFT JOIN persons p ON p.id=g.created_by
                WHERE gp.pId=?
                ORDER BY g.id
                """;

        List<Group> list = new ArrayList<>();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(sql)
        ) {
            ps.setInt(1, personId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(readGroup(rs));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return list;
    }

    public Group getById(int id, boolean admin, int personId) {
        ensureTables();

        String sql = admin
                ? """
                SELECT g.id, g.name, g.created_by, g.created_on, p.name AS created_by_name, gp.role AS current_user_role
                FROM groups g
                LEFT JOIN group_person gp ON gp.gId=g.id AND gp.pId=?
                LEFT JOIN persons p ON p.id=g.created_by
                WHERE g.id=?
                """
                : """
                SELECT DISTINCT g.id, g.name, g.created_by, g.created_on, p.name AS created_by_name, gp.role AS current_user_role
                FROM groups g
                JOIN group_person gp ON gp.gId=g.id
                LEFT JOIN persons p ON p.id=g.created_by
                WHERE g.id=? AND gp.pId=?
                """;

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(sql)
        ) {
            if (admin) {
                ps.setInt(1, personId);
                ps.setInt(2, id);
            } else {
                ps.setInt(1, id);
                ps.setInt(2, personId);
            }

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Group group = readGroup(rs);
                    group.members = getMembers(id);
                    return group;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return null;
    }

    public Group create(Group group, int createdBy) {
        ensureTables();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        INSERT INTO groups (name, created_by)
                        VALUES (?, ?)
                        """,
                        Statement.RETURN_GENERATED_KEYS
                )
        ) {
            ps.setString(1, group.name);
            ps.setInt(2, createdBy);
            ps.executeUpdate();

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    group.id = rs.getInt(1);
                }
            }

            replaceMembers(group.id, group.members);

            return getById(group.id, true, createdBy);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Group update(Group group, int userId) {
        ensureTables();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        UPDATE groups
                        SET name=?
                        WHERE id=?
                        """
                )
        ) {
            ps.setString(1, group.name);
            ps.setInt(2, group.id);
            ps.executeUpdate();

            replaceMembers(group.id, group.members);

            return getById(group.id, true, userId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(int id) {
        ensureTables();

        try (Connection con = getConnection()) {
            try (
                    PreparedStatement ps = con.prepareStatement(
                            "DELETE FROM group_person WHERE gId=?"
                    )
            ) {
                ps.setInt(1, id);
                ps.executeUpdate();
            }

            try (
                    PreparedStatement ps = con.prepareStatement(
                            "DELETE FROM groups WHERE id=?"
                    )
            ) {
                ps.setInt(1, id);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public List<GroupMember> getMembers(int groupId) {
        ensureTables();

        List<GroupMember> list = new ArrayList<>();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        SELECT gp.gId, gp.pId, gp.role, p.name AS person_name
                        FROM group_person gp
                        LEFT JOIN persons p ON p.id=gp.pId
                        WHERE gp.gId=?
                        ORDER BY p.name, gp.pId
                        """
                )
        ) {
            ps.setInt(1, groupId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    GroupMember member = new GroupMember();
                    member.gId = rs.getInt("gId");
                    member.pId = rs.getInt("pId");
                    member.role = rs.getString("role");
                    member.personName = rs.getString("person_name");
                    list.add(member);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        return list;
    }

    public boolean isMember(int groupId, int personId) {
        ensureTables();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        SELECT COUNT(*)
                        FROM group_person
                        WHERE gId=? AND pId=?
                        """
                )
        ) {
            ps.setInt(1, groupId);
            ps.setInt(2, personId);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean isGroupAdmin(int groupId, int personId) {
        ensureTables();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        SELECT COUNT(*)
                        FROM group_person
                        WHERE gId=? AND pId=? AND role='admin'
                        """
                )
        ) {
            ps.setInt(1, groupId);
            ps.setInt(2, personId);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void addMember(int groupId, int personId, String role) {
        ensureTables();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        INSERT INTO group_person (gId, pId, role)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE role=VALUES(role)
                        """
                )
        ) {
            ps.setInt(1, groupId);
            ps.setInt(2, personId);
            ps.setString(3, groupRole(role));
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void replaceMembers(Integer groupId, List<GroupMember> members) throws Exception {
        try (Connection con = getConnection()) {
            try (
                    PreparedStatement ps = con.prepareStatement(
                            "DELETE FROM group_person WHERE gId=?"
                    )
            ) {
                ps.setInt(1, groupId);
                ps.executeUpdate();
            }

            if (members == null) {
                return;
            }

            try (
                    PreparedStatement ps = con.prepareStatement(
                            """
                            INSERT INTO group_person (gId, pId, role)
                            VALUES (?, ?, ?)
                            """
                    )
            ) {
                for (GroupMember member : members) {
                    if (member.pId == null) {
                        continue;
                    }

                    ps.setInt(1, groupId);
                    ps.setInt(2, member.pId);
                    ps.setString(3, groupRole(member.role));
                    ps.addBatch();
                }

                ps.executeBatch();
            }
        }
    }

    private String groupRole(String role) {
        return "admin".equalsIgnoreCase(role)
                ? "admin"
                : "user";
    }

    private void ensureTables() {
        try (
                Connection con = getConnection();
                Statement statement = con.createStatement()
        ) {
            statement.executeUpdate(
                    """
                    CREATE TABLE IF NOT EXISTS groups (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(160) NOT NULL,
                        created_by INT NOT NULL,
                        created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_groups_created_by (created_by)
                    )
                    """
            );
            statement.executeUpdate(
                    """
                    CREATE TABLE IF NOT EXISTS group_person (
                        gId INT NOT NULL,
                        pId INT NOT NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'user',
                        PRIMARY KEY (gId, pId),
                        INDEX idx_group_person_pid (pId)
                    )
                    """
            );
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Group readGroup(ResultSet rs) throws SQLException {
        Group group = new Group();
        group.id = rs.getInt("id");
        group.name = rs.getString("name");
        group.createdBy = rs.getInt("created_by");
        group.createdByName = rs.getString("created_by_name");
        group.createdOn = getDateTime(rs, "created_on");
        group.currentUserRole = rs.getString("current_user_role");
        return group;
    }

    private String getDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        if (timestamp == null) {
            return null;
        }
        return timestamp.toLocalDateTime().format(API_DATE_TIME);
    }
}
