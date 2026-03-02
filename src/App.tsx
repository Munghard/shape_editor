import './App.css'
import DrawingCanvas from './components/DrawingCanvas'

function App() {

  return (
    <>
      <div>
        <div className='fixed top-0 '>
          <h1 className='mb-10 text-zinc-400'>Shape editor</h1>
        </div>
        <DrawingCanvas />
      </div>
    </>
  )
}

export default App
