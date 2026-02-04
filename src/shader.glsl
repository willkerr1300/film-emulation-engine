precision mediump float;

uniform sampler2D u_image;
uniform float u_time;
uniform float u_grain_amount;

varying vec2 v_texCoord;

// Pseudo-random function
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // Procedural Grain Generation on GPU
    float noise = rand(v_texCoord * u_time);
    
    // Apply grain
    vec3 filmColor = color.rgb + (noise * u_grain_amount);
    
    gl_FragColor = vec4(filmColor, color.a);
}
