import { OperationalOrderDetailView } from "@/modules/operational/components/operational-order-detail-view";
export default async function OperationalOrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OperationalOrderDetailView id={id} />; }
