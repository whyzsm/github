import path from 'node:path';
import { pathExists, readYamlFile, resolveWorkspacePath } from './fs';

export interface WorkspaceLocalConfig {
  memoryRoot?: string;
  memoryVaultRoot?: string;
  memoryLearningRootName?: string;
}

export interface MemoryRootConfig {
  memoryRoot: string;
  memoryVaultRoot?: string;
  memoryLearningRootName?: string;
}

const localConfigPath = 'workspace.local.yaml';

export async function resolveMemoryRootConfig(workspaceRoot: string): Promise<MemoryRootConfig> {
  const configPath = path.join(workspaceRoot, localConfigPath);
  if (await pathExists(configPath)) {
    const config = await readYamlFile<WorkspaceLocalConfig>(configPath);
    const memoryRoot = config.memoryRoot
      ? resolveWorkspacePath(workspaceRoot, config.memoryRoot)
      : path.join(workspaceRoot, 'memory');
    const inferred = inferMemoryProtocolConfig(memoryRoot);
    return {
      memoryRoot,
      memoryVaultRoot: config.memoryVaultRoot
        ? resolveWorkspacePath(workspaceRoot, config.memoryVaultRoot)
        : inferred.memoryVaultRoot,
      memoryLearningRootName: config.memoryLearningRootName ?? inferred.memoryLearningRootName
    };
  }

  return { memoryRoot: path.join(workspaceRoot, 'memory') };
}

export async function resolveMemoryRoot(workspaceRoot: string): Promise<string> {
  return (await resolveMemoryRootConfig(workspaceRoot)).memoryRoot;
}

export function resolveMemoryPath(memoryRoot: string, memoryPath: string): string {
  if (path.isAbsolute(memoryPath)) {
    return memoryPath;
  }

  if (memoryPath === 'memory') {
    return memoryRoot;
  }

  if (memoryPath.startsWith('memory/')) {
    return path.join(memoryRoot, memoryPath.slice('memory/'.length));
  }

  return path.join(memoryRoot, memoryPath);
}

function inferMemoryProtocolConfig(memoryRoot: string): Pick<MemoryRootConfig, 'memoryVaultRoot' | 'memoryLearningRootName'> {
  const parts = path.resolve(memoryRoot).split(path.sep);
  const projectRootIndex = parts.lastIndexOf('10-项目记忆');
  if (projectRootIndex < 0) return {};

  const learningRootStart = parts.lastIndexOf('88-学习', projectRootIndex);
  if (learningRootStart < 0 || learningRootStart >= projectRootIndex) return {};

  return {
    memoryVaultRoot: parts.slice(0, learningRootStart).join(path.sep) || path.sep,
    memoryLearningRootName: parts.slice(learningRootStart, projectRootIndex).join('/')
  };
}
