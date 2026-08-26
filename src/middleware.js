import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["en", "ka"],
  defaultLocale: "ka",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
