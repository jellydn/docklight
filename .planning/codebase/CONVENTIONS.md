# Coding Conventions

**Analysis Date:** 2026-03-07

## Naming Patterns

**Files:**
- kebab-case: `app-buildpacks.ts`, `create-app-dialog.tsx`, `use-streaming-action.ts`
- Test files: co-located with source, `.test.ts` suffix

**Functions:**
- camelCase: `getApps()`, `executeCommand()`, `isValidAppName()`, `createSSEWriter()`

**Variables:**
- camelCase: `const mockExecuteCommand`, `const listResult`
- Constants: Mixed - some SCREAMING_SNAKE_CASE (`DEFAULT_SSH_PORT`), some camelCase (`UNKNOWN_ERROR`)

**Types:**
- PascalCase for interfaces and types: `interface App`, `type CommandResult`, `interface SSEWriter`
- Use `interface` for object shapes
- Use `type` for unions and primitives

## Code Style

**Formatting:**
- Tool: Biome 2.4.4
- Key settings:
  - Indent style: Tabs
  - Indent width: 2
  - Line width: 100
  - Quote style: Double quotes
  - Trailing commas: ES5
  - Semicolons: Always

**Linting:**
- Tool: Biome (recommended rules enabled)
- Key rules:
  - `useImportType`: "on" - 使用 `import type` 进行类型导入
  - `noExplicitAny`: "off" - 允许 `any` 类型
  - `noUnusedVariables`: "warn" - 未使用的变量发出警告

## Import Organization

**Order:**
1. 外部依赖（node_modules）
2. 内部导入（相对路径）
3. 类型导入（使用 `import type`）

**Path Aliases:**
- Client: `@/` 映射到 `client/src/`（在 vite.config.ts 中配置）
- Server: `@/` 映射到服务器根目录（在 vitest.config.ts 中配置）

**Extension convention:**
- 相对导入使用 `.js` 扩展名（即使在 `.ts` 文件中）- Node.js ESM 要求

## Error Handling

**Patterns:**
- 命令执行从不抛出异常；返回带 `exitCode`、`stdout`、`stderr`、`command` 的 `CommandResult` 对象
- 验证错误返回带 `error` 字段的对象
- 对捕获的未知错误使用类型断言：`error as { message?: string }`
- 通过 Pino 记录错误，包含上下文：`logger.error({ err }, "Error message")`

**Example:**
```typescript
try {
  const result = await executeCommand(command);
  if (result.exitCode !== 0) {
    return { error: "Failed", command: result.command, exitCode: result.exitCode, stderr: result.stderr };
  }
  return result;
} catch (error: unknown) {
  const err = error as { message?: string };
  logger.error({ err }, "Unexpected failure");
  return { error: err.message || "Unknown error", command, exitCode: 1, stderr: "" };
}
```

## Logging

**Framework:** Pino 10.3.1

**Patterns:**
- 使用从 `server/lib/logger.ts` 导入的 `logger`
- 日志级别：`logger.info()`、`logger.error()`、`logger.warn()`、`logger.debug()`
- 错误始终包含上下文对象：`logger.error({ err }, "Message")`
- HTTP 请求通过 pino-http 中间件自动记录

## Comments

**When to Comment:**
- 极少 - 代码应自解释
- 复杂逻辑需要解释
- 公共 API 函数（一些使用 JSDoc）

**JSDoc/TSDoc:**
- 最小使用
- 一些导出的函数使用简单的 `@description` 标签

## Function Design

**Size:** 小函数，专注单一职责

**Parameters:**
- 必要时使用选项对象：`interface ExecuteCommandOptions { userId?: string; skipHistory?: boolean }`
- 默认参数很少使用；首选对象选项

**Return Values:**
- 命令函数返回 `CommandResult` 或带 `error` 的错误对象
- 从不抛出预期错误
- 使用联合类型表示成功/失败：`Promise<App[] | { error: string; ... }>`

## Module Design

**Exports:**
- 使用命名导出：`export function getApps()`, `export interface App`
- 使用 `export type` 进行类型导出

**Barrel Files:** 不使用（每个模块直接导入）

## React Conventions

**Components:**
- 函数式组件配合 hooks
- Props 接口在组件上方定义
- 使用 `class-variance-authority` (cva) 进行变体样式

**State:**
- 服务器状态使用 `@tanstack/react-query`
- 本地状态使用 `useState`，派生值使用 `useMemo`

**Styling:**
- 使用 `clsx` 和 `tailwind-merge` 通过 `cn()` 辅助函数进行类合并
- Tailwind CSS 实用类优先
- `tw-animate-css` 用于动画

## Testing Conventions

**Vitest (Server + Client):**
- 使用 `describe`、`it`、`expect`、`vi`、`beforeEach`
- 使用 `vi.mock()` 进行外部依赖模拟
- 在 `beforeEach` 中用 `vi.clearAllMocks()` 清除模拟

**Playwright (Client E2E):**
- 用于端到端用户流程测试

---

*Convention analysis: 2026-03-07*
