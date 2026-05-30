/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.services;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Provider
public class BeanValidationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {
    @Override
    public Response toResponse(ConstraintViolationException exception) {
        Set<String> messages =
                new LinkedHashSet<>();

        for (ConstraintViolation<?> violation : exception.getConstraintViolations()) {
            if (violation.getMessage() != null && !violation.getMessage().isBlank()) {
                messages.add(violation.getMessage());
            }
        }

        if (messages.isEmpty()) {
            messages.add("Validation failed");
        }

        return Response
                .status(Response.Status.BAD_REQUEST)
                .type(MediaType.APPLICATION_JSON_TYPE)
                .entity(
                        Map.of(
                                "message",
                                String.join("; ", messages),
                                "messages",
                                messages
                        )
                )
                .build();
    }
}
