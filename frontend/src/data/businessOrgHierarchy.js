/**
 * Pillar → Department → Sub-department hierarchy for job requisition classification.
 * Labels match business taxonomy; ids are stable for React keys.
 */

export const BUSINESS_ORG_PILLARS = [
  {
    id: 'pillar-1',
    label: 'Core Business',
    departments: [
      {
        id: 'dept-1',
        label: 'Executive Leadership',
        subDepartments: [
          'CEO / Managing Director',
          'COO (Operations)',
          'CFO (Finance)',
          'CTO / CIO (Technology & IT)',
          'CMO (Marketing)',
          'CHRO (Human Resources)',
        ],
      },
      {
        id: 'dept-2',
        label: 'Operations',
        subDepartments: [
          'Business Operations',
          'Process Management',
          'Quality Assurance (QA)',
          'Supply Chain Operations',
          'Vendor Management',
          'Service Delivery',
        ],
      },
      {
        id: 'dept-3',
        label: 'Finance & Accounts',
        subDepartments: [
          'Financial Planning & Analysis (FP&A)',
          'Accounting & Bookkeeping',
          'Treasury Management',
          'Taxation',
          'Audit & Compliance',
          'Payroll',
        ],
      },
      {
        id: 'dept-4',
        label: 'Human Resources (HR)',
        subDepartments: [
          'Talent Acquisition (Hiring)',
          'Employee Engagement',
          'Learning & Development (L&D)',
          'Performance Management',
          'Compensation & Benefits',
          'HR Operations',
        ],
      },
      {
        id: 'dept-5',
        label: 'Sales',
        subDepartments: [
          'Inside Sales',
          'Field Sales',
          'Channel / Partner Sales',
          'Key Account Management',
          'Pre-Sales / Solution Consulting',
        ],
      },
      {
        id: 'dept-6',
        label: 'Marketing Department',
        subDepartments: [
          'Digital Marketing',
          'Brand Management',
          'Product Marketing',
          'Content Marketing',
          'Market Research',
          'PR & Communications',
        ],
      },
      {
        id: 'dept-7',
        label: 'Customer Support / Success',
        subDepartments: [
          'Customer Support (Helpdesk)',
          'Customer Success Management',
          'Complaint Resolution',
          'Retention & Loyalty Programs',
        ],
      },
    ],
  },
  {
    id: 'pillar-2',
    label: 'Technology & Data',
    departments: [
      {
        id: 'dept-8',
        label: 'Information Technology (IT)',
        subDepartments: [
          'Infrastructure Management',
          'Network & Security',
          'Cloud Operations',
          'IT Support / Helpdesk',
          'DevOps',
        ],
      },
      {
        id: 'dept-9',
        label: 'Product & Engineering',
        subDepartments: [
          'Software Development',
          'UI/UX Design',
          'Product Management',
          'QA Testing',
          'Release Management',
        ],
      },
      {
        id: 'dept-10',
        label: 'Data & Analytics',
        subDepartments: [
          'Data Engineering',
          'Data Science',
          'Business Intelligence (BI)',
          'Data Governance',
          'AI / Machine Learning',
        ],
      },
    ],
  },
  {
    id: 'pillar-3',
    label: 'Governance & Control',
    departments: [
      {
        id: 'dept-11',
        label: 'Legal & Compliance',
        subDepartments: [
          'Corporate Legal',
          'Contract Management',
          'Regulatory Compliance',
          'Risk Management',
        ],
      },
      {
        id: 'dept-12',
        label: 'Internal Audit & Risk',
        subDepartments: [
          'Internal Audit',
          'Enterprise Risk Management (ERM)',
          'Fraud Detection',
          'Controls & Assurance',
        ],
      },
    ],
  },
  {
    id: 'pillar-4',
    label: 'Support & Administrative',
    departments: [
      {
        id: 'dept-13',
        label: 'Procurement / Purchasing',
        subDepartments: ['Vendor Sourcing', 'Contract Negotiation', 'Inventory Procurement'],
      },
      {
        id: 'dept-14',
        label: 'Administration',
        subDepartments: [
          'Facilities Management',
          'Office Administration',
          'Travel & Logistics',
          'Security',
        ],
      },
      {
        id: 'dept-15',
        label: 'Research & Development (R&D)',
        subDepartments: [
          'Innovation Labs',
          'Product Research',
          'Prototyping',
          'Emerging Technologies',
        ],
      },
      {
        id: 'dept-16',
        label: 'Strategy & Planning',
        subDepartments: [
          'Corporate Strategy',
          'Business Planning',
          'Mergers & Acquisitions (M&A)',
          'Transformation Office',
        ],
      },
    ],
  },
  {
    id: 'pillar-5',
    label: 'Advanced / Modern Enterprise',
    departments: [
      {
        id: 'dept-17',
        label: 'Digital Transformation',
        subDepartments: ['Automation (RPA)', 'AI Transformation', 'Process Digitization'],
      },
      {
        id: 'dept-18',
        label: 'ESG / Sustainability',
        subDepartments: [
          'Environmental Compliance',
          'Social Responsibility',
          'Governance Reporting',
        ],
      },
      {
        id: 'dept-19',
        label: 'Information Security (Cybersecurity)',
        subDepartments: [
          'Security Operations Center (SOC)',
          'Threat Intelligence',
          'Identity & Access Management',
        ],
      },
    ],
  },
];

export function getDepartmentsForPillar(pillarId) {
  const p = BUSINESS_ORG_PILLARS.find((x) => x.id === pillarId);
  return p ? p.departments : [];
}

export function getSubDepartmentsForDepartment(pillarId, departmentId) {
  const depts = getDepartmentsForPillar(pillarId);
  const d = depts.find((x) => x.id === departmentId);
  return d ? d.subDepartments : [];
}
