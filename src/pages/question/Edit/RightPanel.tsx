import type { FC } from 'react'
import { Tabs } from 'antd'
import { FileTextOutlined, SettingOutlined } from '@ant-design/icons'
import ComponentProp from './ComponentProp'

const RightPanel: FC = () => {
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
      children: <div>页面设置</div>,
    },
  ]

  return <Tabs defaultActiveKey="prop" items={tabsItems}></Tabs>
}

export default RightPanel
