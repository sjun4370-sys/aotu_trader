import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import WorkflowPage from './components/workflow/WorkflowPage'
import WorkflowListPage from './components/workflow/WorkflowListPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 首页 - 工作流列表 */}
        <Route path="/" element={<WorkflowListPage />} />
        
        {/* 新建工作流 - 空白编辑器 */}
        <Route path="/workflow/new" element={<WorkflowPage />} />
        
        {/* 编辑工作流 - 加载现有配置 */}
        <Route path="/workflow/:id" element={<WorkflowPage />} />
        
        {/* 重定向未知路由到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
