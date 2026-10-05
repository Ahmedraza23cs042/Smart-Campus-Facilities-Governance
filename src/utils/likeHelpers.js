// ✅ Part A Fix: Safe LocalStorage Parser
export const safeParseLikes = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('local_upvotes') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};
