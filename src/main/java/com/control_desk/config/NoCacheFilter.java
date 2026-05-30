/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebFilter("/*")
public class NoCacheFilter implements Filter {
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain
    ) throws IOException, ServletException {
        if (response instanceof HttpServletResponse httpResponse) {
            String path =
                    request instanceof HttpServletRequest httpRequest
                            ? httpRequest.getRequestURI().toLowerCase()
                            : "";

            if (cacheableAsset(path)) {
                httpResponse.setHeader(
                        "Cache-Control",
                        "public, max-age=31536000"
                );
                httpResponse.setDateHeader(
                        "Expires",
                        System.currentTimeMillis() + 31_536_000_000L
                );
            } else {
                httpResponse.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
                httpResponse.setHeader("Pragma", "no-cache");
                httpResponse.setDateHeader("Expires", 0);
            }
        }

        chain.doFilter(request, response);
    }

    private boolean cacheableAsset(String path) {
        return path.endsWith(".woff2") ||
                path.endsWith(".woff");
    }
}
