/* tslint:disable */
/* eslint-disable */
export class MarkdownProcessor {
  free(): void;
  constructor();
  clear(): void;
  load_markdown(content: string, category: string): void;
  search(query: string, max_results: number): string;
  get_full_context(): string;
  set_max_context_length(length: number): void;
  get_section_count(): number;
  get_index_size(): number;
  export_sections(): string;
  import_sections(json: string): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_markdownprocessor_free: (a: number, b: number) => void;
  readonly markdownprocessor_new: () => number;
  readonly markdownprocessor_clear: (a: number) => void;
  readonly markdownprocessor_load_markdown: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly markdownprocessor_search: (a: number, b: number, c: number, d: number) => [number, number];
  readonly markdownprocessor_get_full_context: (a: number) => [number, number];
  readonly markdownprocessor_set_max_context_length: (a: number, b: number) => void;
  readonly markdownprocessor_get_section_count: (a: number) => number;
  readonly markdownprocessor_get_index_size: (a: number) => number;
  readonly markdownprocessor_export_sections: (a: number) => [number, number];
  readonly markdownprocessor_import_sections: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
