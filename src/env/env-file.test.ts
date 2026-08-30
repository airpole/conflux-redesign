import { describe, expect, it, vi } from 'vitest';
import {
  createFileEnv,
  createZipArchive,
  type FileOpenHost,
  type FileSaveHost,
} from './env-file.js';

describe('env-file — open', () => {
  it('사용자가 파일을 고르면 opened를 돌려준다', async () => {
    const host: FileOpenHost = {
      pickFile: vi.fn(async () => ({ name: 'chart.json', text: '{}' })),
    };
    const env = createFileEnv();

    const outcome = await env.open(host, ['.json']);

    expect(outcome).toEqual({ kind: 'opened', file: { name: 'chart.json', text: '{}' } });
    expect(host.pickFile).toHaveBeenCalledWith(['.json']);
  });

  it('사용자가 취소하면 cancelled를 돌려준다', async () => {
    const host: FileOpenHost = { pickFile: vi.fn(async () => null) };
    const env = createFileEnv();

    const outcome = await env.open(host, ['.json']);

    expect(outcome).toEqual({ kind: 'cancelled' });
  });

  it('읽기 실패는 던진다 — 조용히 삼키지 않는다', async () => {
    const host: FileOpenHost = {
      pickFile: vi.fn(async () => {
        throw new Error('읽기 실패');
      }),
    };
    const env = createFileEnv();

    await expect(env.open(host, ['.json'])).rejects.toThrow('읽기 실패');
  });
});

describe('env-file — save', () => {
  it('사용자가 위치를 고르면 saved를 돌려준다', async () => {
    const host: FileSaveHost = {
      saveFile: vi.fn(async () => ({ name: 'chart_v2.json' })),
    };
    const env = createFileEnv();

    const outcome = await env.save(host, 'chart_v2.json', '{}');

    expect(outcome).toEqual({ kind: 'saved', name: 'chart_v2.json' });
    expect(host.saveFile).toHaveBeenCalledWith('chart_v2.json', '{}');
  });

  it('사용자가 취소하면 cancelled를 돌려준다', async () => {
    const host: FileSaveHost = { saveFile: vi.fn(async () => null) };
    const env = createFileEnv();

    const outcome = await env.save(host, 'chart_v2.json', '{}');

    expect(outcome).toEqual({ kind: 'cancelled' });
  });

  it('쓰기 실패는 던진다 — 조용히 삼키지 않는다', async () => {
    const host: FileSaveHost = {
      saveFile: vi.fn(async () => {
        throw new Error('쓰기 실패');
      }),
    };
    const env = createFileEnv();

    await expect(env.save(host, 'chart_v2.json', '{}')).rejects.toThrow('쓰기 실패');
  });

  it('binary(Uint8Array) contents도 그대로 host에 전달한다(.cfx 저장, M3-4)', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const host: FileSaveHost = { saveFile: vi.fn(async () => ({ name: 'pack.cfx' })) };
    const env = createFileEnv();

    const outcome = await env.save(host, 'pack.cfx', bytes);

    expect(outcome).toEqual({ kind: 'saved', name: 'pack.cfx' });
    expect(host.saveFile).toHaveBeenCalledWith('pack.cfx', bytes);
  });
});

/**
 * 손으로 최소 ZIP 리더를 짜서 `createZipArchive`의 산출물을 되읽는다 — 외부
 * 라이브러리 없이 만든 바이트열이라 자체 검증이 왕복(round-trip)의 유일한
 * 근거다. EOCD → central directory → local header 순서로 스펙 그대로 파싱한다.
 */
function readZipEntries(bytes: Uint8Array): Array<{ name: string; data: Uint8Array; crc: number }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();

  // EOCD는 파일 끝의 고정 22바이트(주석 없음을 전제 — 이 인코더는 항상 comment length 0).
  const eocdOffset = bytes.length - 22;
  expect(view.getUint32(eocdOffset, true)).toBe(0x06054b50);
  const totalRecords = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);

  const entries: Array<{ name: string; data: Uint8Array; crc: number }> = [];
  let pos = centralDirOffset;
  for (let i = 0; i < totalRecords; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const crc = view.getUint32(pos + 16, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));

    // local header에서 실제 데이터를 읽는다(centralDir의 size와 대조).
    expect(view.getUint32(localHeaderOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataStart, dataStart + compressedSize); // store 방식 — compressed == raw

    entries.push({ name, data, crc });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

describe('createZipArchive', () => {
  it('빈 목록은 EOCD만 있는 유효한(항목 0개) 아카이브를 만든다', () => {
    const bytes = createZipArchive([]);
    expect(readZipEntries(bytes)).toEqual([]);
  });

  it('만든 아카이브를 되읽으면 파일명·내용이 그대로 복원된다', () => {
    const encoder = new TextEncoder();
    const entries = [
      { name: 'chart.json', data: encoder.encode('{"a":1}') },
      { name: 'music.ogg', data: new Uint8Array([0, 1, 2, 255, 254]) },
    ];

    const bytes = createZipArchive(entries);
    const decoded = readZipEntries(bytes);

    expect(decoded).toHaveLength(2);
    expect(decoded[0]!.name).toBe('chart.json');
    expect(decoded[0]!.data).toEqual(entries[0]!.data);
    expect(decoded[1]!.name).toBe('music.ogg');
    expect(decoded[1]!.data).toEqual(entries[1]!.data);
  });

  it('central directory의 CRC-32가 실제 데이터와 일치한다', () => {
    const data = new TextEncoder().encode('hello cfx');
    const bytes = createZipArchive([{ name: 'a.txt', data }]);
    const [entry] = readZipEntries(bytes);

    // 표준 CRC-32("hello cfx") — python3 zlib.crc32(b"hello cfx")와 대조한 고정값.
    expect(entry!.crc).toBe(0x36217f89);
  });

  it('평탄 ZIP이다 — 하위 폴더 없이 파일명을 그대로 쓴다(cfx.md §8)', () => {
    const bytes = createZipArchive([{ name: 'plain.json', data: new Uint8Array([1]) }]);
    const [entry] = readZipEntries(bytes);
    expect(entry!.name).toBe('plain.json');
  });
});
