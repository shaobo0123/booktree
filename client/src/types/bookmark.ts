export type BookmarkType = 'folder' | 'bookmark';

export interface BookmarkNode {
  id: string;
  parent_id: string | null;
  title: string;
  type: BookmarkType;
  url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children: BookmarkNode[];
}

export interface BookmarkFormPayload {
  title: string;
  type: BookmarkType;
  url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}
