/**
 * 파일 열기·저장 창 — chart JSON·`.cfx`를 사용자 상호작용으로 읽고 쓴다.
 *
 * 실패 모드: 사용자 상호작용(취소 가능)이라는 점이 `env-storage`(조용한 영속,
 * 절대 던지지 않음)와 다르다 `[신규]` — 여기서는 **취소**와 **쓰기 실패**를
 * 구별한다. 취소는 정상 흐름(호출측이 상태를 그대로 둔다)이고, 실패는 던져서
 * 호출측이 사용자에게 알리게 한다.
 *
 * 브라우저 API는 호스트로 주입받는다(다른 env-* 파일과 동일 패턴) — File
 * System Access API 모양(`showOpenFilePicker`/`showSaveFilePicker`)을 최소
 * 표면으로 추상화했다. 실제 브라우저 지원 폭(File System Access API 미지원
 * 브라우저의 폴백)은 M3-2 범위 밖 — 결정 필요 항목으로 별도 보고했다(D-2026-062).
 *
 * `saveFile`의 `contents`는 `.cfx`(binary ZIP) 저장을 위해 M3-4에서
 * `string | Uint8Array`로 넓혔다 — 기존 chart JSON 저장(M3-2, 문자열)은
 * 그대로 동작한다.
 */

export interface OpenedFile {
  readonly name: string;
  readonly text: string;
}

/** `showOpenFilePicker` 모양의 최소 표면. 사용자가 취소하면 `null`. */
export interface FileOpenHost {
  pickFile(accept: readonly string[]): Promise<OpenedFile | null>;
}

/** `showSaveFilePicker` 모양의 최소 표면. 사용자가 취소하면 `null`. */
export interface FileSaveHost {
  saveFile(
    suggestedName: string,
    contents: string | Uint8Array,
  ): Promise<{ readonly name: string } | null>;
}

export type OpenOutcome =
  { readonly kind: 'opened'; readonly file: OpenedFile } | { readonly kind: 'cancelled' };

export type SaveFileOutcome =
  { readonly kind: 'saved'; readonly name: string } | { readonly kind: 'cancelled' };

export interface FileEnv {
  /** 취소는 `cancelled`로 돌아온다. 읽기 실패는 던진다. */
  open(host: FileOpenHost, accept: readonly string[]): Promise<OpenOutcome>;
  /** 취소는 `cancelled`로 돌아온다. 쓰기 실패는 던진다. */
  save(
    host: FileSaveHost,
    suggestedName: string,
    contents: string | Uint8Array,
  ): Promise<SaveFileOutcome>;
}

export function createFileEnv(): FileEnv {
  return {
    async open(host, accept) {
      const file = await host.pickFile(accept);
      return file === null ? { kind: 'cancelled' } : { kind: 'opened', file };
    },

    async save(host, suggestedName, contents) {
      const result = await host.saveFile(suggestedName, contents);
      return result === null ? { kind: 'cancelled' } : { kind: 'saved', name: result.name };
    },
  };
}

// ── ZIP 인코딩 — `.cfx`는 평탄 ZIP이다(`_meta/cfx.md` §8) ──────────────

export interface ZipEntry {
  /** package-local bare 파일명. 경로 성분을 포함하면 안 된다(검증은 호출측). */
  readonly name: string;
  readonly data: Uint8Array;
}

/**
 * `.cfx` ZIP 아카이브를 만든다. **store(무압축) 방식만** 쓴다 — 외부
 * 압축 라이브러리 없이(이 레포는 런타임 의존성이 0이다) 결정적이고 감사
 * 가능한 바이트를 내는 쪽을 택했다. 압축이 필요해지면(자산 큰 패키지의
 * 용량 절감) 나중에 deflate로 바꿀 수 있다 — 이 함수의 시그니처는 그대로
 * 유지된다. 결정 필요 항목으로 별도 보고한다.
 */
