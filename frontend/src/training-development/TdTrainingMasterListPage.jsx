import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { trainingDevelopmentApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Loader2, Plus } from 'lucide-react';

const TdTrainingMasterListPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [filters, setFilters] = useState({ q: '', status: 'all', category: 'all' });

  const params = useMemo(() => {
    const skip = (page - 1) * pageSize;
    return {
      skip,
      limit: pageSize,
      q: filters.q || undefined,
      status: filters.status !== 'all' ? filters.status : undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
    };
  }, [filters, page]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await trainingDevelopmentApi.listPrograms(params);
      const payload = res.data || {};
      setRows(payload.items || []);
      setTotal(payload.total || 0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            Training Master
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Programs, versions, and delivery metadata.</p>
        </div>
        <Button asChild>
          <Link to="/training-development/training-master/new">
            <Plus className="w-4 h-4 mr-2" />
            New program
          </Link>
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            placeholder="Search name or code"
            className="max-w-xs"
            value={filters.q}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, q: e.target.value }));
            }}
          />
          <Select
            value={filters.status}
            onValueChange={(v) => {
              setPage(1);
              setFilters((f) => ({ ...f, status: v }));
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE</SelectItem>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.category}
            onValueChange={(v) => {
              setPage(1);
              setFilters((f) => ({ ...f, category: v }));
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="TECHNICAL">TECHNICAL</SelectItem>
              <SelectItem value="COMPLIANCE">COMPLIANCE</SelectItem>
              <SelectItem value="LEADERSHIP">LEADERSHIP</SelectItem>
              <SelectItem value="GENERAL">GENERAL</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Cert.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ver.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.training_code}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.training_name}</TableCell>
                  <TableCell>{r.training_category}</TableCell>
                  <TableCell>{r.training_type}</TableCell>
                  <TableCell>{r.delivery_mode}</TableCell>
                  <TableCell>{r.duration_hours}</TableCell>
                  <TableCell>{r.mandatory_flag ? <Badge>Yes</Badge> : '—'}</TableCell>
                  <TableCell>{r.compliance_flag ? <Badge variant="secondary">Yes</Badge> : '—'}</TableCell>
                  <TableCell>{r.certification_flag ? <Badge variant="outline">Yes</Badge> : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'ACTIVE' ? 'default' : 'outline'}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{r.version}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/training-development/training-master/${encodeURIComponent(r.id)}`}>View</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/training-development/training-master/${encodeURIComponent(r.id)}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 ? <p className="text-sm text-slate-500 py-6 text-center">No programs match filters.</p> : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} / {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TdTrainingMasterListPage;
