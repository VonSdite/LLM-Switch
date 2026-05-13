import * as vscode from 'vscode';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export interface StorageState<T> {
  exists: boolean;
  value: T;
}

export async function readStorageState<T>(context: vscode.ExtensionContext, name: string, fallback: T): Promise<StorageState<T>> {
  const uri = storageStateUri(context, name);
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = textDecoder.decode(bytes);
    return {
      exists: true,
      value: JSON.parse(text) as T
    };
  } catch (error) {
    if (isFileNotFound(error)) {
      return {
        exists: false,
        value: fallback
      };
    }
    throw new Error(`读取存储文件失败：${uri.toString()}，${errorMessage(error)}`);
  }
}

export async function writeStorageState(context: vscode.ExtensionContext, name: string, value: unknown): Promise<void> {
  const uri = storageStateUri(context, name);
  await vscode.workspace.fs.createDirectory(context.globalStorageUri);
  await vscode.workspace.fs.writeFile(uri, textEncoder.encode(`${JSON.stringify(value, null, 2)}\n`));
}

function storageStateUri(context: vscode.ExtensionContext, name: string): vscode.Uri {
  return vscode.Uri.joinPath(context.globalStorageUri, `${name}.json`);
}

function isFileNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const text = `${error.name} ${error.message}`;
  return /FileNotFound|EntryNotFound|ENOENT/i.test(text);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