export function createZipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, 0x04034b50, true);
    localHeader.setUint16(4, 20, true); // version needed
    localHeader.setUint16(6, 0x0800, true); // general purpose flag: UTF-8 파일명
    localHeader.setUint16(8, 0, true); // compression method: store
    localHeader.setUint16(10, 0, true); // dos time
    localHeader.setUint16(12, 0x0021, true); // dos date: 1980-01-01(유효한 최소값)
    localHeader.setUint32(14, crc, true);
    localHeader.setUint32(18, size, true); // compressed size
    localHeader.setUint32(22, size, true); // uncompressed size
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // extra field length

    localChunks.push(new Uint8Array(localHeader.buffer), nameBytes, entry.data);

    const centralHeader = new DataView(new ArrayBuffer(46));
    centralHeader.setUint32(0, 0x02014b50, true);
    centralHeader.setUint16(4, 20, true); // version made by
    centralHeader.setUint16(6, 20, true); // version needed
    centralHeader.setUint16(8, 0x0800, true);
    centralHeader.setUint16(10, 0, true); // compression method
    centralHeader.setUint16(12, 0, true); // dos time
    centralHeader.setUint16(14, 0x0021, true); // dos date
    centralHeader.setUint32(16, crc, true);
    centralHeader.setUint32(20, size, true);
    centralHeader.setUint32(24, size, true);
    centralHeader.setUint16(28, nameBytes.length, true);
    centralHeader.setUint16(30, 0, true); // extra field length
    centralHeader.setUint16(32, 0, true); // comment length
    centralHeader.setUint16(34, 0, true); // disk number start
    centralHeader.setUint16(36, 0, true); // internal file attributes
    centralHeader.setUint32(38, 0, true); // external file attributes
    centralHeader.setUint32(42, offset, true); // relative offset of local header

    centralChunks.push(new Uint8Array(centralHeader.buffer), nameBytes);

    offset += localHeader.byteLength + nameBytes.length + size;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true); // disk number
  eocd.setUint16(6, 0, true); // disk with central dir
  eocd.setUint16(8, entries.length, true); // records on this disk
  eocd.setUint16(10, entries.length, true); // total records
  eocd.setUint32(12, centralDirSize, true);
  eocd.setUint32(16, centralDirOffset, true);
  eocd.setUint16(20, 0, true); // comment length

  return concatBytes([...localChunks, ...centralChunks, new Uint8Array(eocd.buffer)]);
}

/**
 * `.cfx` ZIP 아카이브를 되읽는다(`createZipArchive`의 짝, M3-5). EOCD를
 * 끝에서부터 찾아 central directory → local header 순서로 읽는다 — 다른
 * 도구가 만든(comment 있는) ZIP도 열 수 있게 `createZipArchive`가 항상
 * comment 0을 쓰는 것에 기대지 않는다.
 *
 * 손상은 **던져서** 명시적으로 거부한다(`_meta/cfx.md` §12.1) — 여기서
 * 조용히 일부만 읽거나 기본값으로 채우지 않는다: EOCD/central directory/
 * local header 시그니처 불일치, 잘린 데이터, store가 아닌 압축 방식,
 * CRC-32 불일치.
 */
export function readZipArchive(bytes: Uint8Array): ZipEntry[] {
  if (bytes.length < 22) throw new Error('ZIP이 너무 짧다 — EOCD를 찾을 수 없다');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes, view);
  const totalRecords = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);

  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  let pos = centralDirOffset;

  for (let i = 0; i < totalRecords; i++) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) {
      throw new Error(`central directory 항목 #${i}이 손상됐다`);
    }
    const compressionMethod = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    if (pos + 46 + nameLength > bytes.length)
      throw new Error(`central directory 항목 #${i}의 파일명이 잘렸다`);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));

    if (compressionMethod !== 0) {
      throw new Error(
        `"${name}"이 지원하지 않는 압축 방식(${compressionMethod})을 쓴다 — store만 지원한다`,
      );
    }
    if (
      localHeaderOffset + 30 > bytes.length ||
      view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      throw new Error(`"${name}"의 local header가 손상됐다`);
    }

    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    if (dataStart + compressedSize > bytes.length) {
      throw new Error(`"${name}"의 데이터가 잘렸다`);
    }
    const data = bytes.slice(dataStart, dataStart + compressedSize); // store 방식 — compressed == raw

    if (crc32(data) !== crc) {
      throw new Error(`"${name}"의 CRC-32가 일치하지 않는다 — 손상된 파일이다`);
    }

    entries.push({ name, data });
    pos += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  // comment가 있는 ZIP도 열 수 있게 끝에서부터 시그니처를 찾는다(comment 최대 65535바이트).
  const searchStart = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= searchStart; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error('EOCD(End Of Central Directory)를 찾지 못했다 — 유효한 ZIP이 아니다');
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

let crcTable: Uint32Array | null = null;

function crc32Table(): Uint32Array {
  if (crcTable !== null) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? (0xedb88320 ^ (c >>> 1)) >>> 0 : c >>> 1;
    }
    table[n] = c;
  }
  crcTable = table;
  return table;
}

function crc32(data: Uint8Array): number {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (table[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
