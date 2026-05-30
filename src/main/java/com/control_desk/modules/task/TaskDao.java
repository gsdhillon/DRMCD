/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.modules.task;

import com.control_desk.config.Database;
import jakarta.enterprise.context.ApplicationScoped;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class TaskDao {
    private static final DateTimeFormatter API_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public List<Task> getAll() {
        ensureTasksTable();

        List<Task> list = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("SELECT * FROM tasks"); ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                list.add(readTask(rs));
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public List<Task> getByPerson(int personId) {
        ensureTasksTable();

        List<Task> list = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("SELECT * FROM tasks WHERE person_id=?")) {
            ps.setInt(1, personId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(readTask(rs));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public Task create(Task task) {
        ensureTasksTable();

        try (
            Connection con = getConnection();
            PreparedStatement ps = con.prepareStatement(
                """
                INSERT INTO tasks (name, `desc`, person_id, assigned_on, deadline, completed_on)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                """,
                Statement.RETURN_GENERATED_KEYS
            )
        ) {
            ps.setString(1, task.name);
            ps.setString(2, task.desc);
            setInteger(ps, 3, task.personId);
            setDateTime(ps, 4, task.deadline);
            setDateTime(ps, 5, task.completedOn);
            ps.executeUpdate();

            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                task.id = rs.getInt(1);
            }
            return getById(task.id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Task update(Task task) {
        ensureTasksTable();

        Task existing =
                getById(task.id);

        if (existing == null) {
            return null;
        }

        boolean personChanged =
                !sameInteger(existing.personId, task.personId);

        try (
            Connection con = getConnection();
            PreparedStatement ps = con.prepareStatement(
                """
                UPDATE tasks
                SET
                    name=?,
                    `desc`=?,
                    person_id=?,
                    assigned_on=CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE assigned_on END,
                    deadline=?,
                    completed_on=?
                WHERE id=?
                """
            )
        ) {
            ps.setString(1, task.name);
            ps.setString(2, task.desc);
            setInteger(ps, 3, task.personId);
            ps.setBoolean(4, personChanged);
            setDateTime(ps, 5, task.deadline);
            setDateTime(ps, 6, task.completedOn);
            ps.setInt(7, task.id);
            ps.executeUpdate();
            return getById(task.id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(int id) {
        ensureTasksTable();

        try (
            Connection con = getConnection();
            PreparedStatement ps = con.prepareStatement(
                """
                DELETE FROM tasks
                WHERE id=?
                """
            )
        ) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Task markCompleted(int id) {
        ensureTasksTable();

        try (
            Connection con = getConnection();
            PreparedStatement ps = con.prepareStatement(
                """
                UPDATE tasks
                SET completed_on=CURRENT_TIMESTAMP
                WHERE id=?
                """
            )
        ) {
            ps.setInt(1, id);
            ps.executeUpdate();
            return getById(id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Task getById(int id) {
        ensureTasksTable();

        try (
            Connection con = getConnection();
            PreparedStatement ps = con.prepareStatement("SELECT * FROM tasks WHERE id=?")
        ) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return readTask(rs);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    private void ensureTasksTable() {
        try (
                Connection con = getConnection();
                Statement statement = con.createStatement()
        ) {
            statement.executeUpdate(
                    """
                    CREATE TABLE IF NOT EXISTS tasks (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(160) NOT NULL,
                        `desc` VARCHAR(1000),
                        person_id INT,
                        assigned_on TIMESTAMP NULL,
                        deadline TIMESTAMP NULL,
                        completed_on TIMESTAMP NULL,
                        INDEX idx_tasks_person_id (person_id)
                    )
                    """
            );
            try {
                statement.executeUpdate(
                        """
                        ALTER TABLE tasks
                        ADD COLUMN deadline TIMESTAMP NULL
                        """
                );
            } catch (SQLException ignored) {
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Task readTask(ResultSet rs) throws SQLException {
        Task task = new Task();
        task.id = rs.getInt("id");
        task.name = rs.getString("name");
        task.desc = rs.getString("desc");
        task.personId = rs.getInt("person_id");
        if (rs.wasNull()) {
            task.personId = null;
        }
        task.assignedOn = getDateTime(rs, "assigned_on");
        task.deadline = getDateTime(rs, "deadline");
        task.completedOn = getDateTime(rs, "completed_on");
        return task;
    }

    private String getDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        if (timestamp == null) {
            return null;
        }
        return timestamp.toLocalDateTime().format(API_DATE_TIME);
    }

    private void setDateTime(PreparedStatement ps, int index, String value) throws SQLException {
        if (value == null || value.isBlank()) {
            ps.setNull(index, Types.TIMESTAMP);
            return;
        }

        String normalized =
                value
                        .replace('T', ' ')
                        .trim();

        if (normalized.length() == 16) {
            normalized += ":00";
        }

        ps.setTimestamp(
                index,
                Timestamp.valueOf(normalized)
        );
    }

    private void setInteger(PreparedStatement ps, int index, Integer value) throws SQLException {
        if (value == null) {
            ps.setNull(index, Types.INTEGER);
        } else {
            ps.setInt(index, value);
        }
    }

    private boolean sameInteger(Integer first, Integer second) {
        if (first == null) {
            return second == null;
        }

        return first.equals(second);
    }
}
