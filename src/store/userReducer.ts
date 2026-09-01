import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type UserStateType = {
  username: string
  nickname: string
  aiConfigured: boolean
}

const INIT_STATE: UserStateType = {
  username: '',
  nickname: '',
  aiConfigured: false,
}

export const userSlice = createSlice({
  name: 'user',
  initialState: INIT_STATE,
  reducers: {
    loginReducer: (_state: UserStateType, action: PayloadAction<UserStateType>) => {
      return action.payload
    },
    logoutReducer: () => INIT_STATE,
    // 保存/清除 AI 配置后单独更新该标记（无需重新拉取用户信息）
    updateAiConfiguredReducer: (state: UserStateType, action: PayloadAction<boolean>) => {
      state.aiConfigured = action.payload
    },
  },
})

export const { loginReducer, logoutReducer, updateAiConfiguredReducer } = userSlice.actions

export default userSlice.reducer
