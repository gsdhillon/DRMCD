/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.security;

import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.modules.task.Task;
import com.rssd.modules.task.TaskDao;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class AuthFilter implements ContainerRequestFilter {
    @Inject
    JwtService jwtService;

    @Inject
    AuthContext authContext;

    @Inject
    TaskDao taskDao;

    @Inject
    PersonDao personDao;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();

        String method = request.getMethod();
        if (
                "OPTIONS".equals(method) ||
                "auth/login".equals(path) ||
                "auth/bootstrap".equals(path) ||
                ("GET".equals(method) && "settings".equals(path)) ||
                 path.startsWith("map/tiles/")
        ) {
            return;
        }

        String header = request.getHeaderString("Authorization");

        if (
                header == null ||
                !header.startsWith("Bearer ")
        ) {
            abort(request, Response.Status.UNAUTHORIZED);
            return;
        }

        AuthUser user =
                jwtService.verify(header.substring("Bearer ".length()));

        if (user == null) {
            abort(request, Response.Status.UNAUTHORIZED);
            return;
        }

        if (!matchesDatabaseUser(user)) {
            abort(request, Response.Status.UNAUTHORIZED);
            return;
        }

        authContext.setUser(user);

        if (!allowed(path, method, user)) {
            abort(request, Response.Status.FORBIDDEN);
        }
    }

    private boolean allowed(String path, String method, AuthUser user) {
        if (user.isAdmin()) {
            return true;
        }

        if (
                "POST".equals(method) &&
                path.equals("auth/change-password")
        ) {
            return true;
        }

        if (
                ("POST".equals(method) || "PUT".equals(method)) &&
                path.equals("persons")
        ) {
            return true;
        }

        if ("GET".equals(method)) {
            return path.equals("persons") ||
                    path.equals("tasks") ||
                    path.startsWith("tasks/person/") ||
                    path.equals("documents") ||
                    path.matches("documents/\\d+") ||
                    path.matches("documents/\\d+/download") ||
                    path.equals("settings") ||
                    path.equals("notifications") ||
                    path.equals("groups") ||
                    path.matches("groups/\\d+") ||
                    path.matches("groups/\\d+/persons") ||
                    path.equals("org-map/definition") ||
                    path.equals("org-map/zones") ||
                    path.equals("org-map/locations") ||
                    path.equals("org-map/search");
        }

        if (
                ("PUT".equals(method) && path.equals("org-map/definition")) ||
                ("POST".equals(method) && path.equals("org-map/zones")) ||
                ("POST".equals(method) && path.equals("org-map/locations"))
        ) {
            return true;
        }

        if ("DELETE".equals(method)) {
            return path.equals("notifications") ||
                    path.matches("notifications/\\d+") ||
                    path.matches("documents/\\d+") ||
                    path.matches("org-map/locations/\\d+");
        }

        if (
                "PUT".equals(method) &&
                path.matches("tasks/\\d+/complete")
        ) {
            int taskId =
                    Integer.parseInt(
                            path.split("/")[1]
                    );

            Task task =
                    taskDao.getById(taskId);

            return task != null &&
                    task.personId != null &&
                    task.personId.equals(user.personId);
        }

        if (
                path.equals("documents") &&
                ("POST".equals(method) || "PUT".equals(method))
        ) {
            return true;
        }

        return false;
    }

    private boolean matchesDatabaseUser(AuthUser user) {
        if (user.personId == null || user.role == null) {
            return false;
        }

        Person person =
                personDao.getAuthPerson(user.personId);

        return person != null &&
                user.role.equals(person.role);
    }

    private void abort(
            ContainerRequestContext request,
            Response.Status status
    ) {
        request.abortWith(
                Response
                        .status(status)
                        .header("X-DRMCD-Auth", "invalid")
                        .build()
        );
    }
}
