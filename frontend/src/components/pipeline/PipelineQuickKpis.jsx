import React from 'react';

export default function PipelineQuickKpis({ items }) {
  return (
    <div className="pl-quick">
      {items.map((item) => (
        <div key={item.label} className="pl-q">
          <b>{item.value}</b>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
