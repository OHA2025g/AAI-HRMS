import { toast } from 'sonner';

export function fullTakeUrl(takeUrl) {
  if (!takeUrl) return '';
  if (takeUrl.startsWith('http')) return takeUrl;
  return `${window.location.origin}${takeUrl}`;
}

export async function copyTakeUrl(takeUrl, label = 'Candidate link copied') {
  const full = fullTakeUrl(takeUrl);
  if (!full) {
    toast.error('No assessment link available');
    return false;
  }
  try {
    await navigator.clipboard.writeText(full);
    toast.success(label);
    return true;
  } catch {
    toast.error('Could not copy link');
    return false;
  }
}
