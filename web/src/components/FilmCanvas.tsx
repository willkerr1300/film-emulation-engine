import React, { useEffect, useRef } from 'react';

interface FilmCanvasProps {
    imageSrc: string | null;
    grainIntensity: number;
    halationIntensity: number;
}

const FilmCanvas: React.FC<FilmCanvasProps> = ({ imageSrc, grainIntensity, halationIntensity }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textureRef = useRef<WebGLTexture | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            return;
        }

        // --- Shader Sources ---

        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            varying highp vec2 vTextureCoord;
            void main() {
                gl_Position = aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `;

        const fsSource = `
            precision mediump float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform float uTime;
            uniform float uGrainIntensity;
            uniform float uHalationIntensity;
            uniform vec2 uResolution;

            // Pseudo-random function
            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            // Simple sigmoid curve for contrast
            vec3 sCurve(vec3 x) {
                return x * x * (3.0 - 2.0 * x);
            }

            void main() {
                vec4 color = texture2D(uSampler, vTextureCoord);
                
                // --- 1. Halation (Simplified) ---
                // Sample red channel with a slight offset/blur
                // This is a very cheap approximation. A real Gaussian blur would be better but requires more passes.
                if (uHalationIntensity > 0.0) {
                    float halation = 0.0;
                    float offset = 0.005 * uHalationIntensity;
                    halation += texture2D(uSampler, vTextureCoord + vec2(offset, 0.0)).r;
                    halation += texture2D(uSampler, vTextureCoord - vec2(offset, 0.0)).r;
                    halation += texture2D(uSampler, vTextureCoord + vec2(0.0, offset)).r;
                    halation += texture2D(uSampler, vTextureCoord - vec2(0.0, offset)).r;
                    halation /= 4.0;
                    
                    // Add the red glow only to bright areas
                    float threshold = 0.7;
                    if (halation > threshold) {
                         color.r += (halation - threshold) * 0.5 * uHalationIntensity;
                    }
                }

                // --- 2. Color Response ---
                // Apply S-Curve for filmic contrast
                color.rgb = sCurve(color.rgb);

                // --- 3. Grain ---
                // Grain should be less visible in pure black/white
                float r = random(vTextureCoord + uTime);
                float noise = (r - 0.5) * uGrainIntensity;
                
                // Blend mode: Overlay-ish
                // (Target * (1 + 2*noise - 1)) = Target * (1 + noise') 
                // Let's use simple soft light approximation or additivity scaled by luminance
                float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                // Mask grain in extreme shadows/highlights
                float mask = 1.0 - smoothstep(0.0, 1.0, abs(luminance - 0.5) * 2.0); // bell curve
                 // Simpler: just additive but reduce strength
                color.rgb += noise;

                gl_FragColor = color;
            }
        `;

        // --- Init Shaders ---
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
                return null;
            }
            return shaderProgram;
        };

        const program = initShaderProgram(gl, vsSource, fsSource);
        if (!program) return;

        // Attributes & Uniforms
        const attribLocs = {
            vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(program, 'aTextureCoord'),
        };
        const uniformLocs = {
            uSampler: gl.getUniformLocation(program, 'uSampler'),
            uTime: gl.getUniformLocation(program, 'uTime'),
            uGrainIntensity: gl.getUniformLocation(program, 'uGrainIntensity'),
            uHalationIntensity: gl.getUniformLocation(program, 'uHalationIntensity'),
            uResolution: gl.getUniformLocation(program, 'uResolution'),
        };

        // --- Buffers ---
        // Positions (Full screen quad)
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            -1.0, 1.0,
            1.0, 1.0,
            -1.0, -1.0,
            1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Texture Coords (flipped Y for WebGL usually)
        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        const textureCoordinates = [
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        // --- Texture Setup ---
        // Initialize a 1x1 white texture as placeholder
        // If imageSrc is provided, we load that.
        const texture = gl.createTexture();
        textureRef.current = texture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200, 200, 200, 255]));

        // Check if imageSrc is new and load it
        if (imageSrc) {
            const image = new Image();
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                // Flip Y for WebGL
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                // Mipmaps needed for power-of-2, otherwise CLAMP_TO_EDGE
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }

                // Update canvas size to match image aspect ratio (capped max)
                resizeCanvasToImage(canvas, image);
            };
            image.src = imageSrc;
        }

        function isPowerOf2(value: number) {
            return (value & (value - 1)) === 0;
        }

        function resizeCanvasToImage(c: HTMLCanvasElement, img: HTMLImageElement) {
            const maxWidth = 800;
            const scale = maxWidth / img.width;
            if (scale < 1) {
                c.width = maxWidth;
                c.height = img.height * scale;
            } else {
                c.width = img.width;
                c.height = img.height;
            }
            gl?.viewport(0, 0, c.width, c.height);
        }

        // --- Render Loop ---
        let animationFrameId: number;
        const render = (time: number) => {
            gl.useProgram(program);

            // Bind vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(attribLocs.vertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attribLocs.vertexPosition);

            // Bind tex coords
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.vertexAttribPointer(attribLocs.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attribLocs.textureCoord);

            // Bind Texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textureRef.current!);
            gl.uniform1i(uniformLocs.uSampler, 0);

            // Set Uniforms
            gl.uniform1f(uniformLocs.uTime, time * 0.001);
            gl.uniform1f(uniformLocs.uGrainIntensity, grainIntensity);
            gl.uniform1f(uniformLocs.uHalationIntensity, halationIntensity);
            gl.uniform2f(uniformLocs.uResolution, gl.canvas.width, gl.canvas.height);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            animationFrameId = requestAnimationFrame(render);
        };

        requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            gl.deleteTexture(texture);
            gl.deleteProgram(program);
        };
    }, [imageSrc, grainIntensity, halationIntensity]); // Re-init on src change simplified, optimizable but works

    return <canvas ref={canvasRef} width={800} height={600} style={{ border: '1px solid #333', maxWidth: '100%' }} />;
};

export default FilmCanvas;
