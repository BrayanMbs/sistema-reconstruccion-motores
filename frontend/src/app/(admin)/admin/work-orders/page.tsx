import { WorkOrdersView } from "@/modules/work-orders/components/work-orders-view";

export default async function WorkOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; search?: string }>;
}) {
  const params = await searchParams;
  return <WorkOrdersView initialStatus={params?.status ?? ""} initialSearch={params?.search ?? ""} />;
}
