// import { useRequest } from 'ahooks'
// import { getQuestionListService } from '../services/question'
// import { useSearchParams } from 'react-router-dom'
// import { LIST_SEARCH_PARAM_KEY } from '../constant/index'
// import { useLocation } from 'react-router-dom'

// function useLoadQuestionListData() {
//   const location = useLocation()
//   const [searchParams] = useSearchParams()

//   console.log('🔄 Hook 执行，当前 location.search:', location.search) // 👈 加这行

//   const { data, loading, error } = useRequest(
//     async () => {
//       const keyword = searchParams.get(LIST_SEARCH_PARAM_KEY) || ''
//       console.log('📡 发起请求，关键词:', keyword) // 👈 加这行
//       const data = await getQuestionListService({ keyword })
//       return data
//     },
//     {
//       // refreshDeps: [searchParams], // 刷新的依赖项
//       refreshDeps: [location.search],
//     }
//   )
//   return { data, loading, error }
// }
// export default useLoadQuestionListData

import { useRequest } from 'ahooks'
import { useLocation } from 'react-router-dom'
import { getQuestionListService } from '../services/question'
import { LIST_SEARCH_PARAM_KEY } from '../constant'

type OptionType = {
  isStar: boolean
  isDeleted: boolean
}

function useLoadQuestionListData(opt: Partial<OptionType> = {}) {
  const { isStar, isDeleted } = opt

  const location = useLocation()

  // 从 URL 解析 keyword
  const params = new URLSearchParams(location.search)
  const keyword = params.get(LIST_SEARCH_PARAM_KEY) || ''

  const { data, loading, error } = useRequest(
    async () => {
      const data = await getQuestionListService({ keyword, isStar, isDeleted })
      return data
    },
    {
      // 监听 location.search 变化
      refreshDeps: [location.search],
    }
  )

  // 返回解构好的数据，方便使用
  const list = data?.list ?? []
  const total = data?.total ?? 0

  return { loading, error, list, total }
}

export default useLoadQuestionListData
