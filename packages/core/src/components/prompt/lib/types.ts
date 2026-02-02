export type FilePart = {
  type: "file";
  mime: string;
  filename?: string;
  url: string;
  source?: {
    type: "file" | "resource";
    path?: string;
    clientName?: string;
    uri?: string;
    text?: {
      start: number;
      end: number;
      value: string;
    };
  };
};

export function isEmbeddedImage(part: FilePart): boolean {
  return part.url.startsWith("data:image/");
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export type AgentPart = {
  type: "agent";
  id: string;
  source?: {
    text: {
      start: number;
      end: number;
      value: string;
    };
  };
};

/**
 * Text part - for pasted content that gets summarized
 */
export type TextPart = {
  type: "text";
  text: string;
  source?: {
    text: {
      start: number;
      end: number;
      value: string;
    };
  };
};

/**
 * Union of all prompt part types
 */
export type PromptPart = FilePart | AgentPart | TextPart;

export type TextSegment = { type: "text"; text: string };
export type ImageSegment = {
  type: "image";
  mime: string;
  filename?: string;
  url: string;
  displayText: string;
};
export type FileRefSegment = {
  type: "fileRef";
  url: string;
  displayText: string;
};
export type AgentSegment = { type: "agent"; id: string; displayText: string };
export type Segment =
  | TextSegment
  | ImageSegment
  | FileRefSegment
  | AgentSegment;

/**
 * Complete prompt information including input text and attached parts
 */
export type PromptInfo = {
  input: string;
  mode?: "normal" | "shell";
  parts: PromptPart[];
};

/**
 * Extmark represents a virtual text marker in the prompt
 * Used to track file/agent/paste references
 */
export type Extmark = {
  id: number;
  start: number;
  end: number;
  type: "file" | "agent" | "paste";
  partIndex: number;
};

/**
 * Autocomplete option for file/agent/command suggestions
 */
export type AutocompleteOption = {
  display: string;
  value?: string;
  aliases?: string[];
  disabled?: boolean;
  description?: string;
  isDirectory?: boolean;
  path?: string;
  /** For file/agent options, include the part data for insertion */
  part?: FilePart | AgentPart;
  onSelect?: () => void;
};

export type AutocompleteState = {
  visible: false | "#" | "@" | "/";
  triggerIndex: number;
  selectedIndex: number;
  filter: string;
};

/**
 * History entry with full prompt info
 */
export type HistoryEntry = PromptInfo & {
  timestamp?: number;
};

/**
 * Stash entry for saved drafts
 */
export type StashEntry = {
  input: string;
  parts: PromptPart[];
  timestamp: number;
};

/**
 * Frecency entry for tracking file access patterns
 */
export type FrecencyEntry = {
  path: string;
  frequency: number;
  lastOpen: number;
};
