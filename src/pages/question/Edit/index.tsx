import type { FC } from 'react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getQuestionService } from '../../../services/question'
import type { QuestionData } from '../../../services/question'

const Edit: FC = () => {
  const { id = '' } = useParams()

  useEffect(() => {
    async function fn() {
      // data 有明确的类型 QuestionData
      const data: QuestionData = await getQuestionService(id)
      console.log('edit page data', data)
    }
    fn()
  }, [id])

  return <p>Edit {id}</p>
}

export default Edit
