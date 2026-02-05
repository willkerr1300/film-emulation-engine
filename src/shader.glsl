precision mediump float;

uniform sampler2D u_image;
uniform float u_time;
uniform float u_grain_amount;
uniform vec2 u_resolution;

varying vec2 v_texCoord;

// Pseudo-random function for grain
float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    // --- Halation (Analog Bloom) ---
    // Sample neighbors to create a "red bleed" around highlights
    vec2 offset = 1.0 / u_resolution;
    vec3 glow = texture2D(u_image, v_texCoord + offset * 2.0).rgb * 0.2 +
                texture2D(u_image, v_texCoord - offset * 2.0).rgb * 0.2;
    
    // Halation usually affects the red channel more significantly
    float highlight = max(0.0, color.r - 0.7) * 2.0; 
    vec3 halation = vec3(highlight * 0.3, highlight * 0.05, 0.0) * glow;
    
    // --- Procedural Grain ---
    float noise = rand(v_texCoord * u_time);
    
    // Final Composition
    vec3 filmColor = color.rgb + halation + (noise * u_grain_amount);
    
    gl_FragColor = vec4(filmColor, color.a);
}
