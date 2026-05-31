import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

jest.mock('../../api/client', () => ({
  autocomplete: jest.fn(),
  geocode: jest.fn(),
}));

import * as apiClient from '../../api/client';
import { ParticipantInput } from '../ParticipantInput';
import type { ParticipantEntry } from '../../hooks/useParticipants';

const mkParticipant = (over: Partial<ParticipantEntry> = {}): ParticipantEntry => ({
  id: 'pa1',
  name: '',
  defaultLabel: 'You',
  address: '',
  placeId: undefined,
  lat: null,
  lng: null,
  isValid: false,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ParticipantInput — name suggestions from saved people', () => {
  it('shows up to 3 saved people whose name matches what the user typed', () => {
    const onUpdate = jest.fn();
    const onSetFromCached = jest.fn();
    const savedPeople = [
      { name: 'Alice', address: '1 a', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
      { name: 'Alex', address: '2 b', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
      { name: 'Aaron', address: '3 c', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
      { name: 'Andy', address: '4 d', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
      { name: 'Bob', address: '5 e', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
    ];
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={savedPeople}
        onUpdate={onUpdate}
        onSetFromCached={onSetFromCached}
        onRemove={jest.fn()}
      />
    );

    fireEvent.changeText(getByPlaceholderText('You'), 'A');
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Alex')).toBeTruthy();
    expect(getByText('Aaron')).toBeTruthy();
    expect(queryByText('Andy')).toBeNull(); // capped at 3
    expect(queryByText('Bob')).toBeNull();
  });

  it('calls onSetFromCached when a saved person chip is tapped', () => {
    const onSetFromCached = jest.fn();
    const savedPeople = [
      { name: 'Alice', address: '1 Main', useCount: 1, lastUsed: 0, lat: 1, lng: 2 },
    ];
    const { getByPlaceholderText, getByText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={savedPeople}
        onUpdate={jest.fn()}
        onSetFromCached={onSetFromCached}
        onRemove={jest.fn()}
      />
    );

    fireEvent.changeText(getByPlaceholderText('You'), 'A');
    fireEvent.press(getByText('Alice'));

    expect(onSetFromCached).toHaveBeenCalledWith(
      'pa1',
      expect.objectContaining({ name: 'Alice', address: '1 Main' })
    );
  });
});

describe('ParticipantInput — address autocomplete', () => {
  it('does not call autocomplete for inputs shorter than 3 chars', () => {
    const { getByPlaceholderText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={[]}
        onUpdate={jest.fn()}
        onSetFromCached={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    fireEvent.changeText(getByPlaceholderText('City, zip code, or address'), 'AB');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(apiClient.autocomplete).not.toHaveBeenCalled();
  });

  it('debounces autocomplete calls (300ms)', async () => {
    (apiClient.autocomplete as jest.Mock).mockResolvedValue([
      { placeId: 'p1', description: '1 Main St, SF' },
    ]);
    const { getByPlaceholderText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={[]}
        onUpdate={jest.fn()}
        onSetFromCached={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    const addr = getByPlaceholderText('City, zip code, or address');
    fireEvent.changeText(addr, '1 Mai');
    fireEvent.changeText(addr, '1 Main');
    fireEvent.changeText(addr, '1 Main S');

    act(() => jest.advanceTimersByTime(200)); // not yet
    expect(apiClient.autocomplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(150)); // crosses 300ms
    await waitFor(() => expect(apiClient.autocomplete).toHaveBeenCalledTimes(1));
    expect(apiClient.autocomplete).toHaveBeenCalledWith('1 Main S');
  });

  it('geocodes the chosen suggestion and forwards lat/lng to onUpdate', async () => {
    (apiClient.autocomplete as jest.Mock).mockResolvedValue([
      { placeId: 'pid-x', description: '1 Main St, SF' },
    ]);
    (apiClient.geocode as jest.Mock).mockResolvedValue({
      lat: 37.77,
      lng: -122.42,
      formattedAddress: '1 Main St, San Francisco, CA',
    });

    const onUpdate = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={[]}
        onUpdate={onUpdate}
        onSetFromCached={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    const addr = getByPlaceholderText('City, zip code, or address');
    fireEvent.changeText(addr, '1 Main St');

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    await waitFor(() => expect(apiClient.autocomplete).toHaveBeenCalled());

    fireEvent.press(getByText('1 Main St, SF'));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        'pa1',
        expect.objectContaining({ lat: 37.77, lng: -122.42 })
      )
    );
  });

  it('swallows autocomplete errors and shows no suggestions', async () => {
    (apiClient.autocomplete as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByPlaceholderText, queryByText } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={false}
        savedPeople={[]}
        onUpdate={jest.fn()}
        onSetFromCached={jest.fn()}
        onRemove={jest.fn()}
      />
    );

    fireEvent.changeText(getByPlaceholderText('City, zip code, or address'), '1 Main St');
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(queryByText('1 Main St, SF')).toBeNull();
  });
});

describe('ParticipantInput — remove', () => {
  it('calls onRemove with the participant id when canRemove is true and the remove button is tapped', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <ParticipantInput
        participant={mkParticipant()}
        index={0}
        canRemove={true}
        savedPeople={[]}
        onUpdate={jest.fn()}
        onSetFromCached={jest.fn()}
        onRemove={onRemove}
      />
    );

    // The Ionicons mock exposes testID `icon-<name>`. Tap the parent element
    // by walking up from the icon stub to its TouchableOpacity wrapper.
    const icon = getByTestId('icon-close-circle');
    fireEvent.press(icon);

    expect(onRemove).toHaveBeenCalledWith('pa1');
  });
});
