import type { FC } from 'react'
import useLoadQuestionData from '../../../hooks/useLoadQuestionData'
import styles from './index.module.scss'
import EditCanvas from './EditCanvas'

const Edit: FC = () => {
  const { loading } = useLoadQuestionData()

  return (
    <div className={styles.container}>
      <div style={{ backgroundColor: '#fff' }}>Header</div>
      <div className={styles['content-wrapper']}>
        <div className={styles.content}>
          <div className={styles.left}>L</div>
          <div className={styles.main}>
            <div className={styles['canvas-wrapper']}>
              {/* <div style={{ height: '900px' }}>画布，测试滚动</div> */}
              <EditCanvas loading={loading} />
            </div>
          </div>
          <div className={styles.right}>R</div>
        </div>
      </div>
    </div>
  )
}

export default Edit
