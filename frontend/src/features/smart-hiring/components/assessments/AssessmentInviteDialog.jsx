import React, { useEffect, useState } from 'react';
import { applicationsApi, assessmentsApi } from '@/shared/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Loader2, Mail, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import CopyTakeLinkButton from './CopyTakeLinkButton';
import { useAssessmentFeatureFlags } from '@/shared/hooks/useAssessmentFeatureFlags';

export default function AssessmentInviteDialog({ open, assessment, onOpenChange, onInvited }) {
  const { flags } = useAssessmentFeatureFlags();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [lastInvite, setLastInvite] = useState(null);

  useEffect(() => {
    if (!open || !assessment?.job_id) return;
    setApplicationId('');
    setLastInvite(null);
    setSendEmail(true);
    setLoading(true);
    applicationsApi
      .list({ job_id: assessment.job_id })
      .then((r) => setApps(Array.isArray(r.data) ? r.data : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, [open, assessment?.job_id]);

  const handleInvite = async () => {
    if (!applicationId || !assessment?.id) return;
    setInviting(true);
    try {
      const res = await assessmentsApi.invite(assessment.id, {
        application_id: applicationId,
        send_candidate_email: sendEmail,
      });
      setLastInvite(res.data);
      const emailNote = res.data?.candidate_email_sent
        ? 'Email sent to candidate'
        : res.data?.candidate_email_queued
          ? 'Email queued (SMTP not configured)'
          : sendEmail
            ? 'Link ready — no candidate email on file'
            : 'Invite created';
      toast.success(`Candidate invited. ${emailNote}`);
      onInvited?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to invite candidate');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite candidate</DialogTitle>
          <DialogDescription>
            Send &quot;{assessment?.title}&quot; to a candidate on this job
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={applicationId} onValueChange={setApplicationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select candidate application" />
              </SelectTrigger>
              <SelectContent>
                {apps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.candidate?.full_name || app.candidate_id} ({app.stage})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <input
                id="send-candidate-email"
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-slate-300"
              />
              <Label htmlFor="send-candidate-email" className="font-normal cursor-pointer flex items-center gap-1">
                <Mail className="w-4 h-4" /> Email assessment link to candidate
              </Label>
            </div>
            {sendEmail && !flags.email_delivery_ready ? (
              <div
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2"
                data-testid="assessment-invite-email-warning"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Email delivery is not fully configured (SMTP and/or public take URL). The invite will be created;
                  use the copy-link button below or configure SMTP and ASSESSMENT_PUBLIC_BASE_URL for automatic sends.
                </span>
              </div>
            ) : null}
            <Button
              className="w-full bg-indigo-600"
              disabled={!applicationId || inviting}
              onClick={handleInvite}
              data-testid="assessment-invite-submit"
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
            {lastInvite?.take_url ? (
              <div className="rounded-lg border bg-slate-50 p-3 space-y-2" data-testid="assessment-invite-result">
                {lastInvite.candidate_email ? (
                  <p className="text-sm text-slate-600">
                    Candidate: {lastInvite.candidate_email}
                    {lastInvite.candidate_email_sent ? ' · Email sent' : null}
                    {lastInvite.candidate_email_queued ? ' · Email queued' : null}
                  </p>
                ) : null}
                <p className="text-sm text-slate-600">Share this link with the candidate:</p>
                <CopyTakeLinkButton takeUrl={lastInvite.take_url} className="w-full" />
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
