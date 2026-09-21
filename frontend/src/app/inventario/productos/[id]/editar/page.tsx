import { InventoryWorkspace } from "@/modules/inventory/components/inventory-workspace";
export default async function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <InventoryWorkspace initialView="edit" itemId={id} />; }
