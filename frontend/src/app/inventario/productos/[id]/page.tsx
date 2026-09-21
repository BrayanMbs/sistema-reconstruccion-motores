import { InventoryWorkspace } from "@/modules/inventory/components/inventory-workspace";
export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <InventoryWorkspace initialView="detail" itemId={id} />; }
