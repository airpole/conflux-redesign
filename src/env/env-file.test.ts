import { describe, expect, it, vi } from 'vitest';
import { createFileEnv, type FileOpenHost, type FileSaveHost } from './env-file.js';

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
});
