import { useRef, useEffect, useTransition, useState } from 'react';
import './Canvas.css';

type CanvasProps = React.DetailedHTMLProps<
React.CanvasHTMLAttributes<HTMLCanvasElement>,
HTMLCanvasElement>;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {

    const styles = {
        transform: `translate(${50}px, ${50}px)`,
        width: `${1000}px`,
        height: `${1000}px`,
    }

    enum colours  {
        red = 'red',
        blue = 'blue',
        green = 'green',
        lightblue = 'lightblue',
    }

    let board = Array(1000).fill(Array(1000).fill(colours.red));

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [mousePos, setMousepos] = useState({})

    useEffect(() => {
        const handleMouseMove = (event) => {
          setMousepos({ x: event.clientX, y: event.clientY });
        };
    
        window.addEventListener('mousemove', handleMouseMove);
    
        return () => {
          window.removeEventListener(
            'mousemove',
            handleMouseMove
          );
        };
      }, [])

    const click = () => {
        
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) {
            return;
        }
        const context = canvas.getContext('2d')
        if(!context) {
            return;
        }
        context.fillStyle = 'red';
        let a = 0;
        let b = 0;
        while (a<Number(props.width)) {
            while (b<Number(props.height)) {
                context.fillStyle = board[a][b];
                context.fillRect(a, b, 1, 1);
                b+=1;
            }
            b=0;
            a+=1;
        }

    }, [board])




    return <canvas onClick={click} width={props.width} height={props.height} ref={canvasRef} style={styles}/>
};

export default Canvas;