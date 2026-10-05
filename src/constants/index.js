// ✅ Static constants — no dependencies on React or app state

export const CHART_COLORS = ['#1e3a8a', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export const DEPT_ABBREVIATIONS = {
  'Computer Systems Engineering': 'CS',
  'Software Engineering': 'SE',
  'Electrical Engineering': 'EE',
  'Electronics Engineering': 'EL',
  'Mechanical Engineering': 'ME',
  'Civil Engineering': 'CE',
  'Chemical Engineering': 'CHE',
  'Industrial Engineering': 'IE',
  'Mechatronic Engineering': 'MTE',
  'Bio-Medical Engineering': 'BME',
  'Telecommunication Engineering': 'TE',
  'Textile Engineering': 'TXE',
  'Mining Engineering': 'MNE',
  'Petroleum And Natural Gas Engineering': 'PNG',
  'Metallurgy And Materials Engineering': 'MME',
  'Architecture Engineering': 'AE',
  'City And Regional Planning': 'CRP',
  // ✅ BS Programs
  'BS Computer Science (BSCS)': 'BSCS',
  'BS Environmental Science (BSES)': 'BSES',
  'BS Mathematics (BSM)': 'BSM',
  'Bachelor of Studies in English (BSE)': 'BSE',
  'Bachelor of Business Administration (BBA)': 'BBA',
};

// ✅ Department banner images — drop file in /public with these names and it auto-appears.
// Any dept without an image file will simply skip rendering (no broken icon).
export const DEPT_BANNER_IMAGES = {
  'CS': '/cs_pic.png',
  'SE': '/se_pic.jpg',
  'EE': '/ee_pic.jpg',
  'EL': '/el_pic.jpg',
  'ME': '/me_pic.jpg',
  'CE': '/ce_pic.jpg',
  'CHE': '/che_pic.jpg',
  'IE': '/ie_pic.jpg',
  'MTE': '/mte_pic.jpg',
  'BME': '/bme_pic.jpg',
  'TE': '/te_pic.jpg',
  'TXE': '/txe_pic.jpg',
  'MNE': '/mne_pic.jpg',
  'PNG': '/png_pic.jpg',
  'MME': '/mme_pic.jpg',
  'AE': '/ae_pic.jpg',
  'CRP': '/crp_pic.jpg',
  'BSCS': '/bscs_pic.jpg',
  'BSES': '/bses_pic.jpg',
  'BSM': '/bsm_pic.jpg',
  'BSE': '/bse_pic.jpg',
  'BBA': '/bba_pic.jpg',
};

export const universityDepartments = [
  "Architecture Engineering", "Basic Sciences And Related Studies", "Bio-Medical Engineering",
  "Chemical Engineering", "City And Regional Planning", "Civil Engineering",
  "Computer Systems Engineering", "Electrical Engineering", "Electronics Engineering",
  "Industrial Engineering", "Mechanical Engineering", "Mechatronic Engineering",
  "Metallurgy And Materials Engineering", "Mining Engineering", "Petroleum And Natural Gas Engineering",
  "Software Engineering", "Telecommunication Engineering", "Textile Engineering",
  "BS Computer Science (BSCS)", "BS Environmental Science (BSES)", "BS Mathematics (BSM)",
  "Bachelor of Studies in English (BSE)", "Bachelor of Business Administration (BBA)"
];