import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { autocomplete, geocode, AutocompleteResult } from '../api/client';
import { CachedPerson } from '../storage/types';
import { ParticipantEntry } from '../hooks/useParticipants';

interface Props {
  participant: ParticipantEntry;
  index: number;
  canRemove: boolean;
  savedPeople: CachedPerson[];
  onUpdate: (id: string, updates: Partial<ParticipantEntry>) => void;
  onSetFromCached: (id: string, person: CachedPerson) => void;
  onRemove: (id: string) => void;
}

export function ParticipantInput({
  participant,
  index,
  canRemove,
  savedPeople,
  onUpdate,
  onSetFromCached,
  onRemove,
}: Props) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [peopleSuggestions, setPeopleSuggestions] = useState<CachedPerson[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleNameChange = useCallback(
    (text: string) => {
      onUpdate(participant.id, { name: text });
      // Show saved people that match
      if (text.length >= 1) {
        const matches = savedPeople.filter((p) =>
          p.name.toLowerCase().includes(text.toLowerCase())
        );
        setPeopleSuggestions(matches.slice(0, 3));
      } else {
        setPeopleSuggestions([]);
      }
    },
    [participant.id, savedPeople, onUpdate]
  );

  const handleAddressChange = useCallback(
    (text: string) => {
      onUpdate(participant.id, { address: text, lat: null, lng: null });
      setShowSuggestions(true);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.length < 3) {
        setSuggestions([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        try {
          const results = await autocomplete(text);
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        }
      }, 300);
    },
    [participant.id, onUpdate]
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: AutocompleteResult) => {
      setShowSuggestions(false);
      setSuggestions([]);
      setGeocoding(true);
      onUpdate(participant.id, { address: suggestion.description });

      try {
        const result = await geocode({ placeId: suggestion.placeId });
        onUpdate(participant.id, {
          address: result.formattedAddress,
          lat: result.lat,
          lng: result.lng,
        });
      } catch {
        onUpdate(participant.id, { lat: null, lng: null });
      }
      setGeocoding(false);
    },
    [participant.id, onUpdate]
  );

  const handleAddressBlur = useCallback(async () => {
    setTimeout(() => setShowSuggestions(false), 200);
    // If user typed an address but didn't pick a suggestion, try geocoding the raw text
    if (participant.address.trim().length >= 2 && participant.lat === null) {
      setGeocoding(true);
      try {
        const result = await geocode({ address: participant.address.trim() });
        onUpdate(participant.id, {
          address: result.formattedAddress,
          lat: result.lat,
          lng: result.lng,
        });
      } catch {
        // Couldn't geocode — leave as-is
      }
      setGeocoding(false);
    }
  }, [participant.id, participant.address, participant.lat, onUpdate]);

  const handleSelectPerson = useCallback(
    (person: CachedPerson) => {
      onSetFromCached(participant.id, person);
      setPeopleSuggestions([]);
    },
    [participant.id, onSetFromCached]
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
        <View style={styles.inputs}>
          <TextInput
            style={[styles.nameInput, !participant.name && styles.nameDefault]}
            value={participant.name}
            onChangeText={handleNameChange}
            placeholder={participant.defaultLabel}
            placeholderTextColor={colors.textLight}
          />
          <View style={styles.addressRow}>
            <TextInput
              style={[styles.addressInput, participant.isValid && styles.addressValid]}
              value={participant.address}
              onChangeText={handleAddressChange}
              placeholder="City, zip code, or address"
              placeholderTextColor={colors.textLight}
              onBlur={handleAddressBlur}
            />
            {geocoding && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
            {participant.isValid && !geocoding && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} style={styles.checkmark} />
            )}
          </View>
        </View>
        {canRemove && (
          <TouchableOpacity onPress={() => onRemove(participant.id)} style={styles.removeBtn}>
            <Ionicons name="close-circle" size={22} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* People suggestions */}
      {peopleSuggestions.length > 0 && (
        <View style={styles.peopleSuggestions}>
          {peopleSuggestions.map((person) => (
            <TouchableOpacity
              key={person.name + person.address}
              style={styles.personChip}
              onPress={() => handleSelectPerson(person)}
            >
              <Ionicons name="person" size={14} color={colors.primary} />
              <Text style={styles.personChipText}>{person.name}</Text>
              <Text style={styles.personChipAddress} numberOfLines={1}>
                {person.address.split(',')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Address autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s.placeId}
              style={styles.suggestionItem}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {s.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  indexText: { color: colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  inputs: { flex: 1 },
  nameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  nameDefault: {
    color: colors.textLight,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  addressValid: { borderBottomColor: colors.success },
  spinner: { marginLeft: spacing.xs },
  checkmark: { marginLeft: spacing.xs },
  removeBtn: { padding: spacing.xs, marginLeft: spacing.xs },
  peopleSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 36,
    marginTop: spacing.xs,
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  personChipText: { fontSize: 13, fontWeight: '600', color: colors.primary, marginLeft: 4 },
  personChipAddress: { fontSize: 11, color: colors.textSecondary, marginLeft: 4, maxWidth: 100 },
  suggestionsContainer: {
    marginLeft: 36,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  suggestionText: { fontSize: 14, color: colors.text, marginLeft: spacing.sm, flex: 1 },
});
