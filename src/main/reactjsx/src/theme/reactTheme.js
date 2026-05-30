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
    "--app-bg-gradient": theme.login.background,
    "--app-chrome-bg-layer": chromeImageUrl ? `url("${chromeImageUrl}")` : "none",
    "--app-chrome-bg-image": chromeImageUrl ? `url("${chromeImageUrl}")` : "none",
    "--app-page-bg": theme.colors.page,
    "--app-surface": theme.colors.surface,
    "--main-panel-bg": theme.colors.content,
    "--app-panel-bg": theme.colors.panel,
    "--app-hover-bg": theme.colors.hover,
    "--app-input-bg": theme.colors.inputBg,
    "--app-input-text": theme.colors.inputText,
    "--app-text": theme.colors.text,
    "--app-muted-text": theme.colors.mutedText,
    "--app-border": theme.colors.border,
    "--app-border-color": theme.colors.borderAccent,
    "--app-button-color": theme.colors.primary,
    "--app-close-button-color": theme.colors.close,
    "--app-utility-button-color": theme.colors.utility,
    "--app-header-bg": theme.header.background,
    "--app-header-text": theme.header.text,
    "--app-radius": theme.shape.radius,
    "--app-control-radius": theme.shape.controlRadius,
    "--app-shadow-panel": theme.shadow.panel,
    "--app-shadow-popup": theme.shadow.popup
  };
}
