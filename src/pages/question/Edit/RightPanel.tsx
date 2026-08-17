import { type FC, useState, useEffect } from 'react'
import { Tabs } from 'antd'
import { FileTextOutlined, SettingOutlined } from '@ant-design/icons'
import ComponentProp from './ComponentProp'
import PageSetting from './PageSetting'
import useGetComponentInfo from '../../../hooks/useGetComponentInfo'

// 用常量对象替代 enum（erasableSyntaxOnly 不允许 enum 语法）
const TAB_KEYS = {
  PROP_KEY: 'prop',
  SETTING_KEY: 'setting',
} as const

const RightPanel: FC = () => {
  const [activeKey, setActiveKey] = useState<'prop' | 'setting'>(TAB_KEYS.PROP_KEY)

  const { selectedId } = useGetComponentInfo()

  useEffect(() => {
    if (selectedId) setActiveKey(TAB_KEYS.PROP_KEY)
    else setActiveKey(TAB_KEYS.SETTING_KEY)
  }, [selectedId])

  const tabsItems = [
    {
      key: 'prop',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 4 }} />
          属性
        </span>
      ),
      children: <ComponentProp />,
    },
    {
      key: 'setting',
      label: (
        <span>
          <SettingOutlined style={{ marginRight: 4 }} />
          页面设置
        </span>
      ),
      children: <PageSetting />,
    },
  ]

  return <Tabs activeKey={activeKey} items={tabsItems}></Tabs>
}

export default RightPanel
