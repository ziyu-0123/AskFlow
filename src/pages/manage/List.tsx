import type { FC } from 'react'
import { useState, useEffect, useRef, useMemo } from 'react'
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

  const [started, setStarted] = useState(false)
  const [page, setPage] = useState(1)
  const [list, setList] = useState<QuestionData[]>([])
  const [total, setTotal] = useState(0)
  const haveMoreData = total > list.length

  const [searchParams] = useSearchParams()
  const keyword = searchParams.get(LIST_SEARCH_PARAM_KEY) || ''

  // keyword 变化时重新加载
  useEffect(() => {
    setStarted(false)
    setPage(1)
    setList([])
    setTotal(0)
  }, [keyword])

  const containerRef = useRef<HTMLDivElement>(null)

  // 加载函数
  const { run: load, loading } = useRequest(
    async () => {
      const data = await getQuestionListService({
        page,
        pageSize: LIST_PAGE_SIZE,
        keyword,
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
      if (bottom <= document.body.clientHeight) {
        load()
        setStarted(true)
      }
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

  const LoadMoreContentElem = useMemo(() => {
    if (!started || loading) return <Spin />
    if (total === 0) return <Empty description="暂无数据" />
    if (!haveMoreData) return <span>没有更多了</span>
    return <span>开始加载下一页</span>
  }, [started, loading, haveMoreData])

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
        {list.length > 0 &&
          list.map(q => {
            const { _id } = q
            return <QuestionCard key={_id} {...q} />
          })}
      </div>
      <div className={styles.footer}>
        <div ref={containerRef}>{LoadMoreContentElem}</div>
      </div>
    </>
  )
}

export default List
