export type BookmarkType = 'folder' | 'bookmark';
export type ViewMode = 'list' | 'grid';

export interface BookmarkNode {
  id: string;
  parent_id: string | null;
  title: string;
  type: BookmarkType;
  url: string | null;
  favicon_base64: string | null;
  favicon_mime: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: BookmarkNode[];
}

export interface BookmarkFormPayload {
  title?: string;
  type: BookmarkType;
  url?: string | null;
  parent_id?: string | null;
}
