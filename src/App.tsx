import './App.css'
import Canvas from './components/Canvas/Canvas'
import { useState } from 'react';

import { socket } from './socket';
import Selector from './components/Selector/Selector';

socket.on('reply', () => {
  console.log('received');
})

socket.emit('Hello');



function App() {
  const [zoom, setZoom] = useState(1);
  const [colour, setColour] = useState("0xff0000");

  const scroll = (e: WheelEvent) => {
    setZoom(Math.round(Math.max(Math.min((e.deltaY*-0.002) + zoom, 11.03), 0.49)*100)/100);
  }

  window.addEventListener('wheel', scroll);

  return (
    <div className="App">
      <div className='scaler' style={{transform: `scale(${zoom})`}}>
        <Canvas id="canvas" width={1000} height={1000} results={zoom} colour={colour}/>
      </div>
      <div className='selector'>
        <Selector colour={colour} setColour={setColour}/>
      </div>
    </div>
  )
}

export default App
