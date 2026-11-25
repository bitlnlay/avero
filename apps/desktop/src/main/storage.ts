import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * 本地 JSON 文件存储，按命名空间隔离。
 *
 * 数据落地为 `<dir>/<namespace>.json`（一个命名空间一个 JSON 对象）。
 * 保留内存缓存，写操作即时落盘。后续可平滑替换为 SQLite，接口不变。
 */
export class JsonStorage {
  private readonly cache = new Map<string, Record<string, unknown>>();

  constructor(private readonly dir: string) {}

  private fileFor(namespace: string): string {
    const safe = namespace.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.dir, `${safe}.json`);
  }

  private async load(namespace: string): Promise<Record<string, unknown>> {
    const cached = this.cache.get(namespace);
    if (cached) return cached;

    let data: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(this.fileFor(namespace), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') console.warn(`[storage] 读取命名空间 ${namespace} 失败:`, err);
    }
    this.cache.set(namespace, data);
    return data;
  }

  private async persist(namespace: string): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const data = this.cache.get(namespace) ?? {};
    await fs.writeFile(this.fileFor(namespace), JSON.stringify(data, null, 2), 'utf8');
  }

  async get<T = unknown>(namespace: string, key: string): Promise<T | undefined> {
    const data = await this.load(namespace);
    return data[key] as T | undefined;
  }

  async set(namespace: string, key: string, value: unknown): Promise<void> {
    const data = await this.load(namespace);
    data[key] = value;
    await this.persist(namespace);
  }

  async delete(namespace: string, key: string): Promise<void> {
    const data = await this.load(namespace);
    delete data[key];
    await this.persist(namespace);
  }

  async list(namespace: string): Promise<string[]> {
    const data = await this.load(namespace);
    return Object.keys(data);
  }
}
