import themeSource from "../assets/react/theme.json";
import appLogoUrl from "../assets/app/logo.jpg";
import bgLightUrl from "../assets/react/bg-light.svg";
import bgDarkUrl from "../assets/react/bg-dark.svg";
import reactLogoUrl from "../assets/react/react-logo.svg";
import loginAppLogoUrl from "../assets/react/app-logo.jpg";

const assetUrls = {
  appLogo: appLogoUrl,
  footerImage: reactLogoUrl,
  logo: loginAppLogoUrl,
  lightBg: bgLightUrl,
  darkBg: bgDarkUrl
};

export function resolveReactTheme(mode) {
  const themeMode = mode === "dark" ? "dark" : "light";
  const variant = themeSource[themeMode] || themeSource.light;
  const assets = {
    ...(themeSource.assets || {}),
    ...(variant.assets || {}),
    appLogo: assetUrls.appLogo,
    footerImage: assetUrls.footerImage,
    logo: assetUrls.logo,
    bgImage: themeMode === "dark" ? assetUrls.darkBg : assetUrls.lightBg
  };

  const theme = {
    id: "reactjsx",
    mode: themeMode,
    name: "React JSX",
    assets,
    colors: variant.colors,
    header: variant.header,
    login: variant.login,
    shape: themeSource.shape,
    shadow: themeSource.shadow
  };

  return {
    ...theme,
    cssVars: createThemeVars(theme)
  };
}

function createThemeVars(theme) {
  const chromeImageUrl = theme.assets.bgImage || "";

  return {
    "--app-bg-gradient": "none",
    "--app-chrome-bg-layer": chromeImageUrl ? `url("${chromeImageUrl}")` : "none",
    "--app-chrome-bg-image": chromeImageUrl ? `url("${chromeImageUrl}")` : "none",
    "--app-page-bg": "var(--bs-body-bg)",
    "--app-surface": "var(--bs-body-bg)",
    "--main-panel-bg": "var(--bs-tertiary-bg)",
    "--app-panel-bg": "var(--bs-tertiary-bg)",
    "--app-hover-bg": "var(--bs-tertiary-bg)",
    "--app-input-bg": "var(--bs-body-bg)",
    "--app-input-text": "var(--bs-body-color)",
    "--app-text": "var(--bs-body-color)",
    "--app-muted-text": "var(--bs-secondary-color)",
    "--app-border": "var(--bs-border-color)",
    "--app-border-color": "var(--bs-border-color)",
    "--app-button-color": "var(--bs-primary)",
    "--app-close-button-color": "var(--bs-secondary)",
    "--app-utility-button-color": "var(--bs-secondary)",
    "--app-header-bg": "transparent",
    "--app-header-text": "var(--bs-body-color)",
    "--app-radius": "var(--bs-border-radius)",
    "--app-control-radius": "var(--bs-border-radius)",
    "--app-shadow-panel": "var(--bs-box-shadow)",
    "--app-shadow-popup": "var(--bs-box-shadow)"
  };
}
