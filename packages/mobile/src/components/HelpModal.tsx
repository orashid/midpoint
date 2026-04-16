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
    heading: 'Getting Started',
    items: [
      {
        icon: 'people',
        title: 'Adding People',
        body: 'Enter at least 2 people with their locations (city, zip code, or full address). Names are optional — they default to "You", "Friend 1", etc. Tap "Add person" to add up to 4 participants.',
      },
      {
        icon: 'cafe',
        title: 'Meeting Over?',
        body: 'Choose Coffee, Lunch, or Dinner. This determines what type of places we search for — cafes, restaurants, or dinner spots.',
      },
      {
        icon: 'filter',
        title: 'Filters',
        body: 'Tap "Filters" to expand. Select dietary restrictions (vegetarian, vegan, gluten-free, halal, kosher) and exclude cuisines you don\'t want (Chinese, Indian, Mexican, Italian, Japanese, Thai, Korean, Vietnamese, Mediterranean, American, or Fast Food).',
      },
      {
        icon: 'search',
        title: 'Finding a Spot',
        body: 'Tap "Find a Spot" to search. We calculate the midpoint between everyone, find nearby restaurants, and rank them by fairness of driving time so nobody drives way more than anyone else. Non-restaurant venues (sports complexes, malls, etc.) are automatically filtered out.',
      },
    ],
  },
  {
    heading: 'Results',
    items: [
      {
        icon: 'map',
        title: 'Map View',
        body: 'The map shows participant locations (blue pins), the midpoint (gray pin), and restaurants (red pins). Tap a restaurant pin to see its name.',
      },
      {
        icon: 'list',
        title: 'Restaurant Cards',
        body: 'Each card shows the restaurant name, rating, price level, and drive time from each participant. Results are ranked by fairness — the most equitable option appears first. Tap a card to view full restaurant details (reviews, hours, phone, photos) on Google Maps.',
      },
      {
        icon: 'create-outline',
        title: 'Modify Search',
        body: 'When viewing results, a floating "Modify Search" button appears. Tap it to scroll back to the top and adjust your inputs. Your previous search parameters are preserved so you can tweak and re-search. The button disappears once you\'re back at the top.',
      },
    ],
  },
  {
    heading: 'Time-Saving Features',
    items: [
      {
        icon: 'time',
        title: 'Recent Searches',
        body: 'Your last searches appear as cards at the top of the screen. Tap one to instantly re-run that exact search — same people, same meal type, same filters. One tap and you\'re done. If you search with the same group again, the existing entry is updated rather than creating a duplicate. Long-press a card to remove it.',
      },
      {
        icon: 'bookmark',
        title: 'Pinning Searches',
        body: 'Tap the bookmark icon on a recent search card to pin it. Pinned searches stay at the top of your recents and won\'t get pushed out as you do more searches. Great for groups you meet with regularly.',
      },
      {
        icon: 'flash',
        title: 'Quick Add',
        body: 'After your first search, people you\'ve searched with appear as "Quick add" chips above the participant inputs. Tap a chip to instantly fill in that person\'s name and address — no retyping. Long-press a chip to remove that person.',
      },
      {
        icon: 'person',
        title: 'People Suggestions',
        body: 'When typing a name, previously searched people that match will appear as suggestions. Tap one to auto-fill their name and address.',
      },
      {
        icon: 'settings',
        title: 'Saved Preferences',
        body: 'Your last meal type and dietary filters are automatically remembered between sessions. Open the app and they\'re already set the way you left them.',
      },
    ],
  },
  {
    heading: 'Our Spots',
    items: [
      {
        icon: 'heart',
        title: 'Saving Restaurants',
        body: 'Build a family restaurant list two ways: tap the heart icon on any search result to save it, or go to the Our Spots tab and tap the + button to search and add restaurants manually. Each saved spot gets a cuisine type and family rating.',
      },
      {
        icon: 'shuffle',
        title: 'Get a Suggestion',
        body: 'Tap "Pick for me" on the Our Spots tab to get a smart suggestion. The algorithm favors restaurants you haven\'t visited recently and weighs higher-rated spots more. Restaurants visited in the last 14 days are excluded so you get variety.',
      },
      {
        icon: 'sync',
        title: 'Spin the Wheel',
        body: 'Can\'t decide? Tap "Spin the wheel" for a fun, random pick from your eligible restaurants. The wheel spins with a satisfying animation and picks a winner. You need at least 2 eligible restaurants to spin.',
      },
      {
        icon: 'checkmark-circle',
        title: 'Logging Visits',
        body: 'Tap "We ate here" on any restaurant card or in the detail view to log a visit. Visit history helps the suggestion engine avoid recommending places you just went to and builds a record of your family\'s dining history.',
      },
      {
        icon: 'star',
        title: 'Managing Your List',
        body: 'Tap any restaurant card to see full details. From there you can update the family rating (1-5 stars), view visit history, open the restaurant in Google Maps, or remove it from your list. Use the cuisine filter chips and sort button to find spots quickly.',
      },
    ],
  },
  {
    heading: 'Tips',
    items: [
      {
        icon: 'location',
        title: 'Addresses',
        body: 'You don\'t need exact addresses. A city name or zip code works fine — we\'ll use the center of that area. For more precise results, use a full street address.',
      },
      {
        icon: 'checkmark-circle',
        title: 'Green Checkmark',
        body: 'A green checkmark next to an address means it has been successfully located on the map. If you don\'t see one, try a more specific address.',
      },
      {
        icon: 'help-circle',
        title: 'Getting Help',
        body: 'Tap the (?) icon in the top-right corner of the home screen at any time to open this help guide.',
      },
    ],
  },
];

export function HelpModal({ visible, onClose }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null);

  const toggleItem = (key: string) => {
    setExpandedIndex(expandedIndex === key ? null : key);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>How to Use Midpoint</Text>
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

          <View style={styles.footer}>
            <Ionicons name="heart" size={16} color={colors.error} />
            <Text style={styles.footerText}>
              Built to make meeting up easy
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
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
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    paddingLeft: 40,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 13,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
});
