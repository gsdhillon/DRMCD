/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.services;

import com.rssd.modules.notification.Notification;
import com.rssd.modules.notification.NotificationDao;
import com.rssd.security.AuthContext;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NotificationREST {
    @Inject
    NotificationDao service;

    @Inject
    AuthContext authContext;

    @GET
    public List<Notification> getAll() {
        return service.getByPerson(authContext.personId());
    }

    @DELETE
    @Path("/{id}")
    public void delete(@PathParam("id") int id) {
        service.delete(id, authContext.personId());
    }

    @DELETE
    public void deleteAll() {
        service.deleteAll(authContext.personId());
    }
}
