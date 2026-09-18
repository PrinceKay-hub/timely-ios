import { auth } from '@/firebase';

const CLOUD_FUNCTION_URL = 'https://us-central1-booking-cd20f.cloudfunctions.net/sendNotification';

interface SendNotificationParams {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  /**
   * The total unread count for the RECIPIENT.
   * - Pass a number to set the badge.
   * - Omit entirely to leave the current badge unchanged on iOS.
   * - Pass 0 to clear the badge.
   */
  badge?: number;
}

export const sendNotification = async ({
  deviceToken,
  title,
  body,
  data,
  badge,
}: SendNotificationParams): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not signed in');

  const idToken = await user.getIdToken();

  // Only include `badge` in the payload if it's a valid number.
  // Sending `badge: undefined` would serialize to nothing anyway,
  // but being explicit avoids surprises.
  const payload: Record<string, unknown> = {
    token: deviceToken,
    title,
    body,
    data,
  };

  if (typeof badge === 'number' && Number.isFinite(badge) && badge >= 0) {
    payload.badge = Math.floor(badge);
  }

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send notification: ${errorText}`);
    }
  } catch (error) {
    console.error('Error calling notification function:', error);
    throw error;
  }
};