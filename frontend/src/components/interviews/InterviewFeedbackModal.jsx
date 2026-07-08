import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { InterviewPrepPanel } from '../career-trajectory/InterviewPrepPanel';

export default function InterviewFeedbackModal({
  open,
  onOpenChange,
  selectedInterview,
  feedbackData,
  setFeedbackData,
  submitting,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[min(90vh,640px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Outfit' }}>Submit Interview Feedback</DialogTitle>
          <DialogDescription>
            {selectedInterview?.candidate?.full_name} - Round {selectedInterview?.round}
          </DialogDescription>
        </DialogHeader>
        <InterviewPrepPanel candidateId={selectedInterview?.candidate_id} />
        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Decision *</Label>
            <Select
              value={feedbackData.decision}
              onValueChange={(v) => setFeedbackData({ ...feedbackData, decision: v })}
            >
              <SelectTrigger data-testid="feedback-decision-select">
                <SelectValue placeholder="Select your decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STRONG_YES">Strong Yes</SelectItem>
                <SelectItem value="YES">Yes</SelectItem>
                <SelectItem value="MAYBE">Maybe</SelectItem>
                <SelectItem value="NO">No</SelectItem>
                <SelectItem value="STRONG_NO">Strong No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Score (1-10)</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={feedbackData.score}
              onChange={(e) => setFeedbackData({ ...feedbackData, score: e.target.value })}
              placeholder="Optional score"
            />
          </div>

          <div className="space-y-2">
            <Label>Strengths</Label>
            <Textarea
              value={feedbackData.strengths}
              onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
              placeholder="What impressed you about the candidate?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Concerns</Label>
            <Textarea
              value={feedbackData.concerns}
              onChange={(e) => setFeedbackData({ ...feedbackData, concerns: e.target.value })}
              placeholder="Any areas of concern?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={feedbackData.notes}
              onChange={(e) => setFeedbackData({ ...feedbackData, notes: e.target.value })}
              placeholder="Any other notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={submitting || !feedbackData.decision}
              data-testid="submit-feedback-btn"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
