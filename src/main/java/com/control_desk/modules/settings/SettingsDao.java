/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.modules.settings;

import com.control_desk.config.Database;
import com.control_desk.config.BuildInfo;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@ApplicationScoped
public class SettingsDao {
    private static final DateTimeFormatter STARTED_ON_FORMAT =
            DateTimeFormatter.ofPattern("dd-MM-yy HH:mm");

    private static final int DEFAULT_CHAT_MSG_BUFFER_SIZE = 50;

    private static final int DEFAULT_CHAT_MSG_MAX_SIZE = 500;

    private static final int DEFAULT_CHAT_FILE_MAX_SIZE = 1024 * 1024;

    private static final int DEFAULT_VC_EARLY_START_MINS = 5;

    private static final int DEFAULT_VC_PAST_MINS = 5;

    private static final int DEFAULT_POPUP_MSG_TIME = 3;

    private static final int DEFAULT_VC_MAX_DURATION = 240;

    private static final int DEFAULT_VC_EXTEDED_TIME = 10;

    private static final int DEFAULT_VC_END_ALERT_INTRVAL = 5;

    private Settings settings;

    @PostConstruct
    public void initialize() {
        ensureTable();
        updateStartupInfo();
        settings = readSettings();
    }

    public synchronized Settings get() {
        if (settings == null) {
            initialize();
        }

        settings = readSettings();

        return copy(settings);
    }

