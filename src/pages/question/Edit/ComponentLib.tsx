import type { FC } from 'react'
import { Typography } from 'antd'
import { componentConfGroup } from '../../../components/QuestionComponents'

const { Title } = Typography
const Lib: FC = () => {
  return (
    <>
      {componentConfGroup.map((group, index) => {
        const { groupId, groupName } = group
        return (
          <div key={groupId}>
            <Title level={3} style={{ marginTop: index > 0 ? '20px' : '0', fontSize: '16px' }}>
              {groupName}
            </Title>
          </div>
        )
      })}
    </>
  )
}

export default Lib
