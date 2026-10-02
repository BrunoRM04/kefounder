import React, { useState } from 'react';
import { CircleCheck, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/app.jsx';
import { Link } from '../../lib/router.jsx';
import { DataTable, Empty, Failed, FilterSelect, PageHeader, Pagination, Status, TaskSheet, Tabs, dueLabel, optionsOf, targetLink, useAdmin, useAdminData, useQueryState } from '../kit.jsx';

const DEFAULTS = { view: 'open', priority: '', page: '1', pageSize: '25' };

export default function Tasks() {
  const { fail, toast } = useApp();
  const { refreshBadges } = useAdmin();
  const { values, set, apiQuery } = useQueryState(DEFAULTS);
  const { data, loading, error, reload } = useAdminData(`/admin/tasks?${apiQuery}`);
  const [editing, setEditing] = useState(null);
  const counts = data?.counts || {};
  const refresh = () => { reload({ silent: true }); refreshBadges(); };

  const update = async (task, patch, message) => {
    try {
      await api.put(`/admin/tasks/${task.id}`, patch);
      if (message) toast(message, { icon: <CircleCheck size={14} /> });
      refresh();
    } catch (err) { fail(err); }
  };
  const remove = async (task) => {
    try { await api.del(`/admin/tasks/${task.id}`); toast('Tarea eliminada'); refresh(); } catch (err) { fail(err); }
  };

  const columns = [
    { key: 'done', label: '', width: 48, mobileHide: true, render: (t) => (
      <button type="button" className={cx('adm-task-check', t.status === 'done' && 'is-done')} aria-label={t.status === 'done' ? 'Marcar como pendiente' : 'Marcar como hecha'} onClick={() => update(t, { status: t.status === 'done' ? 'todo' : 'done' }, t.status === 'done' ? null : 'Tarea completada')}>
        {t.status === 'done' && <CircleCheck size={14} />}
      </button>
    ) },
    { key: 'title', label: 'Tarea', primary: true, render: (t) => (
      <button type="button" className="adm-cell-copy adm-task-title" onClick={() => setEditing(t)}>
        <strong>{t.title}</strong>
        <small>{t.detail || (t.createdBy ? `Creada por ${t.createdBy}` : 'Sin detalle')}</small>
      </button>
    ) },
    { key: 'due', label: 'Vence', render: (t) => <span className={cx('adm-due', t.overdue && 'is-overdue', t.dueToday && 'is-today')}>{dueLabel(t.dueAt)}</span> },
    { key: 'priority', label: 'Prioridad', render: (t) => <Status kind="priority" value={t.priority} dot={false} /> },
    { key: 'target', label: 'Vinculada a', mobileHide: true, render: (t) => (t.target?.label ? <Link to={targetLink(t.target.type, t.target.id)} className="adm-link">{t.target.label}</Link> : <span className="adm-muted">—</span>) },
    { key: 'status', label: 'Estado', render: (t) => (
      <select className="adm-inline-select" value={t.status} aria-label="Estado de la tarea" onChange={(e) => update(t, { status: e.target.value })}>
        {optionsOf('task').map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    ) },
    { key: 'actions', label: '', width: 52, render: (t) => <IconButton label="Eliminar tarea" onClick={() => remove(t)}><Trash2 size={15} /></IconButton> }
  ];

  return (
    <div className="adm-page is-table">
      <PageHeader
        title="Seguimiento"
        subtitle="Tareas internas con vencimiento, vinculadas a cuentas, proyectos o reportes."
        actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setEditing('new')}>Nueva tarea</Button>}
      />
      <div className="adm-table-page">
        <div className="adm-filters">
          <Tabs value={values.view} onChange={(view) => set({ view })} items={[
            { id: 'open', label: 'Abiertas', count: data ? counts.open : null },
            { id: 'overdue', label: 'Vencidas', count: data ? counts.overdue : null },
            { id: 'today', label: 'Hoy', count: data ? counts.today : null },
            { id: 'week', label: 'Próximos 7 días' },
            { id: 'done', label: 'Hechas', count: data ? counts.done : null }
          ]} />
          <FilterSelect label="Prioridad" value={values.priority} onChange={(priority) => set({ priority })} all="Todas" options={optionsOf('priority')} />
        </div>
        {error ? <Failed error={error} onRetry={reload} /> : (
          <DataTable
            columns={columns}
            rows={data?.items}
            loading={loading}
            rowClass={(t) => cx(t.status === 'done' && 'is-muted', t.overdue && 'is-alert')}
            empty={<Empty icon={<CircleCheck size={18} />} title={values.view === 'done' ? 'Todavía no completaste tareas' : 'No hay tareas acá'} text="Creá tareas desde acá o desde la ficha de una cuenta, un proyecto o un reporte." />}
          />
        )}
        <Pagination data={data} onChange={set} />
      </div>
      <TaskSheet open={Boolean(editing)} onClose={() => setEditing(null)} task={editing === 'new' ? null : editing} onSaved={refresh} />
    </div>
  );
}
