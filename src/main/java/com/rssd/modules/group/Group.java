/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.group;

import java.util.ArrayList;
import java.util.List;

public class Group {
    public Integer id;
    public String name;
    public Integer createdBy;
    public String createdByName;
    public String createdOn;
    public String currentUserRole;
    public List<GroupMember> members = new ArrayList<>();
}
