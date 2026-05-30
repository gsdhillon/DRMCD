/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.security;

import com.control_desk.modules.person.Person;
import jakarta.enterprise.context.ApplicationScoped;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@ApplicationScoped
public class JwtService {
    private static final String SECRET =
            "CHANGE_ME_CONTROLDESK_LOCAL_SECRET_32_BYTES";

    private static final long EXPIRY_SECONDS =
            2 * 60 * 60;

    public String createToken(Person person) {
        long expiresAt =
                Instant.now().getEpochSecond() + EXPIRY_SECONDS;

        String header =
                "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

        String payload =
                "{"
                        + "\"sub\":" + person.id + ","
                        + "\"name\":\"" + json(person.name) + "\","
                        + "\"role\":\"" + json(person.role) + "\","
                        + "\"exp\":" + expiresAt
                        + "}";

        String unsigned =
                base64Url(header) + "." + base64Url(payload);

        return unsigned + "." + sign(unsigned);
    }

    public AuthUser verify(String token) {
        String[] parts =
                token.split("\\.");

        if (parts.length != 3) {
            return null;
        }

        String unsigned =
                parts[0] + "." + parts[1];

        if (!sign(unsigned).equals(parts[2])) {
            return null;
        }

        String json =
                new String(
                        Base64
                                .getUrlDecoder()
                                .decode(parts[1]),
                        StandardCharsets.UTF_8
                );

        Map<String, String> claims =
                parseFlatJson(json);

        long exp =
                Long.parseLong(claims.getOrDefault("exp", "0"));

        if (Instant.now().getEpochSecond() >= exp) {
            return null;
        }

        AuthUser user =
                new AuthUser();

        user.personId =
                Integer.valueOf(claims.get("sub"));
        user.name =
                claims.get("name");
        user.role =
                claims.get("role");
        user.expiresAt =
                exp;

        return user;
    }

    public long expiresAt(String token) {
        AuthUser user =
                verify(token);

        return user == null ? 0 : user.expiresAt;
    }

    private String sign(String unsigned) {
        try {
            Mac mac =
                    Mac.getInstance("HmacSHA256");

            mac.init(
                    new SecretKeySpec(
                            SECRET.getBytes(StandardCharsets.UTF_8),
                            "HmacSHA256"
                    )
            );

            return Base64
                    .getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            mac.doFinal(
                                    unsigned.getBytes(StandardCharsets.UTF_8)
                            )
                    );
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String base64Url(String value) {
        return Base64
                .getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                        value.getBytes(StandardCharsets.UTF_8)
                );
    }

    private String json(String value) {
        return value == null
                ? ""
                : value
                        .replace("\\", "\\\\")
                        .replace("\"", "\\\"");
    }

    private Map<String, String> parseFlatJson(String json) {
        Map<String, String> values =
                new HashMap<>();

        String body =
                json.substring(1, json.length() - 1);

        for (String part : body.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)")) {
            String[] pair =
                    part.split(":", 2);

            String key =
                    pair[0].trim().replace("\"", "");

            String value =
                    pair[1].trim();

            if (value.startsWith("\"")) {
                value =
                        value.substring(1, value.length() - 1)
                                .replace("\\\"", "\"")
                                .replace("\\\\", "\\");
            }

            values.put(key, value);
        }

        return values;
    }
}
