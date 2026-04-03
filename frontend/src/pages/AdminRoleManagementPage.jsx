import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Label } from '../components/ui/label';

const ROLE_OPTIONS = [
  { value: 'hr_admin', label: 'hr_admin' },
  { value: 'hr_viewer', label: 'hr_viewer' },
  { value: 'recruiter', label: 'recruiter' },
  { value: 'admin', label: 'admin' },
];

const AdminRoleManagementPage = () => {
  const { user: selfUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);

  const [qDraft, setQDraft] = useState('');
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Stores user's in-progress selection (not committed yet).
  const [draftRoles, setDraftRoles] = useState({});
  const [savingUserId, setSavingUserId] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);

  const roleParam = useMemo(() => (roleFilter === 'all' ? undefined : roleFilter), [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.listUsers({
        q: q || undefined,
        role: roleParam,
        page,
        page_size: pageSize,
      });
      const payload = res.data || {};
      setUsers(payload.items || []);
      setTotalPages(payload.total_pages || 1);
    } catch (e) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, roleParam]);

  const onSearch = () => {
    setPage(1);
    setQ(qDraft.trim());
  };

  const getEffectiveRole = (u) => {
    if (!u) return '';
    return draftRoles[u.id] || u.role;
  };

  const requestRoleChange = (u, nextRole) => {
    if (!u) return;
    if (nextRole === u.role) {
      setDraftRoles((prev) => {
        const copy = { ...prev };
        delete copy[u.id];
        return copy;
      });
      return;
    }
    setDraftRoles((prev) => ({ ...prev, [u.id]: nextRole }));
    setConfirmPayload({ userId: u.id, nextRole, userEmail: u.email });
    setConfirmOpen(true);
  };

  const confirmApply = async () => {
    if (!confirmPayload) return;
    const { userId, nextRole } = confirmPayload;
    try {
      setSaving(true);
      setSavingUserId(userId);
      await adminApi.updateUserRole(userId, { role: nextRole });
      toast.success('Role updated');
      setDraftRoles((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      setConfirmOpen(false);
      setConfirmPayload(null);
      await fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to update role');
    } finally {
      setSaving(false);
      setSavingUserId(null);
    }
  };

  const handleConfirmOpenChange = (open) => {
    // If the user cancels/closes the dialog without applying, revert the draft selection.
    if (!open && confirmPayload?.userId) {
      setDraftRoles((prev) => {
        const copy = { ...prev };
        delete copy[confirmPayload.userId];
        return copy;
      });
      setConfirmPayload(null);
    }
    setConfirmOpen(open);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
        <p className="text-slate-600 mt-1">
          Assign Phase-1 roles to control access to Employee Master, Workforce Skills, and Executive KPIs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Update roles to `hr_admin` or `hr_viewer`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input placeholder="Name, email, or id" value={qDraft} onChange={(e) => setQDraft(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onSearch}>
              Search
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Update To</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = selfUser?.id && u.id === selfUser.id;
                const effectiveRole = getEffectiveRole(u);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.id}</div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={effectiveRole}
                        onValueChange={(v) => requestRoleChange(u, v)}
                        disabled={isSelf || savingUserId === u.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-slate-500">Not editable</span>
                      ) : savingUserId === u.id ? (
                        <div className="flex items-center justify-end gap-2 text-sm text-indigo-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Change in dropdown</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Change role for <span className="font-medium">{confirmPayload?.userEmail || 'user'}</span> to{' '}
              <span className="font-medium">{confirmPayload?.nextRole || ''}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleConfirmOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={confirmApply} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoleManagementPage;

