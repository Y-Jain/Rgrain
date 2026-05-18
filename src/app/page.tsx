import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to dashboard as default entry point
  // The middleware will handle authentication checks
  redirect("/dashboard");
}
