// Set only after verifying the public app URL. An empty value opens the local demo.
const configuredUrl = import.meta.env.VITE_APP_URL?.trim();
function verifiedTarget(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export const APP_URL = verifiedTarget(configuredUrl);
export const APP_CTA = APP_URL ? "Otwórz aplikację" : "Wypróbuj demo";
export const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;
