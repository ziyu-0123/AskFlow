import { type FC, useRef, useMemo, useState } from 'react'
import styles from './StatHeader.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import {
  message,
  Modal,
  Space,
  Button,
  Typography,
  Input,
  Tooltip,
  Popover,
  type InputRef,
} from 'antd'
import { LeftOutlined, CopyOutlined, QrcodeOutlined, FileTextOutlined } from '@ant-design/icons'
import useGetPageInfo from '../../../hooks/useGetPageInfo'
import useGetUserInfo from '../../../hooks/useGetUserInfo'
import AIReportModal from './AIReportModal'
import { QRCodeCanvas as QRCode } from 'qrcode.react'

const { Title } = Typography

const StatHeader: FC = () => {
  const nav = useNavigate()
  const { id = '' } = useParams()
  const { title, isPublished } = useGetPageInfo()
  const { aiConfigured } = useGetUserInfo()
  const [reportOpen, setReportOpen] = useState(false)

  // 拷贝链接
  const urlInputRef = useRef<InputRef>(null)
  function copy() {
    const elem = urlInputRef.current
    if (elem == null) return
    elem.select() // 选中 input 的内容
    document.execCommand('copy') // 拷贝选中内容 （富文本编辑器的操作）
    message.success('拷贝成功')
  }

  // function genLinkAndQRCodeElem() {
  //   if (!isPublished) return null

  //   // 拼接 url ，指向 C 端(端口 3000)
  //   const url = `http://localhost:3000/question/${id}`

  //   // 定义二维码组件
  //   const QRCodeElem = (
  //     <div style={{ textAlign: 'center' }}>
  //       <QRCode value={url} size={150} />
  //     </div>
  //   )

  //   return (
  //     <Space>
  //       <Input value={url} style={{ width: '300px' }} ref={urlInputRef} />
  //       <Tooltip title="拷贝链接">
  //         <Button icon={<CopyOutlined />} onClick={copy}></Button>
  //       </Tooltip>
  //       <Popover content={QRCodeElem}>
  //         <Button icon={<QrcodeOutlined />}></Button>
  //       </Popover>
  //     </Space>
  //   )
  // }

  // 使用 useMemo 1. 依赖项是否经常变化; 2. 缓存的元素是否创建成本较高
  const LinkAndQRCodeElem = useMemo(() => {
    if (!isPublished) return null

    // 拼接 url ，需要参考 C 端的规则；部署时用 VITE_CLIENT_BASE 配置 C 端地址
    const url = `${import.meta.env.VITE_CLIENT_BASE || 'http://localhost:3000'}/question/${id}`

    // 定义二维码组件
    const QRCodeElem = (
      <div style={{ textAlign: 'center' }}>
        <QRCode value={url} size={150} />
      </div>
    )

    return (
      <Space>
        <Input value={url} style={{ width: '300px' }} ref={urlInputRef} />
        <Tooltip title="拷贝链接">
          <Button icon={<CopyOutlined />} onClick={copy}></Button>
        </Tooltip>
        <Popover content={QRCodeElem}>
          <Button icon={<QrcodeOutlined />}></Button>
        </Popover>
      </Space>
    )
  }, [id, isPublished])

  return (
    <div className={styles['header-wrapper']}>
      <div className={styles.header}>
        <div className={styles.left}>
          <Space>
            <Button type="link" icon={<LeftOutlined />} onClick={() => nav(-1)}>
              返回
            </Button>
            <Title>{title}</Title>
          </Space>
        </div>
        <div className={styles.main}>{LinkAndQRCodeElem}</div>
        <div className={styles.right}>
          <Space>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => {
                // 未配置时引导（照搬编辑页 AI 按钮模式），配置过直接开报告弹窗
                if (!aiConfigured) {
                  Modal.warning({
                    title: '请先配置 AI 模型',
                    content: '使用 AI 解读报告需先配置 API Key，请点击顶部昵称 → AI 设置完成配置',
                    okText: '知道了',
                  })
                  return
                }
                setReportOpen(true)
              }}
            >
              AI 解读报告
            </Button>
            <Button type="primary" onClick={() => nav(`/question/edit/${id}`)}>
              编辑问卷
            </Button>
          </Space>
        </div>
      </div>

      <AIReportModal questionId={id} open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  )
}

export default StatHeader
