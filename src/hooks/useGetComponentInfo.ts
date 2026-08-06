import { useSelector } from 'react-redux'
import type { StateType } from '../store'

function useGetComponentInfo() {
  const components = useSelector((state: StateType) => state.components)

  const { componentList = [] } = components

  return {
    componentList,
  }
}

export default useGetComponentInfo
