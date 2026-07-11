import React from 'react';
import { Link } from 'react-router-dom';
import { useAssessmentFeatureFlags } from '@/shared/hooks/useAssessmentFeatureFlags';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Loader2 } from 'lucide-react';

export default function AssessmentCommandCenterGate({ children }) {
  const { flags, loading } = useAssessmentFeatureFlags();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (flags.command_center === false) {
    return (
      <div className="max-w-lg mx-auto mt-16 px-4" data-testid="assessment-command-center-disabled">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
              Assessment Command Center is disabled
            </h1>
            <p className="text-slate-600 text-sm">
              This workspace is turned off via the ASSESSMENT_COMMAND_CENTER feature flag. Contact your administrator
              or use the hiring dashboard for pipeline activity.
            </p>
            <Link to="/dashboard">
              <Button variant="outline">Go to hiring dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
