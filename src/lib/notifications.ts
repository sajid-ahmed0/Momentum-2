
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications.');
    return false;
  }
  
  if (Notification.permission === 'granted') return true;
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const publicVapidKey = 'BJy-KX3sF3KI1Iuan-mNoWWqpbt3MEGVI6f_uPvvCoXRqtNbeTm5XrXVoIrSHJc-zYABT9gDOT-t8hWH9FMNf1M';
    
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // Try via ServiceWorker if available for better mobile support
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/manifest.json',
          badge: '/manifest.json',
          ...options
        } as any);
      });
    } else {
      try {
        new Notification(title, options);
      } catch (e) {
        // Fallback for some mobile browsers that require ServiceWorker
        console.warn('Direct notification failed, might need ServiceWorker:', e);
      }
    }
  }
}
