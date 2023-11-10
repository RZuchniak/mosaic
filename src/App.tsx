import './App.css'
import Canvas from './Canvas'

function App() {
  return ( 
    <div className='position'>
      <div className='scaler'>
        <Canvas id={"canvas"} width={1000} height={1000}/>
      </div>
    </div>
  )
}

export default App
