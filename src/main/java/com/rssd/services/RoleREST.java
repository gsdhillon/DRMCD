/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.services;

import com.rssd.modules.role.Role;
import com.rssd.modules.role.RoleDao;
import com.rssd.security.AuthContext;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;

@Path("/roles")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class RoleREST {
    @Inject
    RoleDao service;

    @Inject
    AuthContext authContext;

    @GET
    public List<Role> getAll() {
        return service.getAll();
    }

    @GET
    @Path("/{id}")
    public Role getById(@PathParam("id") int id) {
        Role role = service.getById(id);

        if (role == null) {
            throw new NotFoundException();
        }

        return role;
    }

    @POST
    public Role create(@Valid Role role) {
        requireSuperAdmin();
        return service.create(role);
    }

    @PUT
    public Role update(@Valid Role role) {
        requireSuperAdmin();

        if (role.id == null) {
            throw new BadRequestException("Role id is required");
        }

        return service.update(role);
    }

    @DELETE
    @Path("/{id}")
    public void delete(@PathParam("id") int id) {
        requireSuperAdmin();

        try {
            service.delete(id);
        } catch (IllegalStateException error) {
            throw new BadRequestException(error.getMessage());
        }
    }

    private void requireSuperAdmin() {
        if (!authContext.isSuperAdmin()) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
    }
}
