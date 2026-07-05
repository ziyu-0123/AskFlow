import type { FC } from 'react'
import useLoadQuestionData from '../../../hooks/useLoadQuestionData'

const Stat: FC = () => {
  const { loading, questionData } = useLoadQuestionData()

  return (
    <div>
      <p>Stat Page</p>
      {loading ? <p>loading</p> : <p>{JSON.stringify(questionData)}</p>}
    </div>
  )
}

export default Stat
