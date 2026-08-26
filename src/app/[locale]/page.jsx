import { redirect } from "next/navigation";

export default async function RootPage({ params }) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
