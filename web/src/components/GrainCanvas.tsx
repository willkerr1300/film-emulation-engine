import React, { useEffect, useRef } from 'react';

const GrainCanvas: React.FC<{ intensity: number }> = ({ intensity }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        // Vertex shader program
        const vsSource = `
            attribute vec4 aVertexPosition;
            void main() {
                gl_Position = aVertexPosition;
            }
        `;

        // Fragment shader program (placeholder, will load from file or string)
        const fsSource = `
            precision mediump float;
            uniform float uTime;
            uniform float uIntensity;
            uniform vec2 uResolution;

            // Simple noise function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            void main() {
                vec2 st = gl_FragCoord.xy / uResolution;
                float r = random(st + uTime);
                // Grain overlay
                float grain = (r - 0.5) * uIntensity;
                gl_FragColor = vec4(vec3(0.5 + grain), 1.0);
            }
        `;

        const initShaderProgram = (gl: WebGLRenderingContext, vsSource: string, fsSource: string) => {
            const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
                const shader = gl.createShader(type);
                if (!shader) return null;
                gl.shaderSource(shader, source);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            };

            const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
            const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

            if (!vertexShader || !fragmentShader) return null;

            const shaderProgram = gl.createProgram();
            if (!shaderProgram) return null;
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }
            return shaderProgram;
        };

        const program = initShaderProgram(gl, vsSource, fsSource);
        if (!program) return;

        const programInfo = {
            program: program,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
            },
            uniformLocations: {
                time: gl.getUniformLocation(program, 'uTime'),
                intensity: gl.getUniformLocation(program, 'uIntensity'),
                resolution: gl.getUniformLocation(program, 'uResolution'),
            },
        };

        // Buffer setup
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        let animationFrameId: number;

        const render = (time: number) => {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.useProgram(programInfo.program);

            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(programInfo.uniformLocations.time, time * 0.001);
            gl.uniform1f(programInfo.uniformLocations.intensity, intensity);
            gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationFrameId = requestAnimationFrame(render);
        };

        requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [intensity]);

    return <canvas ref={canvasRef} width={800} height={600} style={{ border: '1px solid black' }} />;
};

export default GrainCanvas;
