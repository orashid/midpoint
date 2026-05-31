/**
 * Component tests for the Restaurant Details modal.
 *
 * Critical regression: the visit-delete bug (cross icon was a no-op for
 * authenticated users because the visit's id was never threaded through).
 * The "deletes a visit (regression)" test below would have caught it.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('../../api/client', () => ({
  resolvePhotoUrl: (s: string | null | undefined) => (s ? `http://photo${s}` : null),
}));

import { RestaurantDetail } from '../RestaurantDetail';
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

function renderDetail(over: Partial<React.ComponentProps<typeof RestaurantDetail>> = {}) {
  const props = {
    visible: true,
    restaurant: mkSpot(),
    onClose: jest.fn(),
    onUpdateRating: jest.fn(),
    onUpdateCuisine: jest.fn(),
    onLogVisit: jest.fn(),
    onRemoveVisit: jest.fn(),
    onRemove: jest.fn(),
    ...over,
  };
  const utils = render(<RestaurantDetail {...props} />);
  return { ...utils, props };
}

describe('RestaurantDetail — visit deletion (regression)', () => {
  it('passes (placeId, date, id) to onRemoveVisit when the X is tapped on a visit with an id', () => {
    const { getAllByLabelText, props } = renderDetail({
      restaurant: mkSpot({ visits: [{ date: 1700000000000, id: 'visit-7' }] }),
    });

    const [deleteBtn] = getAllByLabelText('Delete visit');
    fireEvent.press(deleteBtn);

    expect(props.onRemoveVisit).toHaveBeenCalledWith('p1', 1700000000000, 'visit-7');
  });

  it('passes visitId=undefined for legacy local visits (no id) — date-only path', () => {
    const { getAllByLabelText, props } = renderDetail({
      restaurant: mkSpot({ visits: [{ date: 1700000000000 }] }),
    });

    fireEvent.press(getAllByLabelText('Delete visit')[0]);

    expect(props.onRemoveVisit).toHaveBeenCalledWith('p1', 1700000000000, undefined);
  });

  it('renders one delete button per visit', () => {
    const { getAllByLabelText } = renderDetail({
      restaurant: mkSpot({
        visits: [
          { date: 1, id: 'a' },
          { date: 3, id: 'c' },
          { date: 2, id: 'b' },
        ],
      }),
    });
    expect(getAllByLabelText('Delete visit')).toHaveLength(3);
  });

  it('sorts visits in date-desc order so the X buttons map to most-recent first', () => {
    const { getAllByLabelText, props } = renderDetail({
      restaurant: mkSpot({
        visits: [
          { date: 100, id: 'oldest' },
          { date: 300, id: 'newest' },
          { date: 200, id: 'middle' },
        ],
      }),
    });

    const buttons = getAllByLabelText('Delete visit');
    fireEvent.press(buttons[0]);
    expect(props.onRemoveVisit).toHaveBeenCalledWith('p1', 300, 'newest');

    fireEvent.press(buttons[2]);
    expect(props.onRemoveVisit).toHaveBeenLastCalledWith('p1', 100, 'oldest');
  });
});

describe('RestaurantDetail — visit history label', () => {
  it('shows "No visits logged yet" when the list is empty', () => {
    const { getByText } = renderDetail({ restaurant: mkSpot({ visits: [] }) });
    expect(getByText('No visits logged yet')).toBeTruthy();
  });

  it('shows the visit count in the section header', () => {
    const { getByText } = renderDetail({
      restaurant: mkSpot({
        visits: [
          { date: 1700000000000, id: 'a' },
          { date: 1700100000000, id: 'b' },
        ],
      }),
    });
    expect(getByText('Visit History (2)')).toBeTruthy();
  });
});

describe('RestaurantDetail — cuisine selection', () => {
  it('calls onUpdateCuisine when a cuisine chip is tapped', () => {
    const { getByText, props } = renderDetail();
    fireEvent.press(getByText('Thai'));
    expect(props.onUpdateCuisine).toHaveBeenCalledWith('p1', 'thai');
  });
});

describe('RestaurantDetail — remove restaurant', () => {
  it('confirms via Alert before calling onRemove', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText, props } = renderDetail();

    fireEvent.press(getByText('Remove from Our Spots'));

    expect(alertSpy).toHaveBeenCalled();
    expect(props.onRemove).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('invokes onRemove + onClose when the user confirms in the Alert', () => {
    let confirmCallback: (() => void) | null = null;
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      const remove = (buttons as any[]).find((b) => b.style === 'destructive');
      confirmCallback = remove.onPress;
    });

    const { getByText, props } = renderDetail();
    fireEvent.press(getByText('Remove from Our Spots'));

    expect(confirmCallback).not.toBeNull();
    confirmCallback!();

    expect(props.onRemove).toHaveBeenCalledWith('p1');
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('RestaurantDetail — null restaurant', () => {
  it('renders nothing when restaurant is null (no crash)', () => {
    const { toJSON } = renderDetail({ restaurant: null });
    expect(toJSON()).toBeNull();
  });
});
