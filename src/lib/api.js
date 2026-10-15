const API_URL = process.env.NEXT_PUBLIC_API_URL;

const NO_REDIRECT_ON_401 = ["/api/auth/login", "/api/auth/change-password"];

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("employee");
  // preserve locale prefix (e.g. /ka, /en, /ru) so the person lands back
  // on the login page in the language they were already using
  const seg = window.location.pathname.split("/")[1];
  const locale = ["en", "ka", "ru"].includes(seg) ? seg : "ka";
  window.location.href = `/${locale}/login`;
}

export async function apiFetch(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // On these endpoints 401 means "wrong password", not "session expired":
  // let the form show the error instead of reloading the login page.
  const passwordCheck = NO_REDIRECT_ON_401.some((p) => path.startsWith(p));

  if (res.status === 401 && !passwordCheck) {
    handleUnauthorized();
    // redirect is in flight — throw so the calling code's loading state
    // doesn't hang, but nothing will render this since the page is navigating away
    throw new Error("Session expired");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function apiDownload(path) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "export.xlsx";

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
