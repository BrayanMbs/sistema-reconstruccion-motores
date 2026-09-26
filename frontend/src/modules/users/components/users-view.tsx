"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ConfirmationDialog } from "@/modules/users/components/confirmation-dialog";
import { Icon } from "@/shared/components/icon";
import type { AppUser, Paginated, Role } from "@/shared/models/admin";
import { StatusBadge } from "@/shared/components/status-badge";
import { apiRequest } from "@/shared/services/api";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  ADMINISTRATIVE: "Personal Administrativo",
  CASHIER: "Cajero",
  INVENTORY: "Encargado de Inventario",
  OPERATOR: "Trabajador Operativo"
};
const roleOptions = Object.entries(roleLabels) as [Role, string][];
type FormData = { fullName: string; email: string; password: string; role: Role };
type ConfirmationAction = "reset-password" | "change-status";
type PendingConfirmation = { action: ConfirmationAction; user: AppUser };

const emptyForm: FormData = { fullName: "", email: "", password: "", role: "ADMINISTRATIVE" };

export function UsersView() {
  const [data, setData] = useState<Paginated<AppUser> | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [changingStatusUserId, setChangingStatusUserId] = useState<string | null>(null);
  const [temporaryCredential, setTemporaryCredential] = useState<{ fullName: string; password: string } | null>(null);
  const [openOptionsUserId, setOpenOptionsUserId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ limit: "20" });
      if (search) query.set("search", search);
      if (role) query.set("role", role);
      if (active) query.set("active", active);
      setData(await apiRequest<Paginated<AppUser>>(`/api/admin/users?${query}`));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [search, role, active]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await apiRequest(`/api/admin/users/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ fullName: form.fullName, role: form.role })
        });
      } else {
        await apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (user: AppUser) => {
    setError("");
    setChangingStatusUserId(user.id);
    try {
      await apiRequest(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive })
      });
      setConfirmation(null);
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setChangingStatusUserId(null);
    }
  };

  const resetPassword = async (user: AppUser) => {
    setError("");
    setTemporaryCredential(null);
    setResettingUserId(user.id);
    try {
      const result = await apiRequest<{ temporaryPassword: string }>(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST"
      });
      setConfirmation(null);
      setTemporaryCredential({ fullName: user.fullName, password: result.temporaryPassword });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setResettingUserId(null);
    }
  };

  const edit = (user: AppUser) => {
    setEditing(user);
    setForm({ fullName: user.fullName, email: user.email, password: "", role: user.role });
    setShowForm(true);
  };

  const openNewUser = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const requestConfirmation = (action: ConfirmationAction, user: AppUser) => {
    setConfirmation({ action, user });
  };

  const confirmAction = () => {
    if (!confirmation) return;
    if (confirmation.action === "reset-password") {
      if (!resettingUserId) void resetPassword(confirmation.user);
      return;
    }
    if (!changingStatusUserId) void changeStatus(confirmation.user);
  };

  const confirmationLoading = confirmation?.action === "reset-password"
    ? resettingUserId === confirmation.user.id
    : changingStatusUserId === confirmation?.user.id;

  return (
    <div className="mx-auto max-w-[1440px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-bold">Lista de usuarios</h2>
          <p className="mt-1 text-sm text-slate-600">Administre las cuentas, roles y estados de acceso de los usuarios del sistema.</p>
        </div>
        <button className="stitch-button stitch-button-primary" onClick={openNewUser}>
          <Icon name="add" />
          Nuevo usuario
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
        className="stitch-card mb-6 grid gap-4 p-4 md:grid-cols-[1fr_200px_180px_auto] md:items-end"
      >
        <Field label="Buscar por nombre o correo">
          <input className="stitch-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. Luis Gómez..." />
        </Field>
        <Field label="Rol">
          <select className="stitch-input" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="">Todos los roles</option>
            {roleOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select className="stitch-input" value={active} onChange={(event) => setActive(event.target.value)}>
            <option value="">Todos los estados</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </Field>
        <button type="button" className="stitch-button stitch-button-secondary" onClick={() => { setSearch(""); setRole(""); setActive(""); }}>
          <Icon name="filter" />
          Limpiar
        </button>
      </form>

      <div className="space-y-3 md:hidden">
        {data?.items.map((user) => (
          <MobileUserCard
            key={user.id}
            user={user}
            isOpen={openOptionsUserId === user.id}
            resetting={resettingUserId === user.id}
            changingStatus={changingStatusUserId === user.id}
            onToggle={() => setOpenOptionsUserId((current) => current === user.id ? null : user.id)}
            onReset={() => { setOpenOptionsUserId(null); requestConfirmation("reset-password", user); }}
            onEdit={() => { setOpenOptionsUserId(null); edit(user); }}
            onChangeStatus={() => { setOpenOptionsUserId(null); requestConfirmation("change-status", user); }}
          />
        ))}
        {data && !data.items.length && <EmptyUsers />}
      </div>

      <div className="hidden md:block">
        <div className="stitch-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="stitch-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Fecha de registro</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.fullName}</td>
                    <td className="text-slate-600">{user.email}</td>
                    <td>{roleLabels[user.role]}</td>
                    <td><StatusBadge active={user.isActive} /></td>
                    <td className="text-slate-600">{formatDate(user.createdAt)}</td>
                    <td>
                      <DesktopUserActions
                        user={user}
                        resetting={resettingUserId === user.id}
                        changingStatus={changingStatusUserId === user.id}
                        onReset={() => requestConfirmation("reset-password", user)}
                        onEdit={() => edit(user)}
                        onChangeStatus={() => requestConfirmation("change-status", user)}
                      />
                    </td>
                  </tr>
                ))}
                {data && !data.items.length && <tr><td className="p-10 text-center text-slate-500" colSpan={6}>No hay usuarios que coincidan con los filtros.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t border-slate-300 px-4 py-3 text-sm text-slate-600">
            <span>Mostrando {data?.items.length ?? 0} de {data?.total ?? 0} usuarios</span>
          </div>
        </div>
      </div>

      {showForm && <UserDialog form={form} setForm={setForm} editing={editing} saving={saving} onClose={() => setShowForm(false)} onSubmit={submit} />}
      {confirmation && (
        <ConfirmationDialog
          title={confirmation.action === "reset-password" ? "Restablecer contraseña" : confirmation.user.isActive ? "Inactivar usuario" : "Activar usuario"}
          message={
            confirmation.action === "reset-password" ? (
              <>
                <p>¿Deseas restablecer la contraseña de este usuario?</p>
                <p className="mt-3 rounded-md bg-slate-50 p-3 text-slate-800"><strong>{confirmation.user.fullName}</strong></p>
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">Se generará una contraseña temporal que el usuario deberá cambiar al iniciar sesión.</p>
              </>
            ) : (
              <p>¿Deseas {confirmation.user.isActive ? "inactivar" : "activar"} a <strong>{confirmation.user.fullName}</strong>?</p>
            )
          }
          confirmLabel={confirmation.action === "reset-password" ? "Restablecer contraseña" : confirmation.user.isActive ? "Inactivar usuario" : "Activar usuario"}
          destructive={confirmation.action === "change-status" && confirmation.user.isActive}
          loading={confirmationLoading}
          onConfirm={confirmAction}
          onCancel={() => setConfirmation(null)}
        />
      )}
      {temporaryCredential && (
        <TemporaryCredentialDialog
          credential={temporaryCredential}
          onClose={() => setTemporaryCredential(null)}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(temporaryCredential.password);
            } catch {
              setError("No fue posible copiar la contraseña. Cópiala manualmente.");
            }
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function EmptyUsers() {
  return <div className="stitch-card p-8 text-center text-sm text-slate-500">No hay usuarios que coincidan con los filtros.</div>;
}

function DesktopUserActions({ user, resetting, changingStatus, onReset, onEdit, onChangeStatus }: { user: AppUser; resetting: boolean; changingStatus: boolean; onReset: () => void; onEdit: () => void; onChangeStatus: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${user.fullName}`} disabled={!user.isActive || resetting} onClick={onReset} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="key" /></button>
      <button type="button" title="Editar usuario" aria-label={`Editar ${user.fullName}`} onClick={onEdit} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Icon name="edit" /></button>
      <button type="button" title={user.isActive ? "Inactivar usuario" : "Activar usuario"} aria-label={`${user.isActive ? "Inactivar" : "Activar"} ${user.fullName}`} disabled={changingStatus} onClick={onChangeStatus} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Icon name={user.isActive ? "person_off" : "person_check"} /></button>
    </div>
  );
}

