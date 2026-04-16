import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface HelpItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const HELP_SECTIONS: Array<{ heading: string; items: HelpItem[] }> = [
  {
    heading: 'Adding Restaurants',
    items: [
      {
        icon: 'add-circle',
        title: 'Add Manually',
        body: 'Tap the + button at the bottom-right to search for a restaurant by name. Select one from the results, choose its cuisine type and give it a family rating, then save it to your list.',
      },
      {
        icon: 'heart',
        title: 'Save from Search Results',
        body: 'When using the Midpoint tab to find meeting spots, tap the heart icon on any restaurant result to save it to Our Spots with a cuisine type and rating.',
      },
    ],
  },
  {
    heading: 'Logging Visits',
    items: [
      {
        icon: 'calendar',
        title: 'Log a Visit',
        body: 'Tap "Log Visit" on any restaurant card to record when you ate there. A date picker appears defaulting to today — you can also pick a past date to backfill your history. Tap Log Visit again to add more dates.',
      },
      {
        icon: 'close-circle-outline',
        title: 'Remove a Visit',
        body: 'Open a restaurant\'s detail page and find the visit in the Visit History section. Tap the (x) next to any visit entry to remove it.',
      },
    ],
  },
  {
    heading: 'Getting Suggestions',
    items: [
      {
        icon: 'shuffle',
        title: 'Pick for Me',
        body: 'Tap "Pick for me" to get a smart suggestion. The algorithm favors restaurants you haven\'t visited recently and weighs higher-rated spots more. Places visited in the last 14 days are excluded for variety.',
      },
      {
        icon: 'sync',
        title: 'Spin the Wheel',
        body: 'Tap "Spin the wheel" for a fun, random pick. The wheel spins through your eligible restaurants and lands on a winner. You need at least 2 eligible restaurants to spin.',
      },
    ],
  },
  {
    heading: 'Managing Your List',
    items: [
      {
        icon: 'create-outline',
        title: 'Edit Details',
        body: 'Tap any restaurant card to open its detail page. From there you can change the cuisine type, update the family rating (1-5 stars), and view the full visit history.',
      },
      {
        icon: 'swap-vertical',
        title: 'Sorting',
        body: 'Tap the sort button above the restaurant list to cycle through: Newest (date added), Most Visited (visit count), and A-Z (alphabetical).',
      },
      {
        icon: 'open-outline',
        title: 'Google Maps',
        body: 'In the restaurant detail page, tap "View on Google Maps" to see the restaurant\'s location, hours, reviews, and more.',
      },
      {
        icon: 'trash-outline',
        title: 'Remove a Restaurant',
        body: 'Open the restaurant detail page and scroll to the bottom. Tap "Remove from Our Spots" to delete it from your list.',
      },
    ],
  },
];

export function OurSpotsHelpModal({ visible, onClose }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const toggleItem = (key: string) => {
    setExpandedIndex(expandedIndex === key ? null : key);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Our Spots Help</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {HELP_SECTIONS.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              {section.items.map((item) => {
                const key = `${section.heading}-${item.title}`;
                const isExpanded = expandedIndex === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.item}
                    onPress={() => toggleItem(key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemHeader}>
                      <View style={styles.itemIconWrap}>
                        <Ionicons name={item.icon} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textLight}
                      />
                    </View>
                    {isExpanded && (
                      <Text style={styles.itemBody}>{item.body}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  itemBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingLeft: 40,
  },
});
