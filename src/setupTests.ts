import '@testing-library/jest-dom'

// jsdom 不实现 ResizeObserver，antd 部分组件（如 Textarea 自动高度）依赖它
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
