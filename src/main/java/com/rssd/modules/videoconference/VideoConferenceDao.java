/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.videoconference;

import com.rssd.config.Database;
import com.rssd.modules.person.Person;
import com.rssd.modules.settings.SettingsDao;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class VideoConferenceDao {
    @Inject
    SettingsDao settingsDao;

    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public List<VideoConference> getForPerson(int personId) {
        ensureTables();
        List<VideoConference> list = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT vc.id, vc.title, vc.scheduled_at, vc.duration_minutes, vc.created_by, c.name AS created_by_name, vc.created_at
                FROM video_conference vc
                JOIN vc_participants vcp ON vcp.vc_id = vc.id
                LEFT JOIN persons c ON c.id = vc.created_by
                WHERE vcp.person_id = ?
                ORDER BY vc.scheduled_at DESC, vc.id DESC
                """)) {
            ps.setInt(1, personId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    VideoConference vc = readConference(rs, personId);
                    vc.participants = getParticipants(vc.id);
                    list.add(vc);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public List<VideoConference> getUpcomingForPerson(int personId, int limit) {
        ensureTables();
        List<VideoConference> list = new ArrayList<>();
        int safeLimit =
                limit < 1
                        ? 5
                        : Math.min(limit, 20);

        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT vc.id, vc.title, vc.scheduled_at, vc.duration_minutes, vc.created_by, c.name AS created_by_name, vc.created_at
                FROM video_conference vc
                JOIN vc_participants vcp ON vcp.vc_id = vc.id
                LEFT JOIN persons c ON c.id = vc.created_by
                WHERE vcp.person_id = ?
                  AND DATE_ADD(vc.scheduled_at, INTERVAL vc.duration_minutes MINUTE) >= CURRENT_TIMESTAMP
                ORDER BY vc.scheduled_at ASC, vc.id ASC
                LIMIT ?
                """)) {
            ps.setInt(1, personId);
            ps.setInt(2, safeLimit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    VideoConference vc = readConference(rs, personId);
                    vc.participants = getParticipants(vc.id);
                    list.add(vc);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public List<VideoConference> getAll(int currentPersonId) {
        ensureTables();
        List<VideoConference> list = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT vc.id, vc.title, vc.scheduled_at, vc.duration_minutes, vc.created_by, c.name AS created_by_name, vc.created_at
                FROM video_conference vc
                LEFT JOIN persons c ON c.id = vc.created_by
                ORDER BY vc.scheduled_at DESC, vc.id DESC
                """)) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    VideoConference vc = readConference(rs, currentPersonId);
                    vc.participants = getParticipants(vc.id);
                    list.add(vc);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public VideoConference getById(int id, int currentPersonId) {
        ensureTables();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT vc.id, vc.title, vc.scheduled_at, vc.duration_minutes, vc.created_by, c.name AS created_by_name, vc.created_at
                FROM video_conference vc
                LEFT JOIN persons c ON c.id = vc.created_by
                WHERE vc.id = ?
                """)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    VideoConference vc = readConference(rs, currentPersonId);
                    vc.participants = getParticipants(id);
                    return vc;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public VideoConference create(VideoConference vc, int createdBy) {
        ensureTables();
        try (Connection con = getConnection()) {
            con.setAutoCommit(false);
            try (PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO video_conference (title, scheduled_at, duration_minutes, created_by)
                    VALUES (?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, vc.title == null || vc.title.isBlank() ? "Video Conference" : vc.title.trim());
                ps.setTimestamp(2, Timestamp.valueOf(vc.scheduledAt));
                ps.setInt(3, durationOrDefault(vc.durationMinutes));
                ps.setInt(4, createdBy);
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (keys.next()) {
                        vc.id = keys.getInt(1);
                    }
                }
            }

            addParticipant(con, vc.id, createdBy);
            for (Person participant : vc.participants) {
                if (participant != null && participant.id != null) {
                    addParticipant(con, vc.id, participant.id);
                }
            }
            con.commit();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return getById(vc.id, createdBy);
    }

    public VideoConference findActiveForPersons(int firstPersonId, int secondPersonId) {
        ensureTables();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT vc.id, vc.title, vc.scheduled_at, vc.duration_minutes, vc.created_by, c.name AS created_by_name, vc.created_at
                FROM video_conference vc
                JOIN vc_participants p1 ON p1.vc_id = vc.id AND p1.person_id = ?
                JOIN vc_participants p2 ON p2.vc_id = vc.id AND p2.person_id = ?
                LEFT JOIN persons c ON c.id = vc.created_by
                WHERE CURRENT_TIMESTAMP BETWEEN vc.scheduled_at AND DATE_ADD(vc.scheduled_at, INTERVAL vc.duration_minutes MINUTE)
                ORDER BY vc.scheduled_at DESC, vc.id DESC
                LIMIT 1
                """)) {
            ps.setInt(1, firstPersonId);
            ps.setInt(2, secondPersonId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    VideoConference vc = readConference(rs, firstPersonId);
                    vc.participants = getParticipants(vc.id);
                    return vc;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public VideoConference update(VideoConference vc, int currentPersonId) {
        ensureTables();
        try (Connection con = getConnection()) {
            con.setAutoCommit(false);
            try (PreparedStatement ps = con.prepareStatement("""
                    UPDATE video_conference
                    SET title = ?, scheduled_at = ?, duration_minutes = ?
                    WHERE id = ? AND created_by = ?
                    """)) {
                ps.setString(1, vc.title == null || vc.title.isBlank() ? "Video Conference" : vc.title.trim());
                ps.setTimestamp(2, Timestamp.valueOf(vc.scheduledAt));
                ps.setInt(3, durationOrDefault(vc.durationMinutes));
                ps.setInt(4, vc.id);
                ps.setInt(5, currentPersonId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = con.prepareStatement("""
                    DELETE FROM vc_participants
                    WHERE vc_id = ?
                    """)) {
                ps.setInt(1, vc.id);
                ps.executeUpdate();
            }

            addParticipant(con, vc.id, currentPersonId);
            for (Person participant : vc.participants) {
                if (participant != null && participant.id != null) {
                    addParticipant(con, vc.id, participant.id);
                }
            }

            con.commit();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return getById(vc.id, currentPersonId);
    }

    public void addParticipant(int vcId, int personId) {
        ensureTables();
        try (Connection con = getConnection()) {
            addParticipant(con, vcId, personId);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void removeParticipant(int vcId, int personId) {
        ensureTables();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                DELETE FROM vc_participants
                WHERE vc_id = ? AND person_id = ?
                """)) {
            ps.setInt(1, vcId);
            ps.setInt(2, personId);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean isParticipant(int vcId, int personId) {
        ensureTables();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT COUNT(*)
                FROM vc_participants
                WHERE vc_id = ? AND person_id = ?
                """)) {
            ps.setInt(1, vcId);
            ps.setInt(2, personId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean isCreator(int vcId, int personId) {
        ensureTables();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT COUNT(*)
                FROM video_conference
                WHERE id = ? AND created_by = ?
                """)) {
            ps.setInt(1, vcId);
            ps.setInt(2, personId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean canStart(int vcId, int personId) {
        VideoConference vc = getById(vcId, personId);
        return vc != null &&
                vc.startAllowed &&
                !isAfterJoinWindow(vc) &&
                isParticipant(vcId, personId);
    }

    public void delete(int vcId) {
        ensureTables();
        try (Connection con = getConnection()) {
            try (PreparedStatement ps = con.prepareStatement("""
                    DELETE FROM vc_participants
                    WHERE vc_id = ?
                    """)) {
                ps.setInt(1, vcId);
                ps.executeUpdate();
            }

            try (PreparedStatement ps = con.prepareStatement("""
                    DELETE FROM video_conference
                    WHERE id = ?
                    """)) {
                ps.setInt(1, vcId);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void addParticipant(Connection con, int vcId, int personId) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement("""
                INSERT IGNORE INTO vc_participants (vc_id, person_id)
                VALUES (?, ?)
                """)) {
            ps.setInt(1, vcId);
            ps.setInt(2, personId);
            ps.executeUpdate();
        }
    }

    private List<Person> getParticipants(int vcId) {
        List<Person> participants = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT p.id, p.name, p.email, p.mobile_no, p.designation, p.role
                FROM vc_participants vcp
                JOIN persons p ON p.id = vcp.person_id
                WHERE vcp.vc_id = ?
                ORDER BY p.name, p.id
                """)) {
            ps.setInt(1, vcId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Person person = new Person();
                    person.id = rs.getInt("id");
                    person.name = rs.getString("name");
                    person.email = rs.getString("email");
                    person.mobileNo = rs.getString("mobile_no");
                    person.designation = rs.getString("designation");
                    person.role = rs.getString("role");
                    participants.add(person);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return participants;
    }

    private VideoConference readConference(ResultSet rs, int currentPersonId) throws SQLException {
        VideoConference vc = new VideoConference();
        vc.id = rs.getInt("id");
        vc.title = rs.getString("title");
        Timestamp scheduledAt = rs.getTimestamp("scheduled_at");
        vc.scheduledAt = scheduledAt == null ? null : scheduledAt.toLocalDateTime();
        vc.durationMinutes = rs.getInt("duration_minutes");
        vc.createdBy = rs.getInt("created_by");
        vc.createdByName = rs.getString("created_by_name");
        Timestamp createdAt = rs.getTimestamp("created_at");
        vc.createdAt = createdAt == null ? null : createdAt.toLocalDateTime();
        vc.creator = vc.createdBy != null && vc.createdBy == currentPersonId;
        LocalDateTime now =
                LocalDateTime.now();

        vc.startAllowed = vc.scheduledAt != null &&
                !now.isBefore(
                        vc.scheduledAt.minusMinutes(
                                vcEarlyStartMins()
                        )
                ) &&
                !isAfterJoinWindow(vc, now);
        return vc;
    }

    private void ensureTables() {
        try (Connection con = getConnection(); Statement statement = con.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS video_conference (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        title VARCHAR(180) NOT NULL,
                        scheduled_at DATETIME NOT NULL,
                        duration_minutes INT NOT NULL DEFAULT 30,
                        created_by INT NOT NULL,
                        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_video_conference_created_by (created_by),
                        INDEX idx_video_conference_scheduled_at (scheduled_at)
                    )
                    """);
            try {
                statement.executeUpdate("""
                        ALTER TABLE video_conference
                        ADD COLUMN duration_minutes INT NOT NULL DEFAULT 30
                        """);
            } catch (SQLException ignored) {
            }
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS vc_participants (
                        vc_id INT NOT NULL,
                        person_id INT NOT NULL,
                        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (vc_id, person_id),
                        INDEX idx_vc_participants_person (person_id)
                    )
                    """);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private int durationOrDefault(Integer durationMinutes) {
        if (durationMinutes == null || durationMinutes < 1) {
            return 30;
        }
        return Math.min(durationMinutes, 1440);
    }

    private int vcEarlyStartMins() {
        Integer value =
                settingsDao == null
                        ? null
                        : settingsDao.get().vcEarlyStartMins;

        return value == null || value < 0
                ? 5
                : value;
    }

    private boolean isAfterJoinWindow(VideoConference vc) {
        return isAfterJoinWindow(vc, LocalDateTime.now());
    }

    private boolean isAfterJoinWindow(VideoConference vc, LocalDateTime now) {
        if (vc == null || vc.scheduledAt == null) {
            return true;
        }

        int duration =
                vc.durationMinutes == null || vc.durationMinutes < 1
                        ? 30
                        : vc.durationMinutes;

        return now.isAfter(
                vc.scheduledAt.plusMinutes(
                        duration + vcExtededTime()
                )
        );
    }

    private int vcExtededTime() {
        Integer value =
                settingsDao == null
                        ? null
                        : settingsDao.get().vcExtededTime;

        return value == null || value < 0
                ? 10
                : value;
    }
}
