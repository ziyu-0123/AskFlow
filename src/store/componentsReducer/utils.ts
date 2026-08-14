import type { ComponentInfoType, ComponentsStateType } from './index'

export function getNextSelectedId(fe_id: string, componentList: ComponentInfoType[]) {
  const visibleComponentList = componentList.filter(c => !c.isHidden)
  const index = visibleComponentList.findIndex(c => c.fe_id === fe_id)
  if (index < 0) return ''

  // 重新计算 selectedId
  let newSelectedId = ''
  const length = visibleComponentList.length
  if (length <= 1) {
    // 组件长度就一个，被删除了就没有组件
    newSelectedId = ''
  } else {
    // 组件长度 > 1
    if (index + 1 === length) {
      // 删除最后一个，就要选中上一个
      newSelectedId = visibleComponentList[index - 1].fe_id
    } else {
      // 要删除的不是最后一个，删除之后选中下一个
      newSelectedId = visibleComponentList[index + 1].fe_id
    }
  }

  return newSelectedId
}

export function insertNewComponent(state: ComponentsStateType, newComponent: ComponentInfoType) {
  const { selectedId, componentList } = state
  const index = componentList.findIndex(c => c.fe_id === selectedId)

  // 未选中任何组件
  if (index < 0) {
    state.componentList.push(newComponent)
  } else {
    // 选中了组件，插入到 index 后面
    state.componentList.splice(index + 1, 0, newComponent)
  }
  state.selectedId = newComponent.fe_id
}
