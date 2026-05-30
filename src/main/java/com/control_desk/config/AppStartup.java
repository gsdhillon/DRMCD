/*
 * @author Ishjyot Kaur
 * @email ishjyot@gmail.com
 */
package com.control_desk.config;

import com.control_desk.modules.settings.SettingsDao;
import jakarta.annotation.PostConstruct;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import jakarta.inject.Inject;

@Startup
@Singleton
public class AppStartup {
    @Inject
    SettingsDao settingsDao;

    @PostConstruct
    public void started() {
        settingsDao.updateStartupInfo();
    }
}
