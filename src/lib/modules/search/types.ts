import type { SourceType } from "@prisma/client";

export type SearchFilter = {
  query: string;
  type?: SourceType[];
  collectionId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type SearchResultItem = {
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  snippet: string;
  score: number;
  pageNumber?: number;
  tags: string[];
  createdAt: Date;
};
