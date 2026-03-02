import './App.css'
import DrawingCanvas from './components/DrawingCanvas'

function App() {

  return (
    <>
      <div>
        <h1 className='mb-10 text-zinc-400'>Shape editor</h1>
        <DrawingCanvas />
      </div>
    </>
  )
}

export default App
