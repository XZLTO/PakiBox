import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { app } from 'electron';
import { InBoundMode } from './data';

const CONFIGS_DIR = path.join(app.getAppPath(), "configs");

async function ensureConfigsDir() {
  await fs.ensureDir(CONFIGS_DIR);
}

export async function createConfig(url: string, name: string): Promise<void> {
  await ensureConfigsDir();

  try {
    const response = await axios.get(url);
    const configPath = path.join(CONFIGS_DIR, `${name}.json`);

    await fs.writeJson(configPath, response.data, { spaces: 2 });
  } catch (error) {
    throw new Error(`Failed to create config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function updatePartialJson(
  filePath: string,
  updates: Record<string, unknown>, // Обновляемые поля (часть схемы, которую знаем)
) {
  try {
    // Читаем файл
    const rawData = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(rawData); // Полный объект (может содержать неизвестные поля)

    // Обновляем только известные поля, остальное оставляем как есть
    const updatedData = { ...data, ...updates };

    // Записываем обратно
    await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');

    console.log('Файл успешно обновлён!');
  } catch (error) {
    console.error('Ошибка при обновлении JSON:', error);
  }
}



export async function SetConfigMode(config: string, mode: InBoundMode) {
  switch (mode) {
    case InBoundMode.TUN:
      updatePartialJson(getConfigPath(config), {
        "inbounds": [
          {
            "type": "tun",
            "inet4_address": "198.18.0.1/16",
            "auto_route": true,
            "stack": "mixed",
            "sniff": true
          }
        ],
      })
      break;
    case InBoundMode.PROXY:
      updatePartialJson(getConfigPath(config), {
        "inbounds": [
          {
            "type": "mixed",
            "tag": "mixed-in",
            "listen": "127.0.0.1",
            "listen_port": 1080,
            "sniff": true,
            "sniff_override_destination": true
          }
        ],
      })
      break;
    default:
      break;
  }
}

export async function getConfigs(): Promise<string[]> {
  await ensureConfigsDir();

  try {
    const files = await fs.readdir(CONFIGS_DIR);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
  } catch (error) {
    throw new Error(`Failed to get configs: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function deleteConfig(name: string): Promise<void> {
  const configPath = path.join(CONFIGS_DIR, `${name}.json`);

  try {
    await fs.remove(configPath);
  } catch (error) {
    throw new Error(`Failed to delete config: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Получить путь к конфигу
export function getConfigPath(name: string): string {
  return path.join(CONFIGS_DIR, `${name}.json`);
}