    public synchronized Settings update(Settings nextSettings) {
        ensureTable();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        UPDATE settings
                        SET clientInDevMode=?,
                            serverInDevMode=?,
                            chatMsgBufferSize=?,
                            chatMsgMaxSize=?,
                            chatFileMaxSize=?,
                            vc_early_start_mins=?,
                            vc_past_mins=?,
                            popup_msg_time=?,
                            vc_max_duration=?,
                            vc_exteded_time=?,
                            vc_end_alert_intrval=?
                        WHERE id=1
                        """
                )
        ) {
            ps.setBoolean(
                    1,
                    nextSettings != null &&
                            Boolean.TRUE.equals(nextSettings.clientInDevMode)
            );
            ps.setBoolean(
                    2,
                    nextSettings != null &&
                            Boolean.TRUE.equals(nextSettings.serverInDevMode)
            );
            ps.setInt(
                    3,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.chatMsgBufferSize,
                            DEFAULT_CHAT_MSG_BUFFER_SIZE
                    )
            );
            ps.setInt(
                    4,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.chatMsgMaxSize,
                            DEFAULT_CHAT_MSG_MAX_SIZE
                    )
            );
            ps.setInt(
                    5,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.chatFileMaxSize,
                            DEFAULT_CHAT_FILE_MAX_SIZE
                    )
            );
            ps.setInt(
                    6,
                    nonNegativeOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.vcEarlyStartMins,
                            DEFAULT_VC_EARLY_START_MINS
                    )
            );
            ps.setInt(
                    7,
                    nonNegativeOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.vcPastMins,
                            DEFAULT_VC_PAST_MINS
                    )
            );
            ps.setInt(
                    8,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.popupMsgTime,
                            DEFAULT_POPUP_MSG_TIME
                    )
            );
            ps.setInt(
                    9,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.vcMaxDuration,
                            DEFAULT_VC_MAX_DURATION
                    )
            );
            ps.setInt(
                    10,
                    nonNegativeOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.vcExtededTime,
                            DEFAULT_VC_EXTEDED_TIME
                    )
            );
            ps.setInt(
                    11,
                    positiveOrDefault(
                            nextSettings == null
                                    ? null
                                    : nextSettings.vcEndAlertIntrval,
                            DEFAULT_VC_END_ALERT_INTRVAL
                    )
            );
            ps.executeUpdate();

            settings =
                    readSettings();

            return copy(settings);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public synchronized void updateStartupInfo() {
        ensureTable();

        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        UPDATE settings
                        SET AppVersion=?,
                            StartedOn=?
                        WHERE id=1
                        """
                )
        ) {
            String startedOn =
                    LocalDateTime
                            .now()
                            .format(STARTED_ON_FORMAT);

            ps.setString(
                    1,
                    BuildInfo.APP_VERSION
            );
            ps.setString(2, startedOn);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Settings readSettings() {
        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement(
                        """
                        SELECT AppVersion,
                               StartedOn,
                               clientInDevMode,
                               serverInDevMode,
                               chatMsgBufferSize,
                               chatMsgMaxSize,
                               chatFileMaxSize,
                               vc_early_start_mins,
                               vc_past_mins,
                               popup_msg_time,
                               vc_max_duration,
                               vc_exteded_time,
                               vc_end_alert_intrval
                        FROM settings
                        WHERE id=1
                        """
                );
                ResultSet rs = ps.executeQuery()
        ) {
            if (rs.next()) {
                Settings next = new Settings();
                next.appVersion = rs.getString("AppVersion");
                next.startedOn = rs.getString("StartedOn");
                next.clientInDevMode = rs.getBoolean("clientInDevMode");
                next.serverInDevMode = rs.getBoolean("serverInDevMode");
                next.chatMsgBufferSize = rs.getInt("chatMsgBufferSize");
                next.chatMsgMaxSize = rs.getInt("chatMsgMaxSize");
                next.chatFileMaxSize = rs.getInt("chatFileMaxSize");
                next.vcEarlyStartMins = rs.getInt("vc_early_start_mins");
                next.vcPastMins = rs.getInt("vc_past_mins");
                next.popupMsgTime = rs.getInt("popup_msg_time");
                next.vcMaxDuration = rs.getInt("vc_max_duration");
                next.vcExtededTime = rs.getInt("vc_exteded_time");
                next.vcEndAlertIntrval = rs.getInt("vc_end_alert_intrval");
                return next;
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        Settings fallback = new Settings();
        fallback.appVersion =
                BuildInfo.APP_VERSION;
        fallback.startedOn =
                LocalDateTime
                        .now()
                        .format(STARTED_ON_FORMAT);
        fallback.clientInDevMode =
                true;
        fallback.serverInDevMode =
                true;
        fallback.chatMsgBufferSize =
                DEFAULT_CHAT_MSG_BUFFER_SIZE;
        fallback.chatMsgMaxSize =
                DEFAULT_CHAT_MSG_MAX_SIZE;
        fallback.chatFileMaxSize =
                DEFAULT_CHAT_FILE_MAX_SIZE;
        fallback.vcEarlyStartMins =
                DEFAULT_VC_EARLY_START_MINS;
        fallback.vcPastMins =
                DEFAULT_VC_PAST_MINS;
        fallback.popupMsgTime =
                DEFAULT_POPUP_MSG_TIME;
        fallback.vcMaxDuration =
                DEFAULT_VC_MAX_DURATION;
        fallback.vcExtededTime =
                DEFAULT_VC_EXTEDED_TIME;
        fallback.vcEndAlertIntrval =
                DEFAULT_VC_END_ALERT_INTRVAL;
        return fallback;
    }

    private void ensureTable() {
        try (
                Connection con = getConnection();
                Statement statement = con.createStatement()
        ) {
            statement.executeUpdate(
                    """
                    CREATE TABLE IF NOT EXISTS settings (
                        id INT PRIMARY KEY,
                        AppVersion VARCHAR(32) NOT NULL,
                        StartedOn VARCHAR(32) NOT NULL,
                        clientInDevMode BOOLEAN NOT NULL DEFAULT TRUE,
                        serverInDevMode BOOLEAN NOT NULL DEFAULT TRUE,
                        chatMsgBufferSize INT NOT NULL DEFAULT 50,
                        chatMsgMaxSize INT NOT NULL DEFAULT 500,
                        chatFileMaxSize INT NOT NULL DEFAULT 1048576,
                        vc_early_start_mins INT NOT NULL DEFAULT 5,
                        vc_past_mins INT NOT NULL DEFAULT 5,
                        popup_msg_time INT NOT NULL DEFAULT 3,
                        vc_max_duration INT NOT NULL DEFAULT 240,
                        vc_exteded_time INT NOT NULL DEFAULT 10,
                        vc_end_alert_intrval INT NOT NULL DEFAULT 5
                    )
                    """
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "StartedOn",
                    "StartedOn VARCHAR(32) NOT NULL DEFAULT ''"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "clientInDevMode",
                    "clientInDevMode BOOLEAN NOT NULL DEFAULT TRUE"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "serverInDevMode",
                    "serverInDevMode BOOLEAN NOT NULL DEFAULT TRUE"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "chatMsgBufferSize",
                    "chatMsgBufferSize INT NOT NULL DEFAULT 50"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "chatMsgMaxSize",
                    "chatMsgMaxSize INT NOT NULL DEFAULT 500"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "chatFileMaxSize",
                    "chatFileMaxSize INT NOT NULL DEFAULT 1048576"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "vc_early_start_mins",
                    "vc_early_start_mins INT NOT NULL DEFAULT 5"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "vc_past_mins",
                    "vc_past_mins INT NOT NULL DEFAULT 5"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "popup_msg_time",
                    "popup_msg_time INT NOT NULL DEFAULT 3"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "vc_max_duration",
                    "vc_max_duration INT NOT NULL DEFAULT 240"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "vc_exteded_time",
                    "vc_exteded_time INT NOT NULL DEFAULT 10"
            );
            addColumnIfMissing(
                    con,
                    statement,
                    "vc_end_alert_intrval",
                    "vc_end_alert_intrval INT NOT NULL DEFAULT 5"
            );
            statement.executeUpdate(
                    """
                    INSERT INTO settings (
                        id,
                        AppVersion,
                        StartedOn,
                        clientInDevMode,
                        serverInDevMode,
                        chatMsgBufferSize,
                        chatMsgMaxSize,
                        chatFileMaxSize,
                        vc_early_start_mins,
                        vc_past_mins,
                        popup_msg_time,
                        vc_max_duration,
                        vc_exteded_time,
                        vc_end_alert_intrval
                    )
                    SELECT 1, '', '', TRUE, TRUE, 50, 500, 1048576, 5, 5, 3, 240, 10, 5
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM settings
                        WHERE id=1
                    )
                    """
            );
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private Settings copy(Settings source) {
        Settings next = new Settings();
        next.appVersion = source.appVersion;
        next.startedOn = source.startedOn;
        next.clientInDevMode = source.clientInDevMode;
        next.serverInDevMode = source.serverInDevMode;
        next.chatMsgBufferSize =
                positiveOrDefault(
                        source.chatMsgBufferSize,
                        DEFAULT_CHAT_MSG_BUFFER_SIZE
                );
        next.chatMsgMaxSize =
                positiveOrDefault(
                        source.chatMsgMaxSize,
                        DEFAULT_CHAT_MSG_MAX_SIZE
                );
        next.chatFileMaxSize =
                positiveOrDefault(
                        source.chatFileMaxSize,
                        DEFAULT_CHAT_FILE_MAX_SIZE
                );
        next.vcEarlyStartMins =
                nonNegativeOrDefault(
                        source.vcEarlyStartMins,
                        DEFAULT_VC_EARLY_START_MINS
                );
        next.vcPastMins =
                nonNegativeOrDefault(
                        source.vcPastMins,
                        DEFAULT_VC_PAST_MINS
                );
        next.popupMsgTime =
                positiveOrDefault(
                        source.popupMsgTime,
                        DEFAULT_POPUP_MSG_TIME
                );
        next.vcMaxDuration =
                positiveOrDefault(
                        source.vcMaxDuration,
                        DEFAULT_VC_MAX_DURATION
                );
        next.vcExtededTime =
                nonNegativeOrDefault(
                        source.vcExtededTime,
                        DEFAULT_VC_EXTEDED_TIME
                );
        next.vcEndAlertIntrval =
                positiveOrDefault(
                        source.vcEndAlertIntrval,
                        DEFAULT_VC_END_ALERT_INTRVAL
                );
        return next;
    }

    private int positiveOrDefault(Integer value, int defaultValue) {
        return value == null || value < 1
                ? defaultValue
                : value;
    }

    private int nonNegativeOrDefault(Integer value, int defaultValue) {
        return value == null || value < 0
                ? defaultValue
                : value;
    }

    private void addColumnIfMissing(
            Connection con,
            Statement statement,
            String columnName,
            String definition
    ) throws SQLException {
        try (
                PreparedStatement ps = con.prepareStatement(
                        """
                        SELECT COUNT(*)
                        FROM information_schema.columns
                        WHERE table_schema=DATABASE()
                        AND table_name='settings'
                        AND column_name=?
                        """
                )
        ) {
            ps.setString(1, columnName);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next() && rs.getInt(1) > 0) {
                    return;
                }
            }
        }

        statement.executeUpdate(
                "ALTER TABLE settings ADD COLUMN " + definition
        );
    }
}
