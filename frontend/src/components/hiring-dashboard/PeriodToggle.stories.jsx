import React from 'react';
import PeriodToggle from './PeriodToggle';

export default {
  title: 'Hiring Dashboard/PeriodToggle',
  component: PeriodToggle,
};

export const ThirtyDays = {
  render: () => {
    const [value, setValue] = React.useState(30);
    return <PeriodToggle value={value} onChange={setValue} />;
  },
};
