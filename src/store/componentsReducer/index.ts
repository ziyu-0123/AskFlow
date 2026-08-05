import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { ComponentPropsType } from '../../components/QuestionComponents'

export type ComponentInfoType = {
  fe_id: string
  type: string
  title: string
  props: ComponentPropsType
}

export type ComponentsStateType = {
  componentList: ComponentInfoType[]
}

const INIT_STATE: ComponentsStateType = {
  componentList: [],
}

export const componentsSlice = createSlice({
  name: 'components',
  initialState: INIT_STATE,
  reducers: {
    // 重置所有组件
    resetComponents: (_state: ComponentsStateType, action: PayloadAction<ComponentsStateType>) => {
      return action.payload
    },
  },
})

export const { resetComponents } = componentsSlice.actions

export default componentsSlice.reducer
