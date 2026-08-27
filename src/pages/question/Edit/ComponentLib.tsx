import { type FC, useCallback } from 'react'
import { Typography } from 'antd'
import { nanoid } from 'nanoid'
import { useDispatch } from 'react-redux'
import { componentConfGroup } from '../../../components/QuestionComponents'
import type { ComponentConfType } from '../../../components/QuestionComponents'
import styles from './ComponentLib.module.scss'
import { addComponent } from '../../../store/componentsReducer'

const { Title } = Typography

function genComponent(c: ComponentConfType) {
  const { title, type, Component, defaultProps } = c
  const dispatch = useDispatch()

  const handleClick = useCallback(() => {
    dispatch(
      addComponent({
        fe_id: nanoid(), // 前端生成的 id
        title,
        type,
        props: defaultProps,
      })
    )
  }, [])

  return (
    <div key={type} className={styles.wrapper} onClick={handleClick}>
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
