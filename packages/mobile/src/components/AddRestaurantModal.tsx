import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { searchPlaces, PlaceSearchResult } from '../api/client';

interface Props {
  visible: boolean;
  homeLat?: number;
  homeLng?: number;
  onSelect: (restaurant: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
    photoUrl?: string | null;
  }) => void;
  onClose: () => void;
}

export function AddRestaurantModal({ visible, homeLat, homeLng, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      setSearchError(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const data = await searchPlaces(text, homeLat, homeLng);
          setResults(data);
        } catch (e: any) {
          setResults([]);
          setSearchError(e.message || 'Search failed');
        }
        setSearching(false);
      }, 300);
    },
    [homeLat, homeLng]
  );

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearchError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Restaurant</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search for a restaurant..."
            placeholderTextColor={colors.textLight}
            autoFocus
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.placeId}
          // Without this, the first tap on a result just dismisses the
          // keyboard (because the search TextInput is focused) and only
          // the second tap actually selects the restaurant.
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => {
                onSelect(item);
                setQuery('');
                setResults([]);
              }}
            >
              <View style={styles.resultIcon}>
                <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.resultAddress} numberOfLines={1}>{item.address}</Text>
              </View>
              {item.rating > 0 && (
                <View style={styles.resultRating}>
                  <Ionicons name="star" size={12} color={colors.accent} />
                  <Text style={styles.resultRatingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length >= 2 && !searching ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {searchError ? `Error: ${searchError}` : 'No restaurants found'}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: { padding: spacing.xs },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  list: { paddingHorizontal: spacing.md },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600', color: colors.text },
  resultAddress: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  resultRating: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  resultRatingText: { fontSize: 12, color: colors.textSecondary, marginLeft: 2 },
  empty: { alignItems: 'center', padding: spacing.xl },
  emptyText: { fontSize: 14, color: colors.textLight },
});
