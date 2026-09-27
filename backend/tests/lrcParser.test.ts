import { formatLrcTime, parseLrc, serializeLrc } from '../src/utils/lrcParser';

describe('LRC parser', () => {
  it('parses decimal and millisecond timestamps, metadata, and multiple timestamps', () => {
    const lines = parseLrc('[ar:Test]\n[00:01.20][00:02:500]Hello\n[00:04]World', 8);
    expect(lines).toEqual([
      { id: 1, startTime: 1.2, endTime: 2.5, text: 'Hello' },
      { id: 2, startTime: 2.5, endTime: 4, text: 'Hello' },
      { id: 3, startTime: 4, endTime: 8, text: 'World' },
    ]);
  });

  it('sorts timestamps and uses a fallback end for a missing duration', () => {
    const lines = parseLrc('[00:10.00]Later\n[00:02.00]First');
    expect(lines[0].endTime).toBe(10);
    expect(lines[1].endTime).toBe(16);
  });

  it('serializes parsed lines back to standard LRC timestamps', () => {
    const lines = parseLrc('[01:02.345]Hello', 70);
    expect(formatLrcTime(lines[0].startTime)).toBe('[01:02.35]');
    expect(serializeLrc(lines)).toBe('[01:02.35]Hello');
  });
});
