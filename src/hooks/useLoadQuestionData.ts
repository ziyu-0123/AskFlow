import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getQuestionService } from '../services/question'
import type { QuestionData } from '../services/question'
function useLoadQuestionData() {
  const { id = '' } = useParams()
  const [loading, setLoading] = useState(true)
  const [questionData, setQuestionData] = useState({})

  useEffect(() => {
    async function fn() {
      const data: QuestionData = await getQuestionService(id)
      setLoading(false)
      setQuestionData(data)
    }
    fn()
  }, [id])

  return { loading, questionData }
}

export default useLoadQuestionData
