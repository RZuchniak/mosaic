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
        context.fillStyle = 'blue';
        context.fillRect(0,0,100,100);

    }, [])

    return <canvas width={props.width} height={props.height} ref={canvasRef}/>
};

export default Canvas;