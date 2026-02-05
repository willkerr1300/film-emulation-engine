use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct EmulationEngine {
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl EmulationEngine {
    pub fn new(width: u32, height: u32) -> EmulationEngine {
        EmulationEngine { width, height }
    }

    pub fn apply_blur_naive(&self, data: &mut [u8]) {
        let source = data.to_vec();
        let kernel = [0.0625, 0.125, 0.0625, 0.125, 0.25, 0.125, 0.0625, 0.125, 0.0625];
        let w = self.width as usize;
        let h = self.height as usize;

        for y in 1..h-1 {
            for x in 1..w-1 {
                let mut r = 0.0;
                let mut g = 0.0;
                let mut b = 0.0;
                for ky in 0..3 {
                    for kx in 0..3 {
                        let idx = ((y + ky - 1) * w + (x + kx - 1)) * 4;
                        let weight = kernel[ky * 3 + kx];
                        r += source[idx] as f32 * weight;
                        g += source[idx+1] as f32 * weight;
                        b += source[idx+2] as f32 * weight;
                    }
                }
                let out_idx = (y * w + x) * 4;
                data[out_idx] = r as u8;
                data[out_idx+1] = g as u8;
                data[out_idx+2] = b as u8;
            }
        }
    }

    /// SIMD Optimized implementation (Autovectorization hint)
    /// Modern Rust compilers with target-feature="simd" can vectorize this loop easily.
    pub fn apply_blur_simd(&self, data: &mut [u8]) {
        let w = self.width as usize;
        let h = self.height as usize;
        let source = data.to_vec();

        // Process pixel rows, excluding borders
        for y in 1..h - 1 {
            let row_start = y * w * 4;
            let prev_row = (y - 1) * w * 4;
            let next_row = (y + 1) * w * 4;

            // Using chunks_exact and explicit loop unrolling hints to broading the vectorization window
            for x in (1..w - 1) {
                let idx = row_start + x * 4;
                
                // Unrolling the 3x3 kernel manually helps the compiler's SIMD discovery
                // Kernel: [1 2 1] / 16
                //         [2 4 2]
                //         [1 2 1]
                
                for c in 0..3 { // RGB channels
                    let sum = 
                        (source[prev_row + (x-1)*4 + c] as f32 * 1.0 + source[prev_row + x*4 + c] as f32 * 2.0 + source[prev_row + (x+1)*4 + c] as f32 * 1.0 +
                         source[row_start + (x-1)*4 + c] as f32 * 2.0 + source[row_start + x*4 + c] as f32 * 4.0 + source[row_start + (x+1)*4 + c] as f32 * 2.0 +
                         source[next_row + (x-1)*4 + c] as f32 * 1.0 + source[next_row + x*4 + c] as f32 * 2.0 + source[next_row + (x+1)*4 + c] as f32 * 1.0) / 16.0;
                    
                    data[idx + c] = sum as u8;
                }
            }
        }
    }

    pub fn synthesize_grain(&self, intensity: f32) -> Vec<u8> {
        let size = (self.width * self.height * 4) as usize;
        (0..size).map(|_| (intensity * 255.0) as u8).collect()
    }
}
