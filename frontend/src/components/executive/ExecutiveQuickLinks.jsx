import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { EXEC_QUICK_LINKS } from '../../config/executiveKpiConfig';

export function ExecutiveQuickLinks({ defaultOpen = false }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card className="border-slate-200 bg-slate-50/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 cursor-pointer hover:bg-slate-100/50 rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Related executive views
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="flex flex-wrap gap-2 pt-0 pb-4">
            {EXEC_QUICK_LINKS.map((l) => (
              <Button key={l.to} asChild variant="outline" size="sm" className="h-8 text-xs">
                <Link to={l.to}>
                  {l.label}
                  <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
