import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRequest } from 'ahooks'
import { useDispatch } from 'react-redux'
import { getQuestionService } from '../services/question'
import { resetComponents } from '../store/componentsReducer'
import type { ComponentPropsType } from '../components/QuestionComponents'

function useLoadQuestionData() {
  const { id = '' } = useParams()
  const dispatch = useDispatch()

  // ajax 加载
  const { data, loading, error, run } = useRequest(
    async (id: string) => {
      if (!id) throw new Error('没有问卷 id')
      const data = await getQuestionService(id)
      return data
    },
    {
      manual: true,
    }
  )

  // 根据获取的 data 设置 redux store
  useEffect(() => {
    if (!data) return

    const { componentList = [] } = data

    // 将服务端 ComponentData 转换为 store 需要的 ComponentInfoType
    // 服务端的 id 作为前端的 fe_id 使用
    const newComponentList = componentList.map(c => {
      const { id, type, title, props } = c
      return {
        fe_id: id,
        type,
        title,
        props: props as ComponentPropsType,
      }
    })

    // 获取默认 selectedId
    let selectedId = ''
    if (newComponentList.length > 0) {
      selectedId = newComponentList[0].fe_id
    }

    dispatch(
      resetComponents({ componentList: newComponentList, selectedId, copiedComponent: null })
    )
  }, [data])

  // 判断 id 变化，执行 ajax 加载问卷数据
  useEffect(() => {
    run(id)
  }, [id])

  return { loading, error }
}

export default useLoadQuestionData
