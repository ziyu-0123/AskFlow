import type { FC } from 'react'
import { Outlet } from 'react-router-dom'

const QuestionLayout: FC = () => {
  return (
    <>
      <p>QuestionLayout left</p>
      <div>
        <Outlet />
      </div>
    </>
  )
}

export default QuestionLayout
