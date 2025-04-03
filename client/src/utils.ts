/**
 * Determines if a point intersects a rectangle.
 * @param point The point to check. [x, y]
 * @param rect The rectangle object. [x, y, width, height]
 */
function pointIntersectsRect(point: [number, number], rect: [number, number, number, number]): boolean {
    return (point[0] >= rect[0]) && (point[0] <= rect[0] + rect[2]) && (point[1] >= rect[1]) && (point[1] <= rect[1] + rect[3]);
}

/**
 * Get a random integer between the two given values. Both values are included.
 * @param min The minimum value in the range
 * @param max The maximum value in the range
 * @returns The random value between the given range
 */
function getRandomInt(min: number, max: number): number {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // both inclusive
}

/**
 * Calculate the intersection data of two lines
 * @param p1 The point of the first line
 * @param d1 The direction of the first line
 * @param p2 The point of the second line 
 * @param d2 The direction of the second line
 * @param length1 The length of the first line
 * @param length2 The length of the second line
 * @returns The distances along the lines that the two lines intersect
 */
function lineIntersection(
    p1: {x: number, y: number}, d1: {dx: number, dy: number},
    p2: {x: number, y: number}, d2: {dx: number, dy: number},
    length1: number = Infinity, length2: number = Infinity
): { t: number, s: number } | null {
    // Calculate the determinant
    const det = d1.dx * d2.dy - d1.dy * d2.dx;

    // If determinant is 0, lines are parallel
    if (det === 0) {
        return null; // No intersection (parallel lines)
    }

    // Solve for t and s
    const t = ((p2.x - p1.x) * d2.dy - (p2.y - p1.y) * d2.dx) / det;
    const s = ((p2.x - p1.x) * d1.dy - (p2.y - p1.y) * d1.dx) / det;

    // If t and s are both non-negative, they intersect at these parameters
    if (t >= 0 && s >= 0 && t <= length1 && s <= length2) {
        return { t, s }; // Intersection found
    }

    return null; // No intersection
}

function bezier_curve(x: number, p: [number, number, number, number]): number {
    return Math.pow(1 - x, 3) * p[0] +
        3 * Math.pow(1 - x, 2) * x * p[1] +
        3 * (1 - x) * Math.pow(x, 2) * p[2] +
        Math.pow(x, 3) * p[3];
}

/**
 * 
 * @param x 
 */
function powerUpSizingFunction(x: number): number {
    return bezier_curve(x, [0.27, -3, 3, 1]);
}

function ease_curve(x: number): number {
    return bezier_curve(x, [0.17, 0.67, 0.83, 1]);
}

console.log(powerUpSizingFunction(1));