import { DEPT_ABBREVIATIONS } from '../constants';

export const getDeptAbbrev = (deptName) => {
  if (!deptName) return 'Room';
  return DEPT_ABBREVIATIONS[deptName] || deptName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
};

export const getDeptPresets = (deptName) => {
  const abbrev = getDeptAbbrev(deptName);
  return [
    `${abbrev} Lab 1`, `${abbrev} Lab 2`, `${abbrev} Lab 3`, `${abbrev} Seminar Hall`,
    `${abbrev} Staff Room`, `${abbrev} Server Room`,
    'Library', 'Cafeteria', 'Washroom A', 'Washroom B', 'Main Gate', 'Parking Area',
  ];
};

export const getFullDepartmentName = (deptOrAbbrev) => {
  if (!deptOrAbbrev) return "General Campus";
  const lookup = deptOrAbbrev.toUpperCase();
  const foundEntry = Object.entries(DEPT_ABBREVIATIONS).find(
    ([fullName, abbrev]) => abbrev === lookup || fullName.toUpperCase() === lookup
  );
  return foundEntry ? foundEntry[0] : deptOrAbbrev;
};

export const getDeptBannerStyle = (deptAbbrev) => {
  const styles = {
    'CS': { bg: 'linear-gradient(105deg, #0f172a, #1e3a8a, #3b82f6)' },
    'SW': { bg: 'linear-gradient(105deg, #064e3b, #047857, #10b981)' },
    'SE': { bg: 'linear-gradient(105deg, #064e3b, #047857, #10b981)' },
    'EE': { bg: 'linear-gradient(105deg, #78350f, #b45309, #f59e0b)' },
    'EL': { bg: 'linear-gradient(105deg, #4c1d95, #6d28d9, #8b5cf6)' },
    'ME': { bg: 'linear-gradient(105deg, #7f1d1d, #b91c1c, #ef4444)' },
    'CE': { bg: 'linear-gradient(105deg, #164e63, #0e7490, #06b6d4)' },
    'MTE': { bg: 'linear-gradient(105deg, #831843, #be185d, #ec4899)' },
    'BME': { bg: 'linear-gradient(105deg, #1e3a8a, #2563eb, #60a5fa)' },
    'TE': { bg: 'linear-gradient(105deg, #4a044e, #86198f, #d946ef)' },
    'TXE': { bg: 'linear-gradient(105deg, #14532d, #15803d, #4ade80)' },
    'CHE': { bg: 'linear-gradient(105deg, #713f12, #a16207, #facc15)' },
    'IE': { bg: 'linear-gradient(105deg, #1e293b, #334155, #64748b)' },
    'AE': { bg: 'linear-gradient(105deg, #171717, #404040, #737373)' },
    'CRP': { bg: 'linear-gradient(105deg, #0c4a6e, #0284c7, #38bdf8)' },
    'MME': { bg: 'linear-gradient(105deg, #450a0a, #991b1b, #f87171)' },
    'MNE': { bg: 'linear-gradient(105deg, #3f3f46, #52525b, #a1a1aa)' },
    'PNG': { bg: 'linear-gradient(105deg, #422006, #854d0e, #eab308)' },
    'BSCS': { bg: 'linear-gradient(105deg, #1e1b4b, #4338ca, #6366f1)' },
    'BSES': { bg: 'linear-gradient(105deg, #064e3b, #059669, #34d399)' },
    'BSM': { bg: 'linear-gradient(105deg, #0c4a6e, #0891b2, #22d3ee)' },
    'BSE': { bg: 'linear-gradient(105deg, #701a75, #a21caf, #e879f9)' },
    'BBA': { bg: 'linear-gradient(105deg, #7c2d12, #c2410c, #fb923c)' },
  };
  return styles[deptAbbrev] || { bg: 'linear-gradient(105deg, #0f172a, #1e3a8a, #3b82f6)' };
};

// ✅ BUG FIX #12: regex widened to {2,4} for BS programs (BSCS, BSES, BSM, BSE, BBA)
export const extractDeptAbbrev = (rollNumber) => {
  const m = rollNumber.match(/^\d{2}([A-Z]{2,4})\d+$/);
  return m ? m[1] : 'CS';
};