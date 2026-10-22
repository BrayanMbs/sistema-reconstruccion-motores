import { UsersView } from "@/modules/users/components/users-view";

export default async function UsersPage({
  searchParams
}: {
  searchParams?: Promise<{ active?: string; role?: string; search?: string }>;
}) {
  const params = await searchParams;
  return (
    <UsersView
      initialActive={params?.active ?? ""}
      initialRole={params?.role ?? ""}
      initialSearch={params?.search ?? ""}
    />
  );
}
