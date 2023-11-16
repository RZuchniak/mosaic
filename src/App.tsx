import './App.css'
import Canvas from './components/Canvas/Canvas'
import { useState } from 'react';

import { socket } from './socket';

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