function MobileUserCard({ user, isOpen, resetting, changingStatus, onToggle, onReset, onEdit, onChangeStatus }: { user: AppUser; isOpen: boolean; resetting: boolean; changingStatus: boolean; onToggle: () => void; onReset: () => void; onEdit: () => void; onChangeStatus: () => void }) {
  const panelId = `user-actions-${user.id}`;
  return (
    <article className="stitch-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="break-words font-semibold text-slate-900">{user.fullName}</h3><p className="mt-1 break-all text-sm text-slate-600">{user.email}</p></div>
        <StatusBadge active={user.isActive} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-slate-500">Rol</dt><dd className="mt-1 font-medium">{roleLabels[user.role]}</dd></div><div><dt className="text-xs text-slate-500">Fecha de registro</dt><dd className="mt-1 text-slate-700">{formatDate(user.createdAt)}</dd></div></dl>
      <button type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={onToggle} className="stitch-button stitch-button-secondary mt-4 w-full"><Icon name="menu" />Opciones</button>
      {isOpen && (
        <div id={panelId} className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
          <button type="button" disabled={!user.isActive || resetting} onClick={onReset} className="stitch-button stitch-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50"><Icon name="key" />{resetting ? "Restableciendo contraseña..." : "Restablecer contraseña"}</button>
          <button type="button" onClick={onEdit} className="stitch-button stitch-button-secondary w-full"><Icon name="edit" />Editar usuario</button>
          <button type="button" disabled={changingStatus} onClick={onChangeStatus} className="stitch-button stitch-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50"><Icon name={user.isActive ? "person_off" : "person_check"} />{changingStatus ? "Actualizando estado..." : user.isActive ? "Inactivar usuario" : "Activar usuario"}</button>
        </div>
      )}
    </article>
  );
}

function PasswordVisibilityButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return <button type="button" aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onMouseDown={(event) => event.preventDefault()} onClick={onToggle} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600"><Icon name={visible ? "visibility_off" : "visibility"} /></button>;
}

function UserDialog({ form, setForm, editing, saving, onClose, onSubmit }: { form: FormData; setForm: (value: FormData) => void; editing: AppUser | null; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const set = (key: keyof FormData, value: string) => setForm({ ...form, [key]: value });
  const title = editing ? "Editar usuario" : "Nuevo usuario";

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="user-dialog-title" onSubmit={onSubmit} className="stitch-card my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden p-4 sm:max-h-[calc(100dvh-4rem)] sm:p-6">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0"><h3 id="user-dialog-title" className="text-xl font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{editing ? "Actualiza el nombre y rol de acceso." : "La cuenta se creará en Supabase Auth."}</p></div>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="flex min-h-10 min-w-10 items-center justify-center rounded text-slate-500 hover:bg-slate-100"><Icon name="close" /></button>
        </div>
        <div className="mt-5 grid flex-1 gap-4 overflow-y-auto pr-1">
          <Field label="Nombre completo"><input required className="stitch-input" value={form.fullName} onChange={(event) => set("fullName", event.target.value)} /></Field>
          <Field label="Correo electrónico"><input required disabled={!!editing} className="stitch-input disabled:bg-slate-100" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
          {!editing && <Field label="Contraseña temporal"><span className="relative block"><input required minLength={8} autoComplete="new-password" className="stitch-input pr-11" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => set("password", event.target.value)} /><PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} /></span></Field>}
          <Field label="Rol"><select className="stitch-input" value={form.role} onChange={(event) => set("role", event.target.value)}>{roleOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
        </div>
        <div className="mt-5 flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="stitch-button stitch-button-secondary w-full sm:w-auto" onClick={onClose}>Cancelar</button>
          <button disabled={saving} className="stitch-button stitch-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear usuario"}</button>
        </div>
      </form>
    </div>
  );
}

function TemporaryCredentialDialog({ credential, onClose, onCopy }: { credential: { fullName: string; password: string }; onClose: () => void; onCopy: () => Promise<void> }) {
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/40 p-3 sm:p-4"><section role="dialog" aria-modal="true" aria-labelledby="temporary-password-title" className="stitch-card mx-auto my-3 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto p-4 sm:my-8 sm:max-h-[calc(100vh-4rem)] sm:p-6"><h3 id="temporary-password-title" className="text-xl font-bold">Contraseña temporal generada</h3><p className="mt-2 text-sm text-slate-600">Entrega esta contraseña a {credential.fullName}. Solo se mostrará ahora y deberá cambiarse al iniciar sesión.</p><code className="mt-5 block break-all rounded bg-slate-100 p-3 text-sm font-semibold text-slate-900">{credential.password}</code><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button className="stitch-button stitch-button-secondary w-full sm:w-auto" onClick={() => void onCopy()}>Copiar</button><button className="stitch-button stitch-button-primary w-full sm:w-auto" onClick={onClose}>Cerrar</button></div></section></div>;
}

const formatDate = (value: string) => new Intl.DateTimeFormat("es-GT", { dateStyle: "short" }).format(new Date(value));
