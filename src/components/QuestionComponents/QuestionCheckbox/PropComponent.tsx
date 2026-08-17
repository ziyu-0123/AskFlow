import { useEffect, type FC } from 'react'
import { nanoid } from 'nanoid'
import { Form, Input, Checkbox, Space, Button } from 'antd'
import { type QuestionCheckboxPropsType, type OptionType } from './interface'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'

const PropComponent: FC = (props: QuestionCheckboxPropsType) => {
  const { title, isVertical, list = [], onChange, disabled } = props
  const [form] = Form.useForm()

  // 切换选中的组件时，把外部 props 同步回表单（initialValues 只在首次挂载生效）
  useEffect(() => {
    form.setFieldsValue({ title, isVertical, list })
  }, [title, isVertical, list])

  function handleValuesChange() {
    if (onChange == null) return
    // 必须传 true：Form.List 动态增删时，新增字段的 Form.Item 尚未注册，
    // 不传 true 的 getFieldsValue() 只返回已注册字段，会丢掉新增项
    const newValues = form.getFieldsValue(true) as QuestionCheckboxPropsType
    const { list = [] } = newValues
    // 为 value 为空的选项补齐唯一值
    // 注意：不能直接 opt.value = ...，list 来自 Redux（immer 默认冻结）是只读的，必须返回新对象
    const fixedList = list.map(opt => (opt.value ? opt : { ...opt, value: nanoid(5) }))
    onChange({ ...newValues, list: fixedList })
  }

  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{ title, isVertical, list }}
      disabled={disabled}
      onValuesChange={handleValuesChange}
    >
      <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
        <Input></Input>
      </Form.Item>
      <Form.Item label="选项">
        <Form.List name="list">
          {(fields, { add, remove }) => (
            <>
              {/* 遍历所有选项 */}
              {fields.map(({ key, name }, index) => {
                return (
                  <Space key={key} align="baseline">
                    {/* 当前选项是否选中 */}
                    <Form.Item name={[name, 'checked']} valuePropName="checked">
                      <Checkbox />
                    </Form.Item>
                    {/* 当前选项输入框 */}
                    <Form.Item
                      name={[name, 'text']}
                      rules={[
                        { required: true, message: '请输入选项文字' },
                        {
                          validator: (_, text) => {
                            const { list = [] } = form.getFieldsValue()
                            let num = 0
                            list.forEach((opt: OptionType) => {
                              if (opt.text === text) num++ // 记录 text 相同的个数，预期只有一个
                            })

                            if (num === 1) return Promise.resolve()
                            return Promise.reject(new Error('和其他选项重复'))
                          },
                        },
                      ]}
                    >
                      <Input placeholder="请输入选项文字..."></Input>
                    </Form.Item>
                    {/* 当前选项删除按钮 */}
                    {index > 0 && <MinusCircleOutlined onClick={() => remove(name)} />}
                  </Space>
                )
              })}

              {/* 添加选项 */}
              <Form.Item>
                <Button
                  type="link"
                  onClick={() => add({ text: '', value: '', checked: false })}
                  icon={<PlusOutlined />}
                  block
                >
                  添加选项
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form.Item>
      <Form.Item name="isVertical" valuePropName="checked">
        <Checkbox>竖向排列</Checkbox>
      </Form.Item>
    </Form>
  )
}

export default PropComponent
