export const ANNOTATION_COLORS = ["yellow", "green", "blue", "pink", "purple", "orange"] as const;
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

export const REACTION_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export interface AnnotationAnchor {
  text: string;
  start: number;
  end: number;
  pageNumber?: number;
}

export interface CreateAnnotationInput {
  anchor: AnnotationAnchor;
  color?: AnnotationColor;
  content?: string;
}

export interface CreateReplyInput {
  content: string;
}
