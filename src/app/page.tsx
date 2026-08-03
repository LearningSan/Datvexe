import { redirect } from "next/navigation";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;

  redirect(auth ? `/home?auth=${auth}` : "/home");
}
