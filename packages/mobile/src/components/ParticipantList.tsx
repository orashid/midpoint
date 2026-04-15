import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParticipantInput } from './ParticipantInput';
import { ParticipantEntry } from '../hooks/useParticipants';
import { CachedPerson } from '../storage/types';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface Props {
  participants: ParticipantEntry[];
  savedPeople: CachedPerson[];
  onUpdate: (id: string, updates: Partial<ParticipantEntry>) => void;
  onSetFromCached: (id: string, person: CachedPerson) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onRemovePerson: (name: string, address: string) => void;
}

export function ParticipantList({
  participants,
  savedPeople,
  onUpdate,
  onSetFromCached,
  onRemove,
  onAdd,
  onRemovePerson,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Who's meeting?</Text>

      {/* Quick-add chips for frequent people */}
      {savedPeople.length > 0 && (
        <View style={styles.quickAddRow}>
          <Text style={styles.quickAddLabel}>Quick add:</Text>
          {savedPeople.slice(0, 4).map((person) => (
            <TouchableOpacity
              key={person.name + person.address}
              style={styles.quickAddChip}
              onPress={() => {
                // Find first empty participant slot
                const empty = participants.find((p) => !p.name && !p.address);
                if (empty) {
                  onSetFromCached(empty.id, person);
                } else if (participants.length < 4) {
                  onAdd();
                  // Will fill on next render
                }
              }}
              onLongPress={() => {
                Alert.alert('Remove Entry', `Remove ${person.name} from quick add?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => onRemovePerson(person.name, person.address) },
                ]);
              }}
            >
              <Text style={styles.quickAddChipText}>{person.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {participants.map((p, i) => (
        <ParticipantInput
          key={p.id}
          participant={p}
          index={i}
          canRemove={participants.length > 2}
          savedPeople={savedPeople}
          onUpdate={onUpdate}
          onSetFromCached={onSetFromCached}
          onRemove={onRemove}
        />
      ))}

      {participants.length < 4 && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Add person</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  quickAddLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  quickAddChip: {
    backgroundColor: colors.accent + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  quickAddChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
