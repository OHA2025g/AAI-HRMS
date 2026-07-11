import React from 'react';
import { Phase2FitPanel } from '../Phase2FitPanel';

export default function CareerTrajectoryPhase2Section(props) {
  return (
    <section className="p2-phase-wrap">
      <Phase2FitPanel {...props} commandStyle />
    </section>
  );
}
