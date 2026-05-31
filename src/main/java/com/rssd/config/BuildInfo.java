/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.config;

import java.io.InputStream;
import java.util.Properties;

public final class BuildInfo {
    private static final String DEFAULT_APP_VERSION = "dev";
    private static final String DEFAULT_DB_SERVER_URL = "jdbc:mariadb://localhost:3306";
    private static final String DEFAULT_DB_NAME = "control_desk";

    public static final String APP_VERSION = readAppVersion();

    private BuildInfo() {
    }

    public static String databaseServerUrl() {
        return config(
                "db.serverUrl",
                "controldesk.db.serverUrl",
                "CONTROL_DESK_DB_SERVER_URL",
                DEFAULT_DB_SERVER_URL
        );
    }

    public static String databaseName() {
        return config(
                "db.name",
                "controldesk.db.name",
                "CONTROL_DESK_DB_NAME",
                DEFAULT_DB_NAME
        );
    }

    public static String databaseUrl() {
        return config(
                "db.url",
                "controldesk.db.url",
                "CONTROL_DESK_DB_URL",
                databaseServerUrl() + "/" + databaseName()
        );
    }

    public static String databaseUser() {
        return requiredConfig(
                "db.user",
                "controldesk.db.user",
                "CONTROL_DESK_DB_USER"
        );
    }

    public static String databasePassword() {
        return requiredConfig(
                "db.password",
                "controldesk.db.password",
                "CONTROL_DESK_DB_PASSWORD"
        );
    }

    private static String readAppVersion() {
        return config("app.version", null, null, DEFAULT_APP_VERSION);
    }

    private static String requiredConfig(
            String buildInfoProperty,
            String systemProperty,
            String environment
    ) {
        String value = config(buildInfoProperty, systemProperty, environment, null);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Missing database configuration. Set build-info property " +
                            buildInfoProperty + ", JVM property " +
                            systemProperty + ", or environment variable " +
                            environment + "."
            );
        }
        return value;
    }

    private static String config(
            String buildInfoProperty,
            String systemProperty,
            String environment,
            String fallback
    ) {
        String value = buildInfoProperty(buildInfoProperty);
        if (hasValue(value)) {
            return value;
        }

        if (systemProperty != null) {
            value = System.getProperty(systemProperty);
            if (hasValue(value)) {
                return value;
            }
        }

        if (environment != null) {
            value = System.getenv(environment);
            if (hasValue(value)) {
                return value;
            }
        }

        return fallback;
    }

    private static boolean hasValue(String value) {
        return value != null &&
                !value.isBlank() &&
                !value.startsWith("${");
    }

    private static String buildInfoProperty(String key) {
        try (
                InputStream input = BuildInfo.class.getResourceAsStream(
                        "/build-info.properties"
                )
        ) {
            if (input == null) {
                return null;
            }

            Properties properties = new Properties();
            properties.load(input);

            return properties.getProperty(key);
        } catch (Exception e) {
            return null;
        }
    }
}
