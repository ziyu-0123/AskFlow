import type { FC } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useTitle, useDebounceFn, useRequest } from 'ahooks'
import { Typography, Spin, Empty } from 'antd'
import { useSearchParams } from 'react-router-dom'
import { getQuestionListService } from '../../services/question'
import { LIST_PAGE_SIZE, LIST_SEARCH_PARAM_KEY } from '../../constant'
import QuestionCard from '../../components/QuestionCard'
import styles from './common.module.scss'
import ListSearch from '../../components/ListSearch'
import type { QuestionData } from '../../services/question'

const { Title } = Typography

const List: FC = () => {
  useTitle('AskFlow - My Questionnaires')

  const [page, setPage] = useState(1)
  const [list, setList] = useState<QuestionData[]>([])
  const [total, setTotal] = useState(0)
  const haveMoreData = total > list.length

  const [searchParams] = useSearchParams()

  const containerRef = useRef<HTMLDivElement>(null)

  // 加载函数
  const { run: load, loading } = useRequest(
    async () => {
      const data = await getQuestionListService({
        page,
        pageSize: LIST_PAGE_SIZE,
        keyword: searchParams.get(LIST_SEARCH_PARAM_KEY) || '',
      })
      return data
    },
    {
      manual: true,
      onSuccess(result) {
        const { list: l = [], total = 0 } = result
        setList([...list, ...l])
        setTotal(total)
        setPage(page + 1)
      },
    }
  )

  // 尝试触发加载的函数
  const { run: tryLoadMore } = useDebounceFn(
    () => {
      const elem = containerRef.current
      if (elem === null) return
      const domRect = elem.getBoundingClientRect()
      if (domRect === null) return
      const { bottom } = domRect
      if (bottom <= document.body.clientHeight) load()
    },
    {
      wait: 500,
    }
  )

  // 1.当页面加载或者 url 参数改变时，触发 tryLoadMore
  useEffect(() => {
    tryLoadMore()
  }, [searchParams])

  // 2.当页面滚动时，尝试触发 tryLoadMore
  useEffect(() => {
    if (haveMoreData) {
      window.addEventListener('scroll', tryLoadMore)
    }

    // 这个 cleanup 函数不会立即执行
    // 它会在组件卸载或下次 effect 执行前才执行
    return () => {
      window.removeEventListener('scroll', tryLoadMore)
    }
  }, [searchParams, haveMoreData])

  return (
    <>
      <div className={styles.header}>
        <div className={styles.left}>
          <Title level={3} style={{ marginTop: 0 }}>
            我的问卷
          </Title>
        </div>
        <div className={styles.right}>
          <ListSearch />
        </div>
      </div>
      <div className={styles.content}>
        {/* <div style={{ height: '2000px' }}></div> */}
        {loading && (
          <div style={{ textAlign: 'center' }}>
            <Spin />
          </div>
        )}
        {!loading &&
          list.length > 0 &&
          list.map(q => {
            const { _id } = q
            return <QuestionCard key={_id} {...q} />
          })}
        {!loading && list.length === 0 && <Empty description="暂无数据" />}
      </div>
      <div className={styles.footer}>
        <div ref={containerRef}>上划加载更多...</div>
      </div>
    </>
  )
}

export default List
