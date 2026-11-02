import * as RNFS from '@dr.pogodin/react-native-fs';
import {TalentEngine, TalentResult, ToolDefinition} from './types';

export class FileSystemEngine implements TalentEngine {
  readonly name = 'file_system';

  private resolvePath(inputPath: string): string {
    const clean = (inputPath || '').trim();
    if (!clean || clean === '/' || clean === '.') {
      return RNFS.ExternalStorageDirectoryPath;
    }
    if (clean.startsWith('/sdcard') || clean.startsWith('/storage')) {
      return clean;
    }
    return `${RNFS.ExternalStorageDirectoryPath}/${clean.replace(/^\/+/, '')}`;
  }

  async execute(args: Record<string, any>): Promise<TalentResult> {
    const action = typeof args.action === 'string' ? args.action : 'list';
    const rawPath = typeof args.path === 'string' ? args.path : '';
    const targetPath = this.resolvePath(rawPath);

    try {
      if (action === 'list') {
        const items = await RNFS.readDir(targetPath);
        const listStr = items
          .slice(0, 100)
          .map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name} (${item.size} B)`)
          .join('\n');
        return {
          type: 'text',
          summary: `Listing ${targetPath} (${items.length} items):\n${listStr || 'Empty folder'}`,
        };
      }

      if (action === 'read') {
        const content = await RNFS.readFile(targetPath, 'utf8');
        return {
          type: 'text',
          summary: `Content of ${targetPath}:\n${content.slice(0, 8000)}`,
        };
      }

      if (action === 'write') {
        const content = typeof args.content === 'string' ? args.content : '';
        await RNFS.writeFile(targetPath, content, 'utf8');
        return {
          type: 'text',
          summary: `Successfully wrote ${content.length} chars to ${targetPath}`,
        };
      }

      if (action === 'delete') {
        await RNFS.unlink(targetPath);
        return {
          type: 'text',
          summary: `Deleted ${targetPath}`,
        };
      }

      if (action === 'download') {
        const url = typeof args.url === 'string' ? args.url : '';
        if (!url) {
          return {
            type: 'error',
            summary: 'file_system: missing url for download',
            errorMessage: 'url argument is required for download action',
          };
        }
        const res = await RNFS.downloadFile({
          fromUrl: url,
          toFile: targetPath,
        }).promise;
        return {
          type: 'text',
          summary: `Downloaded ${url} to ${targetPath} (HTTP ${res.statusCode}, ${res.bytesWritten} bytes)`,
        };
      }

      return {
        type: 'error',
        summary: `file_system: unknown action "${action}"`,
        errorMessage: 'Valid actions are: list, read, write, delete, download',
      };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return {
        type: 'error',
        summary: `file_system error on ${action} "${targetPath}"`,
        errorMessage: errMsg,
      };
    }
  }

  toToolDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'file_system',
        description:
          'Access local storage files and folders on Android (/sdcard). Can list directories, read text/config files, write/modify files, delete files, or download plugins/files from a URL.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Operation to perform: "list", "read", "write", "delete", or "download".',
            },
            path: {
              type: 'string',
              description: 'File or folder path (e.g., "", "Download", "/sdcard/atmosphere/contents").',
            },
            content: {
              type: 'string',
              description: 'Text content to write when action is "write".',
            },
            url: {
              type: 'string',
              description: 'Direct URL to download from when action is "download".',
            },
          },
          required: ['action', 'path'],
        },
      },
    };
  }
}
