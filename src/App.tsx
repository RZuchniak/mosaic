import './App.css'
import Canvas from './Canvas'
import { useState } from 'react';
import { io } from "socket.io-client"

const socket = io('http://localhost:8000');

socket.on('reply', () => {
  console.log('received');
})

socket.emit('Hello');

function App() {
  const [zoom, setzoom] = useState(1);
  

  const scroll = (e: WheelEvent) => {
    setzoom(Math.round(Math.max(Math.min((e.deltaY*-0.002) + zoom, 11.03), 0.49)*100)/100);
  }

  window.addEventListener('wheel', scroll);

  return ( 
      <div className='scaler' style={{transform: `scale(${zoom})`}}>
        <Canvas id="canvas" width={1000} height={1000} results={zoom}/>
      </div>
  )
}

export default App
