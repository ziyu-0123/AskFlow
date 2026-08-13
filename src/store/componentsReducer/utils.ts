import type { ComponentInfoType } from './index'

export function getNextSelectedId(fe_id: string, componentList: ComponentInfoType[]) {
  const index = componentList.findIndex(c => c.fe_id === fe_id)
  if (index < 0) return ''

  // 重新计算 selectedId
  let newSelectedId = ''
  const length = componentList.length
  if (length <= 1) {
    // 组件长度就一个，被删除了就没有组件
    newSelectedId = ''
  } else {
    // 组件长度 > 1
    if (index + 1 === length) {
      // 删除最后一个，就要选中上一个
      newSelectedId = componentList[index - 1].fe_id
    } else {
      // 要删除的不是最后一个，删除之后选中下一个
      newSelectedId = componentList[index + 1].fe_id
    }
  }

  return newSelectedId
}
