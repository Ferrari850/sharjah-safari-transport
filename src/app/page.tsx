import { redirect } from "next/navigation";

/**
 * Root entry point. The middleware handles the auth boundary, so we simply
 * forward into the app — authenticated users land on the dashboard,
 * everyone else is redirected to /login by the middleware.
 */
export default function RootPage() {
  redirect("/dashboard");
}
