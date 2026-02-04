export interface FilmPreset {
    name: string;
    label: string;
    description: string;
    color: string; // Hex for placeholder
    grain: number;
    halation: number;
    saturation: number;
    contrast: number;
    tint: [number, number, number]; // RGB multipliers
}

export const FILM_PRESETS: FilmPreset[] = [
    {
        name: 'original',
        label: 'Digital Original',
        description: 'Standard digital sensor capture.',
        color: '#333333',
        grain: 0.0,
        halation: 0.0,
        saturation: 1.0,
        contrast: 1.0,
        tint: [1.0, 1.0, 1.0],
    },
    {
        name: 'portra400',
        label: 'Kodak Portra 400',
        description: 'Warm, natural skin tones. Fine grain.',
        color: '#eecfa1',
        grain: 0.3,
        halation: 0.4,
        saturation: 1.1,
        contrast: 1.05,
        tint: [1.05, 1.02, 0.95],
    },
    {
        name: 'velvia100',
        label: 'Fuji Velvia 100',
        description: 'High saturation, vivid colors. Deep blacks.',
        color: '#8a2be2',
        grain: 0.2,
        halation: 0.2,
        saturation: 1.4,
        contrast: 1.2,
        tint: [1.0, 0.95, 1.05],
    },
    {
        name: 'cinestill800t',
        label: 'Cinestill 800T',
        description: 'Cool tungsten balance. Strong red halation.',
        color: '#708090',
        grain: 0.5,
        halation: 1.2,
        saturation: 1.1,
        contrast: 1.1,
        tint: [0.9, 0.95, 1.2],
    },
    {
        name: 'trix400',
        label: 'Kodak Tri-X 400',
        description: 'Classic high-contrast B&W. Gritty grain.',
        color: '#1a1a1a',
        grain: 0.8,
        halation: 0.3,
        saturation: 0.0,
        contrast: 1.4,
        tint: [1.0, 1.0, 1.0],
    },
];
