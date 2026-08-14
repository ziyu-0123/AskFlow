import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ComponentPropsType } from '../../components/QuestionComponents'
import { getNextSelectedId, insertNewComponent } from './utils'
import cloneDeep from 'lodash.clonedeep'
import { nanoid } from 'nanoid'

export type ComponentInfoType = {
  fe_id: string
  type: string
  title: string
  isHidden?: boolean
  isLocked?: boolean
  props: ComponentPropsType
}

export type ComponentsStateType = {
  selectedId: string
  componentList: ComponentInfoType[]
  copiedComponent: ComponentInfoType | null
}

const INIT_STATE: ComponentsStateType = {
  selectedId: '',
  componentList: [],
  copiedComponent: null,
}

export const componentsSlice = createSlice({
  name: 'components',
  initialState: INIT_STATE,
  reducers: {
    // 重置所有组件
    resetComponents: (_state: ComponentsStateType, action: PayloadAction<ComponentsStateType>) => {
      return action.payload
    },
    // 修改 selectedId
    changeSelectedId: (state: ComponentsStateType, action: PayloadAction<string>) => {
      state.selectedId = action.payload
    },
    // 添加新组件
    addComponent: (state: ComponentsStateType, action: PayloadAction<ComponentInfoType>) => {
      const newComponent = action.payload
      insertNewComponent(state, newComponent)
    },
    // 修改组件属性
    changeComponentProps: (
      state: ComponentsStateType,
      action: PayloadAction<{ fe_id: string; newProps: ComponentPropsType }>
    ) => {
      const { fe_id, newProps } = action.payload
      // 找到当前要修改属性的组件
      const curComp = state.componentList.find(c => c.fe_id === fe_id)
      if (curComp) {
        curComp.props = {
          ...curComp.props,
          ...newProps,
        }
      }
    },
    // 删除选中的组件
    removeSelectedComponent: (state: ComponentsStateType) => {
      const { componentList = [], selectedId: removedId } = state

      // 重新计算 selectedId
      const newSelectedId = getNextSelectedId(removedId, componentList)
      state.selectedId = newSelectedId

      const index = componentList.findIndex(c => c.fe_id === removedId)
      componentList.splice(index, 1)
    },
    // 隐藏/显示组件
    changeComponentHidden: (
      state: ComponentsStateType,
      action: PayloadAction<{ fe_id: string; isHidden: boolean }>
    ) => {
      const { componentList = [] } = state
      const { fe_id, isHidden } = action.payload

      // 重新计算 selectedId
      let newSelectedId = ''
      if (isHidden) {
        // 要隐藏
        newSelectedId = getNextSelectedId(fe_id, componentList)
      } else {
        // 要显示
        newSelectedId = fe_id
      }

      state.selectedId = newSelectedId

      const curComp = componentList.find(c => c.fe_id === fe_id)
      if (curComp) {
        curComp.isHidden = isHidden
      }
    },
    // 锁定/解锁组件
    toggleComponentLocked: (
      state: ComponentsStateType,
      action: PayloadAction<{ fe_id: string }>
    ) => {
      const { fe_id } = action.payload

      const curComp = state.componentList.find(c => c.fe_id === fe_id)
      if (curComp) {
        curComp.isLocked = !curComp.isLocked
      }
    },
    // 复制当前选中组件
    copySelectedComponent: (state: ComponentsStateType) => {
      const { selectedId, componentList = [] } = state
      const selectedComponent = componentList.find(c => c.fe_id === selectedId)
      if (selectedComponent == null) return
      state.copiedComponent = cloneDeep(selectedComponent) // 深拷贝
    },
    // 粘贴
    pasteCopiedComponent: (state: ComponentsStateType) => {
      const { copiedComponent } = state
      if (copiedComponent == null) return

      // 修改 copiedComponent 的 fe_id
      copiedComponent.fe_id = nanoid()

      // 插入 copiedComponent
      insertNewComponent(state, copiedComponent)
    },
  },
})

export const {
  resetComponents,
  changeSelectedId,
  addComponent,
  changeComponentProps,
  removeSelectedComponent,
  changeComponentHidden,
  toggleComponentLocked,
  copySelectedComponent,
  pasteCopiedComponent,
} = componentsSlice.actions

export default componentsSlice.reducer
