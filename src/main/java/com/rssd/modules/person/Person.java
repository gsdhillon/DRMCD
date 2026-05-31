/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.person;

import jakarta.json.bind.annotation.JsonbTransient;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class Person {

    public Integer id;

    @Size(min = 2, message = "Name must be at least 2 characters")
    public String name;

    @Pattern(
            regexp = "^(\\s*|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})$",
            message = "Invalid email format"
    )
    public String email;

    @Pattern(
            regexp = "^(\\s*|[6-9]\\d{9})$",
            message = "Invalid mobile number"
    )
    public String mobileNo;

    @NotBlank(message = "Designation is required")
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


    /*
         public static Person dummy() {
         Person p = new Person();
         p.id=100;
         p.name="Ishjyot Kaur";
         p.email="ishjyot@gmail.com";
         p.mobileNo="9920351796";
         p.designation="Student";
         p.role="SuperAdmin";
         return p;
     }
    */
}
