import { useRef, useEffect, useTransition, useState } from 'react';
import './Canvas.css';

type CanvasProps = React.DetailedHTMLProps<
React.CanvasHTMLAttributes<HTMLCanvasElement>,
HTMLCanvasElement>;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {

    const [locationx, setlocationx] = useState(0);
    const [locationy, setlocationy] = useState(0);

    const [mouselocationx, setmouselocationx] = useState(0);
    const [mouselocationy, setmouselocationy] = useState(0);

    enum Colour  {
        Red = 'red',
        Blue = 'blue',
        Green = 'green',
        LightBlue = 'lightblue',
    }

    let board = Array(1000).fill(Array(1000).fill(Colour.Red));

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    
    const move = () => {
        addEventListener('mousemove', (e) => {
            console.log(e.clientX, e.clientY, "move");
            setmouselocationx(e.clientX);
            setmouselocationy(e.clientY);
        })
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) {
            return;
        }
        canvas.style.transform = `translate(${locationx}px, ${locationy}px)`
        console.log(locationx, locationy, "location");
        setlocationx(mouselocationx);
        setlocationy(mouselocationy);
    }, [mouselocationx, mouselocationy  ])

    const click = () => {
        addEventListener('click', (e) => {

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
            const x1 = x - rect.left;
            const y1 = y - rect.top;
            context.fillStyle = 'blue';
            context.fillRect(x1, y1, 5, 5);
            board[x1][y1] = Colour.Blue;
        })
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




    return <canvas onClick={click} onMouseDown={move} width={props.width} height={props.height} ref={canvasRef}/>
};

export default Canvas;