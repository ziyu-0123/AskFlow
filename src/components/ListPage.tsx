import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { Pagination } from 'antd'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { LIST_PAGE_SIZE, LIST_PAGE_PARAM_KEY, LIST_PAGE_SIZE_PARAM_KEY } from '../constant'

type PropsType = {
  total: number
}

const ListPage: FC<PropsType> = (props: PropsType) => {
  // const location = useLocation()
  // const params = new URLSearchParams(location.search)

  const { total } = props
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(LIST_PAGE_SIZE)

  // 从 url 参数中找到 page、pageSize，同步到 Pagination 的 defaultCurrent、Pagination 中
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const page = parseInt(searchParams.get(LIST_PAGE_PARAM_KEY) || '') || 1
    setCurrent(page)
    const pageSize = parseInt(searchParams.get(LIST_PAGE_SIZE_PARAM_KEY) || '') || LIST_PAGE_SIZE
    setPageSize(pageSize)
  }, [searchParams])

  // 当页码改变时改变 url 参数
  const nav = useNavigate()
  const { pathname } = useLocation()
  function handlePageChange(page: number, pageSize: number) {
    searchParams.set(LIST_PAGE_PARAM_KEY, page.toString())
    searchParams.set(LIST_PAGE_SIZE_PARAM_KEY, pageSize.toString())
    nav({
      pathname,
      search: searchParams.toString(),
    })
  }

  return (
    <Pagination current={current} pageSize={pageSize} total={total} onChange={handlePageChange} />
  )
}
export default ListPage
