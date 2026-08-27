import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense, type ComponentType, type ReactElement } from 'react'
import { Spin } from 'antd'

// 主 layout 作为根 shell 保持 eager（每个页面都要经过它）
import MainLayout from '../layouts/MainLayout'

// 路由级懒加载：每个二级 layout 与页面拆为独立 chunk
const ManageLayout = lazy(() => import('../layouts/ManageLayout'))
const QuestionLayout = lazy(() => import('../layouts/QuestionLayout'))
const Home = lazy(() => import('../pages/Home'))
const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const NotFound = lazy(() => import('../pages/NotFound'))
const List = lazy(() => import('../pages/manage/List'))
const Trash = lazy(() => import('../pages/manage/Trash'))
const Star = lazy(() => import('../pages/manage/Star'))
const Edit = lazy(() => import('../pages/question/Edit'))
const Stat = lazy(() => import('../pages/question/stat'))

// chunk 加载态：居中 Spin，与 MainLayout 内置 loading 视觉一致
const fallback = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Spin />
  </div>
)

// 用 Suspense 包裹懒加载组件，统一处理 chunk 加载态
function withSuspense(Comp: ComponentType): ReactElement {
  return (
    <Suspense fallback={fallback}>
      <Comp />
    </Suspense>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: withSuspense(Home),
      },
      {
        path: 'login',
        element: withSuspense(Login),
      },
      {
        path: 'register',
        element: withSuspense(Register),
      },
      {
        path: 'manage',
        element: withSuspense(ManageLayout),
        children: [
          {
            path: 'list',
            element: withSuspense(List),
          },
          {
            path: 'star',
            element: withSuspense(Star),
          },
          {
            path: 'trash',
            element: withSuspense(Trash),
          },
        ],
      },
      {
        path: '*',
        element: withSuspense(NotFound),
      },
    ],
  },
  {
    path: 'question',
    element: withSuspense(QuestionLayout),
    children: [
      {
        path: 'edit/:id',
        element: withSuspense(Edit),
      },
      {
        path: 'stat/:id',
        element: withSuspense(Stat),
      },
    ],
  },
])

export default router

export const HOME_PATHNAME = '/'
export const LOGIN_PATHNAME = '/login'
export const REGISTER_PATHNAME = '/register'
export const MANAGE_INDEX_PATHNAME = '/manage/list'

export function isLoginOrRegister(pathname: string) {
  if ([LOGIN_PATHNAME, REGISTER_PATHNAME].includes(pathname)) return true
  return false
}

export function isNoNeedUserInfo(pathname: string) {
  if ([HOME_PATHNAME, LOGIN_PATHNAME, REGISTER_PATHNAME].includes(pathname)) return true
  return false
}
