import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SpotCard } from '../SpotCard';
import type { SavedRestaurant } from '../../storage/types';

const mkSpot = (over: Partial<SavedRestaurant> = {}): SavedRestaurant => ({
  placeId: 'p1',
  name: 'Pizza Place',
  address: '1 Main',
  lat: 37.7749,
  lng: -122.4194,
  cuisineType: 'italian',
  familyRating: 4,
  visits: [],
  dateAdded: 0,
  ...over,
});

describe('SpotCard', () => {
  it('shows "Never visited" when there are no visits', () => {
    const { getByText } = render(
      <SpotCard spot={mkSpot()} onPress={jest.fn()} onLogVisit={jest.fn()} />
    );
    expect(getByText('Never visited')).toBeTruthy();
  });

  it('shows the visit count when visits exist', () => {
    const visits = [
      { date: Date.now() - 1000 },
      { date: Date.now() - 2000 },
    ];
    const { getByText } = render(
      <SpotCard spot={mkSpot({ visits })} onPress={jest.fn()} onLogVisit={jest.fn()} />
    );
    expect(getByText('2 visits')).toBeTruthy();
  });

  it('shows "Today" for a visit logged today', () => {
    const { getByText } = render(
      <SpotCard
        spot={mkSpot({ visits: [{ date: Date.now() }] })}
        onPress={jest.fn()}
        onLogVisit={jest.fn()}
      />
    );
    expect(getByText('Today')).toBeTruthy();
  });

  it('omits distance when home coords are not provided', () => {
    const { queryByText } = render(
      <SpotCard spot={mkSpot()} onPress={jest.fn()} onLogVisit={jest.fn()} />
    );
    expect(queryByText(/\d+\.\d+ mi/)).toBeNull();
  });

  it('shows the formatted distance when home coords are provided', () => {
    const { getByText } = render(
      <SpotCard
        spot={mkSpot()}
        homeLat={37.7849} // ~1.1 km north
        homeLng={-122.4194}
        onPress={jest.fn()}
        onLogVisit={jest.fn()}
      />
    );
    expect(getByText(/\d+\.\d+ mi|\d+ m/)).toBeTruthy();
  });

  it('calls onPress when the card is tapped (and not onLogVisit)', () => {
    const onPress = jest.fn();
    const onLogVisit = jest.fn();
    const { getByText } = render(
      <SpotCard spot={mkSpot()} onPress={onPress} onLogVisit={onLogVisit} />
    );
    fireEvent.press(getByText('Pizza Place'));
    expect(onPress).toHaveBeenCalled();
    expect(onLogVisit).not.toHaveBeenCalled();
  });

  it('calls onLogVisit when the Log Visit chip is tapped (and stops propagation to onPress)', () => {
    const onPress = jest.fn();
    const onLogVisit = jest.fn();
    const { getByText } = render(
      <SpotCard spot={mkSpot()} onPress={onPress} onLogVisit={onLogVisit} />
    );
    // The inner Log Visit button calls e.stopPropagation(), so pass an
    // event-like object with a stub method.
    fireEvent(getByText('Log Visit'), 'press', { stopPropagation: jest.fn() });
    expect(onLogVisit).toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
