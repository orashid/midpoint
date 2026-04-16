import { useState, useEffect, useCallback } from 'react';
import { CachedPerson } from '../storage/types';
import { getSavedPeople, saveAllParticipants, deleteSavedPerson } from '../storage/repository';

export function useFavoritePeople() {
  const [people, setPeople] = useState<CachedPerson[]>([]);

  const refresh = useCallback(async () => {
    const saved = await getSavedPeople();
    setPeople(saved);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveParticipants = useCallback(
    async (participants: Array<{ name: string; address: string; lat: number; lng: number }>) => {
      await saveAllParticipants(participants);
      await refresh();
    },
    [refresh]
  );

  const removePerson = useCallback(
    async (name: string, address: string) => {
      await deleteSavedPerson(name, address);
      await refresh();
    },
    [refresh]
  );

  return { people, saveParticipants, removePerson, refresh };
}
