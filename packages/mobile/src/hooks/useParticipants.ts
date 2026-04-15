import { useState, useCallback } from 'react';

export const DEFAULT_LABELS = ['You', 'Friend 1', 'Friend 2', 'Friend 3'];

export interface ParticipantEntry {
  id: string;
  name: string;
  defaultLabel: string;
  address: string;
  lat: number | null;
  lng: number | null;
  isValid: boolean;
}

function createWithLabel(index: number): ParticipantEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    name: '',
    defaultLabel: DEFAULT_LABELS[index] || `Friend ${index}`,
    address: '',
    lat: null,
    lng: null,
    isValid: false,
  };
}

export function useParticipants() {
  const [participants, setParticipants] = useState<ParticipantEntry[]>([
    createWithLabel(0),
    createWithLabel(1),
  ]);

  const addParticipant = useCallback(() => {
    setParticipants((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, createWithLabel(prev.length)];
    });
  }, []);

  const removeParticipant = useCallback((id: string) => {
    setParticipants((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const updateParticipant = useCallback((id: string, updates: Partial<ParticipantEntry>) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates };
        updated.isValid = !!(updated.name.trim() && updated.lat !== null && updated.lng !== null);
        return updated;
      })
    );
  }, []);

  // canSearch is true if 2+ participants have address text (name falls back to defaultLabel)
  const hasEnoughInput = participants.filter(
    (p) => p.address.trim().length >= 2
  ).length >= 2;

  const setFromCached = useCallback(
    (id: string, person: { name: string; address: string; lat: number; lng: number }) => {
      updateParticipant(id, {
        name: person.name,
        address: person.address,
        lat: person.lat,
        lng: person.lng,
        isValid: true,
      });
    },
    [updateParticipant]
  );

  const loadAll = useCallback(
    (entries: Array<{ name: string; address: string; lat: number; lng: number }>) => {
      setParticipants(
        entries.map((e, i) => ({
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          name: e.name,
          defaultLabel: DEFAULT_LABELS[i] || `Friend ${i}`,
          address: e.address,
          lat: e.lat,
          lng: e.lng,
          isValid: true,
        }))
      );
    },
    []
  );

  const validCount = participants.filter((p) => p.isValid).length;
  const canSearch = hasEnoughInput;

  return {
    participants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setFromCached,
    loadAll,
    validCount,
    canSearch,
  };
}
