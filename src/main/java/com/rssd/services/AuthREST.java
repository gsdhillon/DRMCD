/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.services;

import com.rssd.modules.auth.LoginRequest;
import com.rssd.modules.auth.LoginResponse;
import com.rssd.modules.notification.NotificationDao;
import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.security.AuthContext;
import com.rssd.security.JwtService;
import com.rssd.security.PasswordService;
import com.rssd.websocket.NotificationSocket;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthREST {
    @Inject
    PersonDao personDao;
    @Inject
    PasswordService passwordService;
    @Inject
    JwtService jwtService;
    @Inject
    AuthContext authContext;
    @Inject
    NotificationDao notificationDao;

    @POST
    @Path("/login")
    public Response login(LoginRequest request) {
        if (request == null || request.personId == null || request.password == null) {
            return jsonError(
                    Response.Status.BAD_REQUEST,
                    "invalid_login_request",
                    "Request body must include personId and password."
            );
        }
        Person person = personDao.getAuthPerson(request.personId);
        if (person == null) {
            return jsonError(
                    Response.Status.UNAUTHORIZED,
                    "person_not_found",
                    "invalid login"
            );
        }
        if (!passwordService.verify(request.password, person.passwordSalt, person.passwordHash)) {
            return jsonError(
                    Response.Status.UNAUTHORIZED,
                    "password_mismatch",
                    "Invalid Login"
            );
        }
        String token = jwtService.createToken(person);
        LoginResponse response = new LoginResponse();
        response.token = token;
        response.personId = person.id;
        response.name = person.name;
        response.photo = person.thumbnail;
        response.role = person.role;
        response.roleColor = person.roleColor;
        response.expiresAt = jwtService.expiresAt(token);
        return Response.ok(response).build();
    }

    @POST
    @Path("/bootstrap")
    public Response bootstrap(LoginRequest request) {
        if (request == null || request.personId == null || request.password == null || request.password.isBlank()) {
            return jsonError(
                    Response.Status.BAD_REQUEST,
                    "invalid_bootstrap_request",
                    "Request body must include personId and password."
            );
        }
        if (personDao.hasPrivilegedPassword()) {
            return jsonError(
                    Response.Status.CONFLICT,
                    "already_bootstrapped",
                    "A privileged account already has a password. Use /auth/login."
            );
        }
        personDao.createOrSetSuperAdminPassword(request.personId, request.password);
        return login(request);
    }

    @POST
    @Path("/change-password")
    public Response changePassword(ChangePasswordRequest request) {
        if (
                request == null ||
                request.currentPassword == null ||
                request.newPassword == null ||
                request.newPassword.isBlank()
        ) {
            return jsonError(
                    Response.Status.BAD_REQUEST,
                    "invalid_password_request",
                    "Request body must include currentPassword and newPassword."
            );
        }

        Person person =
                personDao.getAuthPerson(authContext.personId());

        if (
                person == null ||
                !passwordService.verify(
                        request.currentPassword,
                        person.passwordSalt,
                        person.passwordHash
                )
        ) {
            return jsonError(
                    Response.Status.BAD_REQUEST,
                    "invalid_current_password",
                    "Current password is incorrect."
            );
        }

        personDao.setPassword(person.id, request.newPassword);
        notificationDao.createForPasswordChanged(person.id);
        NotificationSocket.notifyPerson(person.id);

        ChangePasswordResponse response =
                new ChangePasswordResponse();
        response.message =
                "Password changed";
        return Response.ok(response).build();
    }

    private Response jsonError(Response.Status status, String error, String message) {
        BootstrapError response = new BootstrapError();
        response.error = error;
        response.message = message;
        response.status = status.getStatusCode();
        return Response.status(status).entity(response).build();
    }

    public static class BootstrapError {
        public String error;
        public String message;
        public int status;
    }

    public static class ChangePasswordRequest {
        public String currentPassword;
        public String newPassword;
    }

    public static class ChangePasswordResponse {
        public String message;
    }
}
