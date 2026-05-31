/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.person;

import jakarta.json.bind.annotation.JsonbTransient;
import jakarta.validation.constraints.Size;

public class Person {

    public Integer id;

//    @NotBlank(message = "Name is required (at least 2 chars)")
    @Size(min = 2, message = "Name must be at least 2 characters")
    public String name;

    public String email;

    public String mobileNo;

    public String designation;

    public String photo;

    public String thumbnail;

    public Integer roleId;

    public String role;

    public String roleColor;

    public String password;

    @JsonbTransient
    public String passwordHash;

    @JsonbTransient
    public String passwordSalt;

    public static Person dummy() {
        Person p = new Person();
        p.id=100;
        p.name="Ajaybir Singh Dhillon";
        p.email="jbir.dhillon@gmail.com";
        p.mobileNo="9876543210";
        p.designation="Manager";
        p.role="Admin";
        return p;
    }
}
