import Login from "@/components/Login/Login";

// iPhone status bar / toolbar colour on the login page only
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#041221",
};

export default function LoginPage() {
  return <Login />;
}
