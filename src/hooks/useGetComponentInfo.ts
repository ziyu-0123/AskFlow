import { useSelector } from 'react-redux'
import type { StateType } from '../store'

function useGetComponentInfo() {
  const components = useSelector((state: StateType) => state.components)

  const { componentList = [], selectedId } = components

  const selectedComponent = componentList.find(c => c.fe_id === selectedId)

  return {
    componentList,
    selectedId,
    selectedComponent,
  }
}

export default useGetComponentInfo
