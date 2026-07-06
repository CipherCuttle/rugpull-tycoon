import { ClassicChartScreen } from './screens/ClassicChartScreen'
import { TopdownExtractionScreen } from './screens/TopdownExtractionScreen'
import './styles/theme.css'

function App() {
  if (window.location.pathname === '/classic') {
    return <ClassicChartScreen />
  }

  return <TopdownExtractionScreen />
}

export default App
