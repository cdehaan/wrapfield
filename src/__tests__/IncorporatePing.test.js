import IncorporatePing from '../utils/IncorporatePing.js';

describe('IncorporatePing', () => {
  test('records sent pings', () => {
    const pings = IncorporatePing([], { playerKey: 1, sent: 1000 });
    expect(pings).toEqual([{ playerKey: 1, sent: 1000, sync: false }]);
  });

  test('calculates ping and skew on bounce', () => {
    const initial = [{ playerKey: 1, sent: 1000, sync: false }];
    const updated = IncorporatePing(initial, { playerKey: 1, bounced: 1200, received: 1300 });
    expect(updated[0].ping).toBeCloseTo(300);
    expect(updated[0].skew).toBeCloseTo(100 / 300);
    expect(updated[0].sync).toBe(true);
  });
});
