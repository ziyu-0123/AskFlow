// import type { FC } from 'react'
// // import { useState, useEffect } from 'react'
// import { useTitle } from 'ahooks'
// // import { useSearchParams } from 'react-router-dom'
// import { Typography, Spin } from 'antd'
// import QuestionCard from '../../components/QuestionCard'
// import styles from './common.module.scss'
// import ListSearch from '../../components/ListSearch'
// import { type QuestionListData } from '../../services/question'
// import useLoadQuestionListData from '../../hooks/useLoadQuestionData'

// const { Title } = Typography

// const List: FC = () => {
//   useTitle('AskFlow - My Questionnaires')

//   const { data, loading } = useLoadQuestionListData()
//   const { list = [], total = 0 } = (data || { list: [], total: 0 }) as QuestionListData

//   // const [list, setList] = useState<QuestionData[]>([])
//   // const [total, setTotal] = useState(0)

//   // useEffect(() => {
//   //   async function load() {
//   //     const data = await getQuestionListService()
//   //     const { list = [], total = 0 } = data
//   //     setList(list)
//   //     setTotal(total)
//   //   }
//   //   load()
//   // }, [])

//   // const [searchParams] = useSearchParams()
//   // console.log('keyword', searchParams.get('keyword'))
//   return (
//     <>
//       <div className={styles.header}>
//         <div className={styles.left}>
//           <Title level={3} style={{ marginTop: 0 }}>
//             我的问卷
//           </Title>
//         </div>
//         <div className={styles.right}>
//           <ListSearch />
//         </div>
//       </div>
//       <div className={styles.content}>
//         {loading && (
//           <div style={{ textAlign: 'center' }}>
//             <Spin />
//           </div>
//         )}
//         {!loading &&
//           list.length > 0 &&
//           list.map(q => {
//             const { _id } = q
//             return <QuestionCard key={_id} {...q} />
//           })}
//       </div>
//       <div className={styles.footer}>loadMore... 上划加载更多...</div>
//     </>
//   )
// }

// export default List

import type { FC } from 'react'
import { useTitle } from 'ahooks'
import { Typography, Spin, Empty } from 'antd'
import QuestionCard from '../../components/QuestionCard'
import styles from './common.module.scss'
import ListSearch from '../../components/ListSearch'
import useLoadQuestionListData from '../../hooks/useLoadQuestionListData'

const { Title } = Typography

const List: FC = () => {
  useTitle('AskFlow - My Questionnaires')

  const { list, loading, total } = useLoadQuestionListData()

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
        {total > 0 && `共 ${total} 份问卷`}
        <br />
        上划加载更多...
      </div>
    </>
  )
}

export default List
