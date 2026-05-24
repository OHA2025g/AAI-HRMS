import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

export default function RelatedViewsFooter() {
  return (
    <Card className="border-slate-200 bg-slate-50/80">
      <CardHeader className="py-3 pb-0">
        <CardTitle className="text-sm font-medium text-slate-700">Related executive &amp; workforce views</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-2 pb-4">
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/executive-kpis">Executive KPIs (M9)</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/resource-staffing-hub">Resource &amp; staffing hub</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/dashboard/legacy">Legacy hiring dashboard</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/workforce-intelligence/dashboard">Workforce Intelligence</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to="/employee-satisfaction-engagement/dashboard">Engagement (ESE)</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
