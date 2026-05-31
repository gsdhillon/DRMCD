/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.services;

import com.rssd.modules.group.Group;
import com.rssd.modules.group.GroupDao;
import com.rssd.modules.notification.NotificationDao;
import com.rssd.modules.person.Person;
import com.rssd.modules.person.PersonDao;
import com.rssd.modules.role.Role;
import com.rssd.modules.role.RoleDao;
import com.rssd.security.AuthContext;
import com.rssd.websocket.NotificationSocket;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/persons")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PersonREST {
    @Inject
    PersonDao service;

    @Inject
    GroupDao groupDao;

    @Inject
    NotificationDao notificationDao;

    @Inject
    AuthContext authContext;

    @Inject
    RoleDao roleDao;

    @GET
    public List<Person> getAll(@QueryParam("groupId") Integer groupId) {
        if (groupId != null) {
            requireGroupAccess(groupId);
            return service.getByGroup(groupId);
        }

        return service.getAll();
    }

    @GET
    @Path("/{id}")
    public Person getById(@PathParam("id") int id) {
        return service.getById(id);
    }

    @POST
    public Person create(@Valid Person p, @QueryParam("groupId") Integer groupId) {
        requireAllowedCreate(p, groupId);
        Person person = service.create(p);

        if (groupId != null) {
            groupDao.addMember(groupId, person.id, "user");
            notifyAddedToGroup(person.id, groupId);
        }

        return person;
    }

    @PUT
    public Person update(@Valid Person p, @QueryParam("groupId") Integer groupId) {
        requireAllowedUpdate(p, groupId);
        return service.update(p);
    }

    @DELETE
    @Path("/{id}")
    public void delete(@PathParam("id") int id) {
        requireAllowedDelete(id);
        service.delete(id);
    }

    private void requireAllowedCreate(Person person, Integer groupId) {
        if (authContext.isSuperAdmin()) {
            return;
        }

        if (!authContext.isAdmin() && groupId == null) {
            forbidden();
        }

        if (groupId != null && groupDao.isGroupAdmin(groupId, authContext.personId())) {
            if (isPrivilegedRole(person)) {
                forbidden();
            }
            return;
        }

        if (isPrivilegedRole(person)) {
            forbidden();
        }
    }

    private void requireAllowedUpdate(Person person, Integer groupId) {
        if (authContext.isSuperAdmin()) {
            return;
        }

        if (!authContext.isAdmin() && groupId == null) {
            forbidden();
        }

        if (groupId != null) {
            requireGroupAdmin(groupId);

            if (person.id == null || !groupDao.isMember(groupId, person.id)) {
                throw new NotFoundException();
            }

            if (isPrivilegedRole(person)) {
                forbidden();
            }

            return;
        }

        Person existing =
                service.getById(person.id);

        if (existing == null) {
            throw new NotFoundException();
        }

        if (
                isPrivilegedRole(existing) ||
                isPrivilegedRole(person)
        ) {
            forbidden();
        }
    }

    private void requireAllowedDelete(int id) {
        if (authContext.isSuperAdmin()) {
            return;
        }

        Person existing =
                service.getById(id);

        if (existing == null) {
            throw new NotFoundException();
        }

        if (isPrivilegedRole(existing)) {
            forbidden();
        }
    }

    private boolean isPrivilegedRole(Person person) {
        if (person == null) {
            return false;
        }

        if (isPrivilegedRole(person.role)) {
            return true;
        }

        if (person.roleId == null) {
            return false;
        }

        Role role =
                roleDao.getById(person.roleId);

        return role != null && isPrivilegedRole(role.role);
    }

    private boolean isPrivilegedRole(String role) {
        return "Admin".equals(role) ||
                "SuperAdmin".equals(role);
    }

    private void requireGroupAccess(int groupId) {
        if (authContext.isAdmin()) {
            return;
        }

        if (!groupDao.isMember(groupId, authContext.personId())) {
            forbidden();
        }
    }

    private void requireGroupAdmin(int groupId) {
        if (authContext.isAdmin()) {
            return;
        }

        if (!groupDao.isGroupAdmin(groupId, authContext.personId())) {
            forbidden();
        }
    }

    private void forbidden() {
        throw new WebApplicationException(
                Response.Status.FORBIDDEN
        );
    }

    private void notifyAddedToGroup(int personId, int groupId) {
        Group group =
                groupDao.getById(
                        groupId,
                        true,
                        authContext.personId()
                );

        notificationDao.createForGroupMembership(
                personId,
                group == null ? "" : group.name,
                "Added to Group",
                currentUserName()
        );
        NotificationSocket.notifyPerson(personId);
    }

    private String currentUserName() {
        Integer personId =
                authContext.personId();

        if (personId == null) {
            return "";
        }

        Person person =
                service.getById(personId);

        if (person == null || person.name == null) {
            return String.valueOf(personId);
        }

        return person.name;
    }
}
