import './App.css'
import Canvas from './Canvas'
import { useState } from 'react';

function App() {
  const [zoom, setzoom] = useState(1);
  

  const scroll = (e: WheelEvent) => {
    setzoom(Math.max(Math.min((Math.round((e.deltaY*-0.001)*100))/100 + zoom, 2.05), 0.15));
  }

  window.addEventListener('wheel', scroll);

  return ( 
    <div className='position'>
      <div className='scaler' style={{transform: `scale(${zoom})`}}>
        <Canvas id="canvas" width={1000} height={1000} results={zoom}/>
      </div>
    </div>
  )
}

export default App
