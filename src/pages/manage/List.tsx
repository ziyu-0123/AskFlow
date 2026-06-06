import type { FC } from 'react'
import { useState } from 'react'
import { useTitle } from 'ahooks'
// import { useSearchParams } from 'react-router-dom'
import { Typography } from 'antd'
import QuestionCard from '../../components/QuestionCard'
import styles from './common.module.scss'
const rawQuestionList = [
  {
    _id: 'q1',
    title: '问卷1',
    isPublished: false,
    isStar: false,
    answerCount: 5,
    createdAt: '3月10日 13:23',
  },
  {
    _id: 'q2',
    title: '问卷2',
    isPublished: true,
    isStar: true,
    answerCount: 3,
    createdAt: '3月11日 13:23',
  },
  {
    _id: 'q3',
    title: '问卷3',
    isPublished: false,
    isStar: false,
    answerCount: 6,
    createdAt: '3月12日 13:23',
  },
  {
    _id: 'q4',
    title: '问卷4',
    isPublished: true,
    isStar: false,
    answerCount: 2,
    createdAt: '3月9日 13:23',
  },
]

const { Title } = Typography
const List: FC = () => {
  useTitle('AskFlow - My questionnaire')
  // const [searchParams] = useSearchParams()
  // console.log('keyword', searchParams.get('keyword'))

  const [questionList] = useState(rawQuestionList)
  return (
    <>
      <div className={styles.header}>
        <div className={styles.left}>
          <Title level={3} style={{ marginTop: 0 }}>
            我的问卷
          </Title>
        </div>
        <div className={styles.right}>(搜索)</div>
      </div>
      <div className={styles.content}>
        {questionList.length > 0 &&
          questionList.map(q => {
            const { _id } = q
            return <QuestionCard key={_id} {...q} />
          })}
      </div>
      <div className={styles.footer}>loadMore... 上划加载更多...</div>
    </>
  )
}

export default List
