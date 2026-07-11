import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export default function AssessmentClearOverrideDialog({
  open,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  busy = false,
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel?.()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override assessment clearance</DialogTitle>
          <DialogDescription>
            This candidate has not passed (or is not yet scored). A reason is required to mark cleared.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="clear-reason">Override reason</Label>
          <Input
            id="clear-reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Strong interview feedback, role fit exception"
            data-testid="assessment-clear-override-reason"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy || !reason?.trim()} data-testid="confirm-mark-cleared-btn">
            Mark cleared
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
