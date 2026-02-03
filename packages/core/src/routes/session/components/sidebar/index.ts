// biome-ignore lint/performance/noBarrelFile: intentional public API for sidebar
export {
  SidebarSection,
  type SidebarSectionProps,
} from "./components/section.js";
export {
  type ContextItem,
  SidebarSectionContext,
} from "./components/section-context.js";
export {
  type FileItem,
  SidebarSectionFiles,
} from "./components/section-files.js";
export {
  SidebarSectionTodos,
  type TodoItem,
} from "./components/section-todos.js";
export { Sidebar, type SidebarProps } from "./sidebar.js";
