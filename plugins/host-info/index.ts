// Serviço de status da VPS: disco + memória, sem dependências de runtime.
// Contrato: { disk: {totalBytes, usedBytes}, memory: {totalBytes, usedBytes} }

import { readFile, statfs } from "node:fs/promises";
import { freemem, totalmem } from "node:os";

export type Usage = {
  totalBytes: number;
  usedBytes: number;
};

export type HostStatus = {
  disk: Usage;
  memory: Usage;
};

/** Filesystem inspecionado. Aponte para um mount do host se o container tiver o seu próprio disco. */
const DISK_PATH = process.env.HOST_INFO_DISK_PATH ?? "/";

/**
 * Uso de disco via `fs.statfs` (built-in do Node, sem shell).
 *
 * `bfree` é o espaço livre incluindo a reserva do root — é o que o `df` usa
 * para calcular a coluna "Used", então os números batem com o `df`.
 */
export async function getDiskUsage(path: string = DISK_PATH): Promise<Usage> {
  const stats = await statfs(path);

  return {
    totalBytes: stats.bsize * stats.blocks,
    usedBytes: stats.bsize * (stats.blocks - stats.bfree),
  };
}

/**
 * Uso de memória.
 *
 * Prefere `MemAvailable` do /proc/meminfo: `os.freemem()` não conta cache e
 * buffers reclamáveis, e por isso superestima bastante a memória em uso.
 * Cai para `os.freemem()` fora do Linux ou se o /proc não estiver acessível.
 */
export async function getMemoryUsage(): Promise<Usage> {
  try {
    const meminfo = await readFile("/proc/meminfo", "utf8");

    const total = parseMeminfoValue(meminfo, "MemTotal");
    const available = parseMeminfoValue(meminfo, "MemAvailable");

    if (total !== null && available !== null) {
      return { totalBytes: total, usedBytes: total - available };
    }
  } catch {
    // /proc indisponível: usa o fallback abaixo
  }

  const totalBytes = totalmem();

  return { totalBytes, usedBytes: totalBytes - freemem() };
}

/** Linhas do /proc/meminfo têm o formato `MemTotal:  8005820 kB`. */
function parseMeminfoValue(meminfo: string, key: string): number | null {
  const match = new RegExp(`^${key}:\\s+(\\d+)\\s*kB$`, "m").exec(meminfo);

  return match ? Number(match[1]) * 1024 : null;
}

export async function getHostStatus(): Promise<HostStatus> {
  const [disk, memory] = await Promise.all([getDiskUsage(), getMemoryUsage()]);

  return { disk, memory };
}
