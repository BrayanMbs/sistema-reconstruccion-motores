"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Icon } from "@/shared/components/icon";
import type { Client, Paginated } from "@/shared/models/admin";
import { apiRequest } from "@/shared/services/api";

type ClientForm = { fullName: string; identificationType: "DPI" | "NIT" | "PASSPORT"; identification: string; phone: string; email: string; address: string };
const emptyForm: ClientForm = { fullName: "", identificationType: "DPI", identification: "", phone: "", email: "", address: "" };

export function ClientsView() {
  const [data, setData] = useState<Paginated<Client> | null>(null);
  const [search, setSearch] = useState("");
  const [identificationType, setIdentificationType] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (search) query.set("search", search);
      if (identificationType) query.set("identificationType", identificationType);
      setData(await apiRequest<Paginated<Client>>(`/api/admin/clients?${query}`));
    } catch (caught) { setError((caught as Error).message); }
  }, [search, identificationType]);

  useEffect(() => { void load(); }, [load]);

  const detail = async (id: string) => {
    try { const result = await apiRequest<{ client: Client }>(`/api/admin/clients/${id}`); setSelected(result.client); }
    catch (caught) { setError((caught as Error).message); }
  };

  const createClient = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await apiRequest("/api/admin/clients", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (caught) { setFormError((caught as Error).message); }
    finally { setSaving(false); }
  };

  const openForm = () => { setForm(emptyForm); setFormError(""); setShowForm(true); };

  return <div className="mx-auto max-w-[1440px]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-[28px] font-bold">Lista de clientes</h2><p className="mt-1 text-slate-600">Consulte y registre los clientes del sistema.</p></div><button className="stitch-button stitch-button-primary" onClick={openForm}><Icon name="person_add" />Nuevo cliente</button></div>
    {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="stitch-card mb-6 p-4"><div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"><label className="text-sm text-slate-600"><span className="mb-2 block">Buscar cliente</span><div className="relative"><Icon name="search" className="absolute left-3 top-2.5 text-slate-500" /><input className="stitch-input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, identificación o teléfono" /></div></label><label className="text-sm text-slate-600"><span className="mb-2 block">Tipo de identificación</span><select className="stitch-input" value={identificationType} onChange={(event) => setIdentificationType(event.target.value)}><option value="">Todos</option><option value="DPI">DPI</option><option value="NIT">NIT</option><option value="PASSPORT">Pasaporte</option></select></label><button type="button" className="stitch-button stitch-button-secondary" onClick={() => { setSearch(""); setIdentificationType(""); }}><Icon name="filter" />Limpiar</button></div></section>
    <section className="stitch-card overflow-hidden"><div className="overflow-x-auto"><table className="stitch-table"><thead><tr><th>Nombre</th><th>Identificación</th><th>Teléfono</th><th>Correo electrónico</th><th>Fecha de registro</th><th className="text-right">Acciones</th></tr></thead><tbody>{data?.items.map((client) => <tr key={client.id}><td className="font-medium">{client.fullName}</td><td>{client.identificationType}: {client.identification}</td><td className="text-slate-600">{client.phone ?? "—"}</td><td className="text-slate-600">{client.email ?? "—"}</td><td className="text-slate-600">{formatDate(client.createdAt)}</td><td className="text-right"><button aria-label={`Ver ${client.fullName}`} onClick={() => void detail(client.id)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Icon name="visibility" /></button></td></tr>)}{data && !data.items.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">No hay clientes que coincidan con los filtros.</td></tr>}</tbody></table></div><div className="border-t border-slate-300 px-4 py-3 text-sm text-slate-600">Mostrando {data?.items.length ?? 0} de {data?.total ?? 0} clientes</div></section>
    {showForm && <ClientDialog form={form} formError={formError} saving={saving} onClose={() => setShowForm(false)} onSubmit={createClient} setForm={setForm} />}
    {selected && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4"><article className="stitch-card w-full max-w-lg p-6"><div className="flex justify-between"><div><h3 className="text-xl font-bold">Detalle de cliente</h3><p className="text-sm text-slate-500">Información registrada</p></div><button aria-label="Cerrar" onClick={() => setSelected(null)} className="text-slate-500"><Icon name="close" /></button></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><Detail label="Nombre" value={selected.fullName} /><Detail label="Identificación" value={`${selected.identificationType}: ${selected.identification}`} /><Detail label="Teléfono" value={selected.phone ?? "No registrado"} /><Detail label="Correo" value={selected.email ?? "No registrado"} /><Detail label="Dirección" value={selected.address ?? "No registrada"} /></dl></article></div>}
  </div>;
}

function ClientDialog({ form, formError, saving, onClose, onSubmit, setForm }: { form: ClientForm; formError: string; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void; setForm: (value: ClientForm) => void }) {
  const set = (key: keyof ClientForm, value: string) => setForm({ ...form, [key]: value });
  return <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"><form onSubmit={onSubmit} className="stitch-card my-6 w-full max-w-2xl p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-bold">Nuevo cliente</h3><p className="mt-1 text-sm text-slate-500">Registre sus datos para poder crear órdenes de trabajo.</p></div><button type="button" aria-label="Cerrar" onClick={onClose} className="text-slate-500"><Icon name="close" /></button></div>{formError && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nombre completo"><input required maxLength={180} autoFocus className="stitch-input" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} /></Field><Field label="Tipo de identificación"><select className="stitch-input" value={form.identificationType} onChange={(event) => set("identificationType", event.target.value as ClientForm["identificationType"])}><option value="DPI">DPI</option><option value="NIT">NIT</option><option value="PASSPORT">Pasaporte</option></select></Field><Field label="Número de identificación"><input required maxLength={80} className="stitch-input" value={form.identification} onChange={(event) => set("identification", event.target.value)} /></Field><Field label="Teléfono"><input maxLength={40} className="stitch-input" type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field><Field label="Correo electrónico"><input maxLength={254} className="stitch-input" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field><Field label="Dirección" full><textarea maxLength={2000} className="stitch-input min-h-24 py-2" value={form.address} onChange={(event) => set("address", event.target.value)} /></Field></div><div className="mt-6 flex justify-end gap-2"><button type="button" className="stitch-button stitch-button-secondary" onClick={onClose}>Cancelar</button><button disabled={saving} className="stitch-button stitch-button-primary">{saving ? "Guardando..." : "Registrar cliente"}</button></div></form></div>;
}

function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={`block text-sm font-medium text-slate-700 ${full ? "sm:col-span-2" : ""}`}><span className="mb-1.5 block">{label}</span>{children}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>; }
const formatDate = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "short" }).format(new Date(value));
