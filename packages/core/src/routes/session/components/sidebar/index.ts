// biome-ignore lint/performance/noBarrelFile: intentional public API for sidebar
export {
  SidebarSection,
  type SidebarSectionProps,
} from "./components/section.tsx";
export {
  type ContextItem,
  SidebarSectionContext,
} from "./components/section-context.tsx";
export {
  type FileItem,
  SidebarSectionFiles,
} from "./components/section-files.tsx";
export {
  SidebarSectionTodos,
  type TodoItem,
} from "./components/section-todos.tsx";
export { Sidebar, type SidebarProps } from "./sidebar.tsx";
