import { useRef, useEffect, useTransition, useState } from 'react';
import './Canvas.css';

type CanvasProps = React.DetailedHTMLProps<
React.CanvasHTMLAttributes<HTMLCanvasElement>,
HTMLCanvasElement>;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {
    
    enum Colour  {
        Red = 'red',
        Blue = 'blue',
        Green = 'green',
        LightBlue = 'lightblue',
    }

    let board = Array(1000).fill(Array(1000).fill(Colour.Red));

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [zoom, setzoom] = useState(1)

    useEffect(() => {
        console.log("1: " + zoom)
        setzoom(props.results || 1);
        console.log("2: " + zoom);
    }, [props.results])

    useEffect(() => {
        let locationx = 0;
        let locationy = 0;
        const move = (e: MouseEvent) => {
            if(e.buttons === 2){
                console.log(e.clientX, e.clientY, "move");
                const canvas = canvasRef.current;
                if(!canvas) {
                    return;
                }
                locationx = Math.max(0, Math.min((locationx + (e.movementX * (1/zoom))) , 1000))
                locationy = Math.max(-100, Math.min((locationy + (e.movementY * (1/zoom))) , 500))
                console.log(e.movementX);
                console.log({locationx, locationy});
                canvas.style.transform = `translate(${locationx}px, ${locationy}px)`
            }
        }
        const contextMenu = (e: Event) => {
            e.preventDefault();
        }


        window.addEventListener('mousemove', move);
        window.addEventListener('contextmenu', contextMenu);
        
        return () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('contextmenu', contextMenu);
        }
      }, []);


    const click = (e: any) => {
        
        const canvas = canvasRef.current;
        if(!canvas) {
            return;
        }
        const context = canvas.getContext('2d')
        if(!context) {
            return;
        }
        const x = e.clientX;
        const y = e.clientY;

        const rect = canvas.getBoundingClientRect();
        console.log(rect.left);
        const x1 = x - (rect.left);
        const y1 = y - (rect.top);
        context.fillStyle = 'blue';
        context.fillRect(800, 800, 5, 5);
        board[Math.round(x1)][Math.round(y1)] = Colour.Blue;
        
    }

    

    useEffect(() => {
        console.log("start");
        const canvas = canvasRef.current;
        if(!canvas) {
            return;
        }
        const context = canvas.getContext('2d');
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

    }, []);


    return <canvas onClick={click} width={props.width} height={props.height} ref={canvasRef}/>
};

export default Canvas;