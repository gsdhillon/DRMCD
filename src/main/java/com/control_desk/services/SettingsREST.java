/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.services;

import com.control_desk.modules.settings.Settings;
import com.control_desk.modules.settings.SettingsDao;
import com.control_desk.security.AuthContext;
import com.control_desk.websocket.SettingsSocket;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/settings")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class SettingsREST {
    @Inject
    SettingsDao settingsDao;

    @Inject
    AuthContext authContext;

    @GET
    public Settings get() {
        return settingsDao.get();
    }

    @PUT
    public Settings update(Settings settings) {
        if (!authContext.isSuperAdmin()) {
            throw new WebApplicationException(
                    Response.Status.FORBIDDEN
            );
        }

        Settings updated =
                settingsDao.update(settings);

        SettingsSocket.notifySettingsChanged();

        return updated;
    }
}
