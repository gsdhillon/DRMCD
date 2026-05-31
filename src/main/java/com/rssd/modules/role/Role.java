/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.rssd.modules.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class Role {
    public Integer id;

    @NotBlank(message = "Role is required")
    @Size(max = 40, message = "Role must be 40 characters or fewer")
    public String role;

    @NotBlank(message = "Color is required")
    @Pattern(regexp = "^[0-9A-Fa-f]{6}$", message = "Color must be a 6 character HEX value")
    public String color;
}
