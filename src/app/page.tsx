import { redirect } from "next/navigation";

import { ROLE_HOME_ROUTE, ROUTES } from "@/config/routes";
import { getCurrentUser } from "@/lib/auth/current-user";

/**
 * The root has no content of its own: it sends a signed-in user to their role
 * home and everyone else to the login page.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME_ROUTE[user.role] : ROUTES.login);
}
