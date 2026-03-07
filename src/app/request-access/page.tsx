import { redirect } from "next/navigation";

export default function RequestAccessRedirect() {
  redirect("/register");
}
