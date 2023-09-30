import { useRef, useEffect } from 'react';

type CanvasProps = React.DetailedHTMLProps<
React.CanvasHTMLAttributes<HTMLCanvasElement>,
HTMLCanvasElement>;

const Canvas: React.FC<CanvasProps> = ({ ...props }) => {

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
                context.fillStyle = 'red';
                context.fillRect(a, b, 20, 20);
                b+=21;
            }
            b=0;
            a+=21;
        }

    }, [])

    return <canvas width={props.width} height={props.height} ref={canvasRef}/>
};

export default Canvas;