import type { FC } from 'react'
import type { QuestionInputPropsType } from './QuestionInput'
import QuestionInputConf from './QuestionInput'
import QuestionTitleConf from './QuestionTitle'
import type { QuestionTitlePropsType } from './QuestionTitle'
import QuestionParagraphConf from './QuestionParagraph'
import type { QuestionParagraphPropsType } from './QuestionParagraph'

// 统一,各个组件的 prop type
export type ComponentPropsType = QuestionInputPropsType &
  QuestionTitlePropsType &
  QuestionParagraphPropsType

// 统一，组件的配置
export type ComponentConfType = {
  title: string
  type: string
  Component: FC<ComponentPropsType>
  PropComponent: FC<ComponentPropsType>
  defaultProps: ComponentPropsType
}

// 全部组件配置列表
const componentConfList: ComponentConfType[] = [
  QuestionInputConf,
  QuestionTitleConf,
  QuestionParagraphConf,
]

// 组件分组
export const componentConfGroup = [
  {
    groupId: 'textGroup',
    groupName: '文本显示',
    components: [QuestionTitleConf, QuestionParagraphConf],
  },
  {
    groupId: 'inputGroup',
    groupName: '用户输入',
    components: [QuestionInputConf],
  },
]

export function getComponentConfByType(type: string) {
  return componentConfList.find(c => c.type === type)
}
