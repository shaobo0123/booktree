import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { BookmarkNode } from '../services/bookmarkService.js';

export interface ImportedBookmarkNode {
  title: string;
  type: 'folder' | 'bookmark';
  url: string | null;
  children: ImportedBookmarkNode[];
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readDl($: CheerioAPI, dl: AnyNode): ImportedBookmarkNode[] {
  const nodes: ImportedBookmarkNode[] = [];

  $(dl)
    .children('dt')
    .each((_, dt) => {
      const item = $(dt);
      const heading = item.children('h3').first();
      const link = item.children('a').first();

      if (heading.length > 0) {
        const title = heading.text().trim() || 'Untitled Folder';
        const childDl = item.children('dl').first();
        nodes.push({
          title,
          type: 'folder',
          url: null,
          children: childDl[0] ? readDl($, childDl[0]) : []
        });
        return;
      }

      if (link.length > 0) {
        const href = link.attr('href')?.trim() ?? '';
        if (!href) {
          return;
        }

        nodes.push({
          title: link.text().trim() || href,
          type: 'bookmark',
          url: href,
          children: []
        });
      }
    });

  return nodes;
}

export function parseBookmarkHtml(html: string): ImportedBookmarkNode[] {
  const $ = load(html);
  const rootDl = $('h1').nextAll('dl').first().length > 0 ? $('h1').nextAll('dl').first() : $('dl').first();

  if (rootDl.length === 0) {
    throw new Error('No bookmark list found in HTML file');
  }

  if (!rootDl[0]) {
    throw new Error('No bookmark list found in HTML file');
  }

  return readDl($, rootDl[0]);
}

function writeNodes(nodes: BookmarkNode[], depth: number): string[] {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  for (const node of nodes) {
    if (node.type === 'folder') {
      lines.push(`${indent}<DT><H3>${escapeHtml(node.title)}</H3>`);
      lines.push(`${indent}<DL><p>`);
      lines.push(...writeNodes(node.children, depth + 1));
      lines.push(`${indent}</DL><p>`);
      continue;
    }

    if (node.url) {
      lines.push(`${indent}<DT><A HREF="${escapeHtml(node.url)}">${escapeHtml(node.title)}</A>`);
    }
  }

  return lines;
}

export function createBookmarkHtml(nodes: BookmarkNode[]) {
  return [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    ...writeNodes(nodes, 1),
    '</DL><p>',
    ''
  ].join('\n');
}
