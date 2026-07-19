export function basePath(baseUrl: string): string {
  if (!baseUrl || baseUrl === "/") return "";
  return `/${baseUrl.replace(/^\/+|\/+$/g, "")}`;
}

export function routeFromPathname<Route extends string>(pathname: string, baseUrl: string, routes: readonly Route[]): Route {
  const base = basePath(baseUrl);
  const withoutBase = base && pathname.startsWith(`${base}/`)
    ? pathname.slice(base.length)
    : pathname === base
      ? "/"
      : pathname;
  const normalized = withoutBase.length > 1 ? withoutBase.replace(/\/+$/, "") : withoutBase;
  return routes.includes(normalized as Route) ? normalized as Route : routes[0];
}

export function routeHref(route: string, baseUrl: string): string {
  const base = basePath(baseUrl);
  return route === "/" ? `${base}/` || "/" : `${base}${route}/`;
}
