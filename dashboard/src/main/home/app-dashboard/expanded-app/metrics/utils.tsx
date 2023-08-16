type RGB = {
    r: number;
    g: number;
    b: number;
};

function componentToHex(c: number) {
    c = Math.round(c);
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

function rgbToHex(rgb: RGB) {
    return (
        "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b)
    );
}

export function pickColor(
    color1: string,
    color2: string,
    index: number,
    total: number
) {
    if (total == 1) {
        return color1;
    }

    const w1 = index / (total - 1);
    const w2 = 1 - w1;

    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (rgb1 == null || rgb2 == null) {
        return "#000000";
    }

    const rgb: RGB = {
        r: Math.round(rgb1.r * w1 + rgb2.r * w2),
        g: Math.round(rgb1.g * w1 + rgb2.g * w2),
        b: Math.round(rgb1.b * w1 + rgb2.b * w2),
    };

    return rgbToHex(rgb);
}
