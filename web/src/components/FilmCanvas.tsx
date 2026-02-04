import React, { useEffect, useRef } from 'react';
import type { FilmPreset } from '../presets';

interface FilmCanvasProps {
    imageSrc: string | null;
    preset: FilmPreset;
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
    
    uniform float uGrainIntensity;
    uniform float uHalationIntensity;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uTint;
    
    uniform vec2 uResolution;

    float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
                vec4 color = texture2D(uSampler, vTextureCoord);

    // --- 1. Halation ---
    if (uHalationIntensity > 0.0) {
                    float halation = 0.0;
                    float offset = 0.005 * uHalationIntensity;
        halation += texture2D(uSampler, vTextureCoord + vec2(offset, 0.0)).r;
        halation += texture2D(uSampler, vTextureCoord - vec2(offset, 0.0)).r;
        halation += texture2D(uSampler, vTextureCoord + vec2(0.0, offset)).r;
        halation += texture2D(uSampler, vTextureCoord - vec2(0.0, offset)).r;
        halation /= 4.0;
                    
                    float threshold = 0.7;
        if (halation > threshold) {
            color.r += (halation - threshold) * 0.5 * uHalationIntensity;
        }
    }

    // --- 2. Color Grading ---

    // Tint (White Balance)
    color.rgb *= uTint;

                // Saturation
                float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                vec3 grey = vec3(luminance);
    color.rgb = mix(grey, color.rgb, uSaturation);

    // Contrast
    color.rgb = (color.rgb - 0.5) * uContrast + 0.5;

                // --- 3. Grain ---
                float r = random(vTextureCoord * uResolution); 
                float noise = (r - 0.5) * uGrainIntensity;
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

function isPowerOf2(value: number) {
    return (value & (value - 1)) === 0;
}

function resizeCanvasToImage(gl: WebGLRenderingContext | null, c: HTMLCanvasElement, img: HTMLImageElement) {
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

const FilmCanvas: React.FC<FilmCanvasProps> = ({ imageSrc, preset }) => {
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

        const program = initShaderProgram(gl, vsSource, fsSource);
        if (!program) return;

        // Attributes & Uniforms
        const attribLocs = {
            vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(program, 'aTextureCoord'),
        };
        const uniformLocs = {
            uSampler: gl.getUniformLocation(program, 'uSampler'),
            uGrainIntensity: gl.getUniformLocation(program, 'uGrainIntensity'),
            uHalationIntensity: gl.getUniformLocation(program, 'uHalationIntensity'),
            uSaturation: gl.getUniformLocation(program, 'uSaturation'),
            uContrast: gl.getUniformLocation(program, 'uContrast'),
            uTint: gl.getUniformLocation(program, 'uTint'),
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
                // Explicitly disable flip to ensure correct orientation with our UV mapping
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                // Mipmaps needed for power-of-2, otherwise CLAMP_TO_EDGE
                if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }

                // Update canvas and render once image is ready
                resizeCanvasToImage(gl, canvas, image);
                render();
            };
            image.src = imageSrc;
        }

        // --- Render function (One-shot) ---
        const render = () => {
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
            gl.uniform1f(uniformLocs.uGrainIntensity, preset.grain);
            gl.uniform1f(uniformLocs.uHalationIntensity, preset.halation);
            gl.uniform1f(uniformLocs.uSaturation, preset.saturation);
            gl.uniform1f(uniformLocs.uContrast, preset.contrast);
            gl.uniform3fv(uniformLocs.uTint, preset.tint);

            gl.uniform2f(uniformLocs.uResolution, gl.canvas.width, gl.canvas.height);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        if (imageSrc) {
            // Already handled by onload usually, but if preset changes...
            // Optimization: we could just call render() if texture exists.
            if (textureRef.current) render();
        } else {
            render();
        }

        return () => {
            gl.deleteTexture(texture);
            gl.deleteProgram(program);
        };
    }, [imageSrc, preset]);

    return <canvas ref={canvasRef} width={800} height={600} style={{ width: '100%', height: 'auto', display: 'block' }} />;
};

export default FilmCanvas;
