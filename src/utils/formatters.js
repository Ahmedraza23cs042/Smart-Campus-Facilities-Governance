export const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

export const getNotificationIcon = (title) => {
  if (!title) return '🔔';
  const t = title.toLowerCase();
  if (t.includes('harassment') || t.includes('confidential')) return '🛡️';
  if (t.includes('resolved') || t.includes('fixed')) return '✅';
  if (t.includes('new issue') || t.includes('new ticket') || t.includes('reported')) return '📋';
  if (t.includes('comment') || t.includes('message') || t.includes('reply')) return '💬';
  if (t.includes('escalat')) return '⚠️';
  return '🔔';
};