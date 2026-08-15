import { useEffect, type FC } from 'react'
import { Form, Input } from 'antd'
import type { QuestionInfoPropsType } from './interface'

const { TextArea } = Input

const PropComponent: FC = (props: QuestionInfoPropsType) => {
  const { title, desc, onChange, disabled } = props
  const [form] = Form.useForm()

  useEffect(() => {
    form.setFieldsValue({ title, desc })
  }, [title, desc])

  function handleValuesChange() {
    if (onChange) {
      onChange(form.getFieldsValue())
    }
  }

  return (
    <Form
      layout="vertical"
      initialValues={{ title, desc }}
      onValuesChange={handleValuesChange}
      form={form}
      disabled={disabled}
    >
      <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入问卷标题' }]}>
        <Input></Input>
      </Form.Item>
      <Form.Item label="描述" name="desc">
        <TextArea></TextArea>
      </Form.Item>
    </Form>
  )
}

export default PropComponent
