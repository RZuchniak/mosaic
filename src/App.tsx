import './App.css'
import Canvas from './Canvas'
import { useState } from 'react';
import { io } from "socket.io-client"

const socket = io('http://localhost:3000', {
  withCredentials: true,
  extraHeaders: {
    "my-custom-header": "abcd"
  }
});


socket.emit('Hello');

function App() {
  const [zoom, setzoom] = useState(1);
  

  const scroll = (e: WheelEvent) => {
    setzoom(Math.round(Math.max(Math.min((e.deltaY*-0.001) + zoom, 2.02), 0.15)*100)/100);
  }

  window.addEventListener('wheel', scroll);

  return ( 
      <div className='scaler' style={{transform: `scale(${zoom})`}}>
        <Canvas id="canvas" width={1000} height={1000} results={zoom}/>
      </div>
  )
}

export default App
