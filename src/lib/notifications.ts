export interface VolunteerChangeNotification {
  venue: string;
  date: string;
  time: string;
  added: string[];
  removed: string[];
}

export async function notifyVolunteerChanges(data: VolunteerChangeNotification): Promise<boolean> {
  const { venue, date, time, added, removed } = data;
  if ((!added || added.length === 0) && (!removed || removed.length === 0)) {
    return true;
  }

  try {
    const res = await fetch('/api/notify-volunteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venue,
        date,
        time,
        added,
        removed,
      }),
    });

    if (!res.ok) {
      console.warn('[Notification] /api/notify-volunteer status:', res.status);
      return false;
    }

    const json = await res.json();
    console.log('[Notification] Notificação enviada:', json);
    return true;
  } catch (err) {
    console.warn('[Notification] Falha ao enviar notificação:', err);
    return false;
  }
}
