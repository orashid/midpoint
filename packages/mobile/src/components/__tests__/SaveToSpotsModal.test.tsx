import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SaveToSpotsModal } from '../SaveToSpotsModal';

const baseRestaurant = {
  placeId: 'p1',
  name: 'Sushi Hana',
  address: '1 Market',
  lat: 0,
  lng: 0,
  photoUrl: 'https://example.com/photo.jpg',
  phone: '+1-555-0100',
  types: [] as string[],
};

describe('SaveToSpotsModal', () => {
  it('renders nothing when restaurant is null', () => {
    const { toJSON } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={null}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('shows restaurant name and address when visible', () => {
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={baseRestaurant}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );
    expect(getByText('Sushi Hana')).toBeTruthy();
    expect(getByText('1 Market')).toBeTruthy();
  });

  it('auto-selects "japanese" cuisine when types includes sushi/ramen', () => {
    const onSave = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={{ ...baseRestaurant, types: ['sushi'] }}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ cuisineType: 'japanese' })
    );
  });

  it('falls back to "other" when no keywords match', () => {
    const onSave = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={{ ...baseRestaurant, types: ['cafe', 'food'] }}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ cuisineType: 'other' })
    );
  });

  it('lets the user override the detected cuisine before saving', () => {
    const onSave = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={{ ...baseRestaurant, types: ['sushi'] }}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );
    fireEvent.press(getByText('Thai'));
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ cuisineType: 'thai' })
    );
  });

  it('saves with familyRating=3 default and forwards photoUrl + phone', () => {
    const onSave = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={baseRestaurant}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        familyRating: 3,
        photoUrl: 'https://example.com/photo.jpg',
        phone: '+1-555-0100',
      })
    );
  });

  it('coerces missing phone to null (not undefined) so the cache layer is happy', () => {
    const onSave = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={{ ...baseRestaurant, phone: null }}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ phone: null }));
  });

  it('closes the modal after saving', () => {
    const onClose = jest.fn();
    const { getByText, getAllByText } = render(
      <SaveToSpotsModal
        visible={true}
        restaurant={baseRestaurant}
        onSave={jest.fn()}
        onClose={onClose}
      />
    );
    // "Save to Our Spots" is both the title and the button — the button is last.
    const saveTargets = getAllByText('Save to Our Spots');
    fireEvent.press(saveTargets[saveTargets.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
