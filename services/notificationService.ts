import { auth } from '@/firebase';

const CLOUD_FUNCTION_URL = 'https://us-central1-booking-cd20f.cloudfunctions.net/sendNotification';

interface SendNotificationParams {
  deviceToken: string;
  title: string;
  body: string;
  data?: {}
}

export const sendNotification = async ({
  deviceToken,
  title,
  body,
  data,
}: SendNotificationParams): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not signed in');

  const idToken = await user.getIdToken();

  try {
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        token: deviceToken,
        title,
        body,
        data,
      }),
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