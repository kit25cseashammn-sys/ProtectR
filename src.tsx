import { useState, useCallback, useEffect } from 'react';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { HomeScreen } from '@/components/HomeScreen';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { useEmergency } from '@/hooks/useEmergency';
import { EmergencyContact } from '@/types/emergency';
import { toast } from 'sonner';

const Index = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage('sos-onboarding', false);
  const [userName, setUserName] = useLocalStorage('sos-username', '');
  const [contacts, setContacts] = useLocalStorage<EmergencyContact[]>('sos-contacts', []);
  const [shakeEnabled, setShakeEnabled] = useState(true);

  const { location, permissionGranted, updateLocation, requestPermission } = useGeolocation();

  const { startCountdown, isActivating, countdown, cancelCountdown } = useEmergency({
    contacts,
    location,
    userName,
  });

  const handleShake = useCallback(() => {
    if (contacts.length === 0) {
      toast.error('No emergency contacts configured');
      return;
    }
    toast.warning('Shake detected!', { description: 'Initiating emergency SOS...' });
    startCountdown();
  }, [contacts, startCountdown]);

  const { requestMotionPermission } = useShakeDetection({
    onShake: handleShake,
    enabled: shakeEnabled && hasCompletedOnboarding && !isActivating,
  });

  const handleOnboardingComplete = (name: string) => {
    setUserName(name);
    setHasCompletedOnboarding(true);
    toast.success('Welcome to Emergency SOS', {
      description: 'Add your emergency contacts to get started.',
    });
  };

  const handleAddContact = useCallback((contact: Omit<EmergencyContact, 'id'>) => {
    const newContact: EmergencyContact = {
      ...contact,
      id: Date.now().toString(),
    };
    setContacts((prev) => [...prev, newContact]);
    toast.success('Contact added', { description: `${contact.name} has been added.` });
  }, [setContacts]);

  const handleSetPrimary = useCallback((id: string) => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        isPrimary: c.id === id,
      }))
    );
    toast.success('Primary contact updated');
  }, [setContacts]);

  const handleRemoveContact = useCallback((id: string) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      // If we removed the primary, make the first one primary
      if (filtered.length > 0 && !filtered.some((c) => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
    toast.success('Contact removed');
  }, [setContacts]);

  if (!hasCompletedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onRequestLocationPermission={requestPermission}
        onRequestMotionPermission={requestMotionPermission}
      />
    );
  }

  return (
    <HomeScreen
      contacts={contacts}
      location={location}
      locationEnabled={permissionGranted}
      userName={userName}
      shakeEnabled={shakeEnabled}
      onAddContact={handleAddContact}
      onSetPrimary={handleSetPrimary}
      onRemoveContact={handleRemoveContact}
      onRefreshLocation={updateLocation}
    />
  );
};

export default Index;
