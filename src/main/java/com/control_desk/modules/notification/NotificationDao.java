/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.modules.notification;

import com.control_desk.config.Database;
import com.control_desk.modules.task.Task;
import com.control_desk.modules.videoconference.VideoConference;
import jakarta.enterprise.context.ApplicationScoped;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

@ApplicationScoped
public class NotificationDao {
    private static final DateTimeFormatter API_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

    private final AtomicInteger nextId = new AtomicInteger(1);
    private final List<Notification> notifications = new CopyOnWriteArrayList<>();

    public List<Notification> getByPerson(int personId) {
        return notifications
                .stream()
                .filter(notification ->
                        notification.personId != null &&
                                notification.personId == personId
                )
                .sorted(
                        Comparator
                                .comparing((Notification notification) ->
                                        notification.createdOn
                                )
                                .reversed()
                                .thenComparing(
                                        notification -> notification.id,
                                        Comparator.reverseOrder()
                                )
                )
                .map(this::copy)
                .toList();
    }

    public Notification createForTask(
            Task task,
            String action,
            String changedByName
    ) {
        if (task.personId == null) {
            return null;
        }

        Notification notification = new Notification();
        notification.id = nextId.getAndIncrement();
        notification.personId = task.personId;
        notification.title = action;
        notification.message = action + " : " + textOrEmpty(task.name) +
                " by : " + textOrEmpty(changedByName) +
                " Desc : " + textOrEmpty(task.desc);
        notification.taskId = task.id;
        notification.createdOn =
                LocalDateTime
                        .now()
                        .format(API_DATE_TIME);

        notifications.add(notification);

        return copy(notification);
    }

    public Notification createForGroupMembership(
            int personId,
            String groupName,
            String action,
            String changedByName
    ) {
        Notification notification = new Notification();
        notification.id = nextId.getAndIncrement();
        notification.personId = personId;
        notification.title = action;
        notification.message = action + " : " + textOrEmpty(groupName) +
                " by : " + textOrEmpty(changedByName);
        notification.createdOn =
                LocalDateTime
                        .now()
                        .format(API_DATE_TIME);

        notifications.add(notification);

        return copy(notification);
    }

    public Notification createForVideoConference(
            int personId,
            VideoConference conference,
            String action,
            String changedByName
    ) {
        Notification notification = new Notification();
        notification.id = nextId.getAndIncrement();
        notification.personId = personId;
        notification.title = action;
        notification.message = action + " : " + textOrEmpty(conference.title) +
                " by : " + textOrEmpty(changedByName);
        notification.createdOn =
                LocalDateTime
                        .now()
                        .format(API_DATE_TIME);

        notifications.add(notification);

        return copy(notification);
    }

    public Notification createForPasswordChanged(int personId) {
        Notification notification = new Notification();
        notification.id = nextId.getAndIncrement();
        notification.personId = personId;
        notification.title = "Password Changed";
        notification.message = "Your password was changed.";
        notification.createdOn =
                LocalDateTime
                        .now()
                        .format(API_DATE_TIME);

        notifications.add(notification);

        return copy(notification);
    }

    private String textOrEmpty(String value) {
        return value == null
                ? ""
                : value;
    }

    public void delete(int id, int personId) {
        notifications.removeIf(notification ->
                notification.id != null &&
                        notification.id == id &&
                        notification.personId != null &&
                        notification.personId == personId
        );
    }

    public void deleteAll(int personId) {
        notifications.removeIf(notification ->
                notification.personId != null &&
                        notification.personId == personId
        );
    }

    private Notification copy(Notification source) {
        Notification notification = new Notification();
        notification.id = source.id;
        notification.personId = source.personId;
        notification.title = source.title;
        notification.message = source.message;
        notification.taskId = source.taskId;
        notification.createdOn = source.createdOn;
        return notification;
    }
}
