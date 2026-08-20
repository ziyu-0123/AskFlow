import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userReducer'
import type { UserStateType } from './userReducer'
import componentsReducer from './componentsReducer'
import type { ComponentsStateType } from './componentsReducer'
import pageInfoReducer, { type PageInfoType } from './pageInfoReducer'
import undoable, { excludeAction, type StateWithHistory } from 'redux-undo'

export type StateType = {
  user: UserStateType
  // components: ComponentsStateType
  components: StateWithHistory<ComponentsStateType> // 增加了 undo
  pageInfo: PageInfoType
}

export default configureStore({
  reducer: {
    user: userReducer,

    // // 没有 undo
    // components: componentsReducer,

    // 增加了 undo
    components: undoable(componentsReducer, {
      limit: 20, // 限制 undo 20 步
      filter: excludeAction([
        'components/resetComponents',
        'components/changeSelectedId',
        'components/selectPrevComponent',
        'components/selectNextComponent',
      ]),
    }),

    pageInfo: pageInfoReducer,
  },
})
