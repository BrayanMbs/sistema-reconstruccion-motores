import { ClientDetailView } from "@/modules/clients/components/client-detail-view";
export default async function AdministrativeClientPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClientDetailView id={id} />; }
