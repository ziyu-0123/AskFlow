import type { FC } from 'react'
import { Typography } from 'antd'
import { componentConfGroup } from '../../../components/QuestionComponents'
import type { ComponentConfType } from '../../../components/QuestionComponents'
import styles from './ComponentLib.module.scss'

const { Title } = Typography

function genComponent(c: ComponentConfType) {
  const { Component } = c
  return (
    <div className={styles.wrapper}>
      <div className={styles.component}>
        <Component />
      </div>
    </div>
  )
}

const Lib: FC = () => {
  return (
    <>
      {componentConfGroup.map((group, index) => {
        const { groupId, groupName, components } = group
        return (
          <div key={groupId}>
            <Title level={3} style={{ marginTop: index > 0 ? '20px' : '0', fontSize: '16px' }}>
              {groupName}
            </Title>
            <div>{components.map(c => genComponent(c))}</div>
          </div>
        )
      })}
    </>
  )
}

export default Lib
