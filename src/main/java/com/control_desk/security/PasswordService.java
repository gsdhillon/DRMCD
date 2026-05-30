/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.security;

import jakarta.enterprise.context.ApplicationScoped;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@ApplicationScoped
public class PasswordService {
    private static final int ITERATIONS = 120_000;
    private static final int KEY_LENGTH = 256;
    private static final SecureRandom RANDOM = new SecureRandom();

    public String newSalt() {
        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    public String hash(String password, String salt) {
        try {
            PBEKeySpec spec =
                    new PBEKeySpec(
                            password.toCharArray(),
                            Base64.getDecoder().decode(salt),
                            ITERATIONS,
                            KEY_LENGTH
                    );

            byte[] hash =
                    SecretKeyFactory
                            .getInstance("PBKDF2WithHmacSHA256")
                            .generateSecret(spec)
                            .getEncoded();

            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public boolean verify(String password, String salt, String expectedHash) {
        if (
                password == null ||
                salt == null ||
                expectedHash == null
        ) {
            return false;
        }

        String actualHash =
                hash(password, salt);

        return MessageDigest.isEqual(
                actualHash.getBytes(),
                expectedHash.getBytes()
        );
    }
}
