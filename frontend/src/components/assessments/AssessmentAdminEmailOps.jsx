import React, { useEffect, useState } from 'react';
import { assessmentsApi } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Mail, Bell, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Admin-only: flush queued invite emails and send incomplete-assessment reminders.
 */
export default function AssessmentAdminEmailOps() {
  const [dispatchingInvites, setDispatchingInvites] = useState(false);
  const [dispatchingReminders, setDispatchingReminders] = useState(false);
  const [opsStatus, setOpsStatus] = useState(null);
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await assessmentsApi.opsStatus();
        if (!cancelled) setOpsStatus(res.data || null);
      } catch {
        if (!cancelled) setOpsStatus(null);
      } finally {
        if (!cancelled) setOpsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDispatchInvites = async () => {
    setDispatchingInvites(true);
    try {
      const res = await assessmentsApi.dispatchInviteEmails(100);
      const data = res.data || {};
      toast.success(
        `Invite queue: ${data.sent ?? 0} sent, ${data.failed ?? 0} failed, ${data.skipped ?? 0} skipped`
      );
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to dispatch queued invites');
    } finally {
      setDispatchingInvites(false);
    }
  };

  const handleDispatchReminders = async () => {
    setDispatchingReminders(true);
    try {
      const res = await assessmentsApi.dispatchReminders(48);
      const data = res.data || {};
      toast.success(`Reminders: ${data.sent ?? 0} sent, ${data.skipped ?? 0} skipped`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to dispatch reminders');
    } finally {
      setDispatchingReminders(false);
    }
  };

  return (
    <Card className="border-indigo-100 bg-indigo-50/40" data-testid="assessment-admin-email-ops">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Email operations</CardTitle>
        <CardDescription>
          Flush queued invite emails (requires SMTP) and send reminders for invites older than 48 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!opsLoading && opsStatus ? (
          <div className="space-y-2" data-testid="assessment-email-ops-status">
            <div className="flex flex-wrap gap-2">
              <Badge variant={opsStatus.smtp_configured ? 'secondary' : 'outline'}>
                SMTP {opsStatus.smtp_configured ? 'configured' : 'missing'}
              </Badge>
              <Badge variant={opsStatus.public_base_url_explicit ? 'secondary' : 'outline'}>
                Public URL {opsStatus.public_base_url_explicit ? 'set' : 'fallback'}
              </Badge>
              <Badge variant={opsStatus.cron_configured ? 'secondary' : 'outline'}>
                Cron {opsStatus.cron_configured ? 'configured' : 'missing'}
              </Badge>
            </div>
            {opsStatus.warnings?.length ? (
              <ul className="text-xs text-amber-800 space-y-1">
                {opsStatus.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-emerald-700">Email delivery configuration looks ready.</p>
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={dispatchingInvites}
            onClick={handleDispatchInvites}
            data-testid="dispatch-assessment-invites-btn"
          >
            {dispatchingInvites ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Send queued invites
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={dispatchingReminders}
            onClick={handleDispatchReminders}
            data-testid="dispatch-assessment-reminders-btn"
          >
            {dispatchingReminders ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            Send incomplete reminders
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
