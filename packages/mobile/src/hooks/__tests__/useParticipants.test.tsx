import { renderHook, act } from '@testing-library/react-native';
import { useParticipants, DEFAULT_LABELS } from '../useParticipants';

describe('useParticipants', () => {
  it('starts with two participants using the default labels', () => {
    const { result } = renderHook(() => useParticipants());
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.participants[0].defaultLabel).toBe(DEFAULT_LABELS[0]);
    expect(result.current.participants[1].defaultLabel).toBe(DEFAULT_LABELS[1]);
    expect(result.current.canSearch).toBe(false);
  });

  it('addParticipant grows the list up to 4', () => {
    const { result } = renderHook(() => useParticipants());
    act(() => result.current.addParticipant());
    act(() => result.current.addParticipant());
    expect(result.current.participants).toHaveLength(4);

    act(() => result.current.addParticipant()); // capped
    expect(result.current.participants).toHaveLength(4);
  });

  it('removeParticipant cannot drop below 2', () => {
    const { result } = renderHook(() => useParticipants());
    const id = result.current.participants[0].id;
    act(() => result.current.removeParticipant(id));
    expect(result.current.participants).toHaveLength(2);
  });

  it('removes a specific participant when there are 3+', () => {
    const { result } = renderHook(() => useParticipants());
    act(() => result.current.addParticipant());
    const targetId = result.current.participants[1].id;
    act(() => result.current.removeParticipant(targetId));
    expect(result.current.participants).toHaveLength(2);
    expect(result.current.participants.find((p) => p.id === targetId)).toBeUndefined();
  });

  it('updateParticipant sets isValid only when name + lat + lng are present', () => {
    const { result } = renderHook(() => useParticipants());
    const id = result.current.participants[0].id;

    act(() => result.current.updateParticipant(id, { name: 'OB' }));
    expect(result.current.participants[0].isValid).toBe(false); // no coords

    act(() => result.current.updateParticipant(id, { lat: 1, lng: 2 }));
    expect(result.current.participants[0].isValid).toBe(true);
  });

  it('canSearch is true once at least 2 participants have address text >= 2 chars', () => {
    const { result } = renderHook(() => useParticipants());
    const [a, b] = result.current.participants;

    act(() => result.current.updateParticipant(a.id, { address: 'SF' }));
    expect(result.current.canSearch).toBe(false); // only one

    act(() => result.current.updateParticipant(b.id, { address: 'NY' }));
    expect(result.current.canSearch).toBe(true);
  });

  it('setFromCached fills name+address+coords and flags isValid=true', () => {
    const { result } = renderHook(() => useParticipants());
    const id = result.current.participants[0].id;
    act(() =>
      result.current.setFromCached(id, {
        name: 'Alice',
        address: '1 Main',
        placeId: 'pid',
        lat: 1,
        lng: 2,
      })
    );

    const p = result.current.participants[0];
    expect(p.name).toBe('Alice');
    expect(p.lat).toBe(1);
    expect(p.lng).toBe(2);
    expect(p.placeId).toBe('pid');
    expect(p.isValid).toBe(true);
  });

  it('loadAll replaces the participant list with normalized entries', () => {
    const { result } = renderHook(() => useParticipants());
    act(() =>
      result.current.loadAll([
        { name: 'A', address: '1 a', lat: 1, lng: 1 },
        { name: 'B', address: '2 b', lat: 2, lng: 2 },
        { name: 'C', address: '3 c', lat: 3, lng: 3 },
      ])
    );
    expect(result.current.participants).toHaveLength(3);
    expect(result.current.participants.every((p: any) => p.isValid)).toBe(true);
    expect(result.current.validCount).toBe(3);
  });
});
