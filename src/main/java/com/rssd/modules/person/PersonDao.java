/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.person;

import com.rssd.config.Database;
import com.rssd.modules.role.RoleDao;
import com.rssd.security.PasswordService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.sql.*;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@ApplicationScoped
public class PersonDao {
    @Inject
    PasswordService passwordService;

    @Inject
    RoleDao roleDao;

    private Connection getConnection() throws Exception {
        return Database.getConnection();
    }

    public List<Person> getAll() {
        ensurePersonsTable();
        List<Person> list = new ArrayList<>();
        try (
                Connection con = getConnection();
                PreparedStatement ps = con.prepareStatement("""
                        SELECT p.id,p.name,p.email,p.mobile_no,p.designation,p.role_id,r.role AS role_name,r.color AS role_color,p.photo
                        FROM persons p
                        JOIN roles r ON r.id=p.role_id
                        """);
                ResultSet rs = ps.executeQuery()
        ) {
            while (rs.next()) {
                list.add(readPerson(rs, false, true));
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public List<Person> getByGroup(int groupId) {
        ensurePersonsTable();
        List<Person> list = new ArrayList<>();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT p.id,p.name,p.email,p.mobile_no,p.designation,p.role_id,r.role AS role_name,r.color AS role_color,p.photo
                FROM persons p
                JOIN roles r ON r.id=p.role_id
                JOIN group_person gp ON gp.pId=p.id
                WHERE gp.gId=?
                ORDER BY p.name, p.id
                """)) {
            ps.setInt(1, groupId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(readPerson(rs, false, true));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return list;
    }

    public Person getById(int id) {
        ensurePersonsTable();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT p.*, r.role AS role_name, r.color AS role_color
                FROM persons p
                JOIN roles r ON r.id=p.role_id
                WHERE p.id=?
                """)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return readPerson(rs, true, true);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public Person create(Person p) {
        ensurePersonsTable();
        preparePassword(p);
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                INSERT INTO persons (name,email,mobile_no,designation,photo,role_id,password_hash,password_salt)
                VALUES (?,?,?,?,?,?,?,?)
                """, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, p.name);
            ps.setString(2, p.email);
            ps.setString(3, p.mobileNo);
            ps.setString(4, p.designation);
            setPhoto(ps, 5, p.photo);
            ps.setInt(6, resolveRoleId(p));
            ps.setString(7, p.passwordHash);
            ps.setString(8, p.passwordSalt);
            ps.executeUpdate();
            ResultSet rs = ps.getGeneratedKeys();
            if (rs.next()) {
                p.id = rs.getInt(1);
            }
            return p;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Person update(Person p) {
        ensurePersonsTable();
        Person existing = getAuthPerson(p.id);
        if (p.password == null || p.password.isBlank()) {
            if (existing != null) {
                p.passwordHash = existing.passwordHash;
                p.passwordSalt = existing.passwordSalt;
            }
        } else {
            preparePassword(p);
        }
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                UPDATE persons
                SET
                    name=?,
                    email=?,
                    mobile_no=?,
                    designation=?,
                    photo=CASE WHEN ? IS NULL THEN photo ELSE ? END,
                    role_id=?,
                    password_hash=?,
                    password_salt=?
                WHERE id=?
                """)) {
            ps.setString(1, p.name);
            ps.setString(2, p.email);
            ps.setString(3, p.mobileNo);
            ps.setString(4, p.designation);
            setOptionalPhoto(ps, 5, p.photo);
            setOptionalPhoto(ps, 6, p.photo);
            ps.setInt(7, resolveRoleId(p));
            ps.setString(8, p.passwordHash);
            ps.setString(9, p.passwordSalt);
            ps.setInt(10, p.id);
            ps.executeUpdate();
            return p;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void delete(int id) {
        ensurePersonsTable();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                DELETE FROM persons
                WHERE id=?
                """)) {
            ps.setInt(1, id);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public Person getAuthPerson(int id) {
        ensurePersonsTable();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT p.*, r.role AS role_name, r.color AS role_color
                FROM persons p
                JOIN roles r ON r.id=p.role_id
                WHERE p.id=?
                """)) {
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Person p = readPerson(rs, false, true);
                    p.passwordHash = rs.getString("password_hash");
                    p.passwordSalt = rs.getString("password_salt");
                    return p;
                }
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return null;
    }

    public boolean hasPrivilegedPassword() {
        ensurePersonsTable();
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                SELECT COUNT(*)
                FROM persons p
                JOIN roles r ON r.id=p.role_id
                WHERE r.role IN ('Admin', 'SuperAdmin')
                AND password_hash IS NOT NULL
                AND password_salt IS NOT NULL
                """); ResultSet rs = ps.executeQuery()) {
            return rs.next() && rs.getInt(1) > 0;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void setSuperAdminPassword(int id, String password) {
        ensurePersonsTable();
        Person p = new Person();
        p.password = password;
        preparePassword(p);
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                UPDATE persons
                SET role_id=?,
                    password_hash=?,
                    password_salt=?
                WHERE id=?
                """)) {
            ps.setInt(1, roleDao.idForRole("SuperAdmin"));
            ps.setString(2, p.passwordHash);
            ps.setString(3, p.passwordSalt);
            ps.setInt(4, id);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void setPassword(int id, String password) {
        ensurePersonsTable();
        Person p = new Person();
        p.password = password;
        preparePassword(p);
        try (Connection con = getConnection(); PreparedStatement ps = con.prepareStatement("""
                UPDATE persons
                SET password_hash=?,
                    password_salt=?
                WHERE id=?
                """)) {
            ps.setString(1, p.passwordHash);
            ps.setString(2, p.passwordSalt);
            ps.setInt(3, id);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public void createOrSetSuperAdminPassword(int id, String password) {
        ensurePersonsTable();
        Person p = new Person();
        p.password = password;
        preparePassword(p);
        try (Connection con = getConnection()) {
            try (PreparedStatement ps = con.prepareStatement("""
                    UPDATE persons
                    SET role_id=?,
                        password_hash=?,
                        password_salt=?
                    WHERE id=?
                    """)) {
                ps.setInt(1, roleDao.idForRole("SuperAdmin"));
                ps.setString(2, p.passwordHash);
                ps.setString(3, p.passwordSalt);
                ps.setInt(4, id);
                if (ps.executeUpdate() > 0) {
                    return;
                }
            }

            try (PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO persons (id,name,role_id,password_hash,password_salt)
                    VALUES (?,?,?,?,?)
                    """)) {
                ps.setInt(1, id);
                ps.setString(2, "Super Admin");
                ps.setInt(3, roleDao.idForRole("SuperAdmin"));
                ps.setString(4, p.passwordHash);
                ps.setString(5, p.passwordSalt);
                ps.executeUpdate();
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void ensurePersonsTable() {
        try (Connection con = getConnection(); Statement statement = con.createStatement()) {
            RoleDao.ensureRolesTable(con);
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS persons (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(160) NOT NULL,
                        email VARCHAR(180),
                        mobile_no VARCHAR(40),
                        designation VARCHAR(120),
                        photo LONGBLOB,
                        role_id INT NOT NULL DEFAULT 3,
                        password_hash VARCHAR(255),
                        password_salt VARCHAR(255)
                    )
                    """);

            if (!columnExists(con, "persons", "role_id")) {
                statement.executeUpdate("ALTER TABLE persons ADD COLUMN role_id INT NULL");
            }

            if (columnExists(con, "persons", "role")) {
                statement.executeUpdate("""
                        UPDATE persons p
                        JOIN roles r ON LOWER(r.role)=LOWER(p.role)
                        SET p.role_id=r.id
                        WHERE p.role_id IS NULL OR p.role_id=0
                        """);
            }

            statement.executeUpdate("""
                    UPDATE persons
                    SET role_id=(SELECT id FROM roles WHERE role='User' LIMIT 1)
                    WHERE role_id IS NULL OR role_id=0
                    """);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void preparePassword(Person p) {
        if (p.password == null || p.password.isBlank()) {
            return;
        }
        p.passwordSalt = passwordService.newSalt();
        p.passwordHash = passwordService.hash(p.password, p.passwordSalt);
    }

    private int resolveRoleId(Person person) {
        if (person.roleId != null && person.roleId > 0) {
            return person.roleId;
        }

        return roleDao.idForRole(person.role);
    }

    private Person readPerson(ResultSet rs, boolean includePhoto, boolean includeThumbnail) throws SQLException {
        Person p = new Person();
        p.id = rs.getInt("id");
        p.name = rs.getString("name");
        p.email = rs.getString("email");
        p.mobileNo = rs.getString("mobile_no");
        p.designation = rs.getString("designation");
        p.roleId = rs.getInt("role_id");
        p.role = rs.getString("role_name");
        p.roleColor = rs.getString("role_color");
        byte[] photo = rs.getBytes("photo");
        if (photo != null) {
            if (includePhoto) {
                p.photo = Base64.getEncoder().encodeToString(photo);
            }
            if (includeThumbnail) {
                p.thumbnail = thumbnailBase64(photo);
            }
        }
        return p;
    }

    private void setPhoto(PreparedStatement ps, int index, String photo) throws SQLException {
        if (photo == null || photo.isBlank()) {
            ps.setNull(index, Types.BLOB);
            return;
        }
        ps.setBytes(index, Base64.getDecoder().decode(photo));
    }

    private void setOptionalPhoto(PreparedStatement ps, int index, String photo) throws SQLException {
        if (photo == null || photo.isBlank()) {
            ps.setNull(index, Types.BLOB);
            return;
        }
        ps.setBytes(index, Base64.getDecoder().decode(photo));
    }

    private String thumbnailBase64(byte[] photo) {
        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(photo));
            if (source == null) {
                return Base64.getEncoder().encodeToString(photo);
            }
            int width = source.getWidth();
            int height = source.getHeight();

            /*
             * Zoomed face thumbnail is active below.
             *
             * To revert to old thumbnail behavior:
             * 1. Comment the ZOOMED_FACE_THUMBNAIL_START to ZOOMED_FACE_THUMBNAIL_END block.
             * 2. Uncomment the OLD_PROPORTIONAL_THUMBNAIL_START to OLD_PROPORTIONAL_THUMBNAIL_END block.
             * 3. Comment the ZOOMED_FACE_DRAW_START to ZOOMED_FACE_DRAW_END block.
             * 4. Uncomment the OLD_PROPORTIONAL_DRAW line.
             *
             * Optional cleanup after reverting: remove the Color import and clamp method if unused.
             */
            // ZOOMED_FACE_THUMBNAIL_START
            int thumbnailSize = 64;
            double zoom = 1.25;
            double verticalFocus = 0.42;
            int cropSize = Math.max(1, (int) Math.round(Math.min(width, height) / zoom));
            int cropX = clamp((int) Math.round((width - cropSize) / 2.0), 0, width - cropSize);
            int cropY = clamp((int) Math.round((height * verticalFocus) - (cropSize / 2.0)), 0, height - cropSize);

            BufferedImage thumbnail = new BufferedImage(thumbnailSize, thumbnailSize, BufferedImage.TYPE_INT_RGB);
            // ZOOMED_FACE_THUMBNAIL_END

            // OLD_PROPORTIONAL_THUMBNAIL_START
            // int maxSize = 64;
            // double scale = Math.min(1.0, (double) maxSize / Math.max(width, height));
            // int thumbnailWidth = Math.max(1, (int) Math.round(width * scale));
            // int thumbnailHeight = Math.max(1, (int) Math.round(height * scale));
            // BufferedImage thumbnail = new BufferedImage(thumbnailWidth, thumbnailHeight, BufferedImage.TYPE_INT_RGB);
            // OLD_PROPORTIONAL_THUMBNAIL_END

            Graphics2D graphics = thumbnail.createGraphics();
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            // ZOOMED_FACE_DRAW_START
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, thumbnailSize, thumbnailSize);
            graphics.drawImage(
                    source,
                    0,
                    0,
                    thumbnailSize,
                    thumbnailSize,
                    cropX,
                    cropY,
                    cropX + cropSize,
                    cropY + cropSize,
                    null
            );
            // ZOOMED_FACE_DRAW_END
            // OLD_PROPORTIONAL_DRAW: graphics.drawImage(source, 0, 0, thumbnailWidth, thumbnailHeight, null);
            graphics.dispose();
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "jpg", output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (Exception e) {
            return Base64.getEncoder().encodeToString(photo);
        }
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }

    private boolean columnExists(Connection con, String tableName, String columnName) throws SQLException {
        try (PreparedStatement ps = con.prepareStatement("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema=DATABASE()
                AND table_name=?
                AND column_name=?
                """)) {
            ps.setString(1, tableName);
            ps.setString(2, columnName);

            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }
}
