/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

public final class Database {
    private static boolean initialized;

    private Database() {
    }

    public static Connection getConnection() throws Exception {
        ensureSchema();
        return DriverManager.getConnection(dbUrl(), user(), password());
    }

    private static synchronized void ensureSchema() throws Exception {
        if (initialized) {
            return;
        }

        Class.forName("org.mariadb.jdbc.Driver");

        try (
                Connection con = DriverManager.getConnection(
                        serverUrl(),
                        user(),
                        password()
                );
                Statement statement = con.createStatement()
        ) {
            statement.executeUpdate(
                    "CREATE DATABASE IF NOT EXISTS `" + dbName() + "`"
            );
        }

        initialized = true;
    }

    private static String serverUrl() {
        return BuildInfo.databaseServerUrl();
    }

    private static String dbName() {
        String name = BuildInfo.databaseName();
        if (!name.matches("[A-Za-z0-9_]+")) {
            throw new IllegalStateException(
                    "Invalid database name. Use only letters, numbers, and underscores."
            );
        }
        return name;
    }

    private static String dbUrl() {
        return BuildInfo.databaseUrl();
    }

    private static String user() {
        return BuildInfo.databaseUser();
    }

    private static String password() {
        return BuildInfo.databasePassword();
    }
}
