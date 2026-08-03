let deferredPrompt: any;

export const setupPWA = () => {
  // Only register service worker in production
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  } else if (!import.meta.env.PROD && 'serviceWorker' in navigator) {
    // Unregister any existing service workers in development to prevent caching issues
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('SW unregistered for development to prevent caching issues');
      }
    });
  }


  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button/banner
    showInstallPrompt();
  });
};

export const installApp = async () => {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  }
  
  deferredPrompt = null;
  return outcome === 'accepted';
};

export const showInstallPrompt = () => {
  // This will be called from components
  const event = new CustomEvent('showInstallPrompt');
  window.dispatchEvent(event);
};
