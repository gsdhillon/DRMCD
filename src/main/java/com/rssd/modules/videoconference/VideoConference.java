/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.videoconference;

import com.rssd.modules.person.Person;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class VideoConference {
    public Integer id;
    public String title;
    public LocalDateTime scheduledAt;
    public Integer durationMinutes;
    public Integer createdBy;
    public String createdByName;
    public LocalDateTime createdAt;
    public boolean creator;
    public boolean startAllowed;
    public List<Person> participants = new ArrayList<>();
}
