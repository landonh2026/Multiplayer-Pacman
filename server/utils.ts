import {PathNode} from "./pathfinding.ts";

type Point = { x: number, y: number };
type Direction = { dx: number, dy: number };

/**
 * Removes the given item from the given list
 * @param list 
 * @param element 
 */
export function removeFromList(list: Array<any>, element: any) {
    const index = list.indexOf(element);

    if (index == -1) {
        throw new Error("Element " + element.toString() + " does not exist in list " + list.toString());
    }

    list.splice(index, 1);
}

/**
 * Gets a random number in the given range, inclusive
 * @param min 
 * @param max 
 * @returns 
 */
export function getRandomInt(min: number, max: number): number {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // both inclusive
}

/**
 * Get a random item from the given list
 * @param list 
 * @returns 
 */
export function getRandomListItem<T>(list: Array<T>): T {
    return list[getRandomInt(0, list.length - 1)];
}

/**
 * Make a socket message with a given type and data
 * @param type 
 * @param data 
 * @param should_stringify Should the result be JSON.stringified?
 * @returns 
 */
export function makeMessage(type: string, data: any, should_stringify: boolean = true): string|any {
    return should_stringify ? JSON.stringify({"messageType": type, "data": data}): {"messageType": type, "data": data}
}

/**
 * Check to see if a point intersects a rect
 * @param point 
 * @param rect 
 * @returns 
 */
export function pointIntersectsRect(point: [number, number], rect: [number, number, number, number]): boolean {
    return (point[0] >= rect[0]) && (point[0] <= rect[0] + rect[2]) && (point[1] >= rect[1]) && (point[1] <= rect[1] + rect[3]);
}

/**
 * Returns a (hopefully) unique "hash" given two sessions
 * @param session1 
 * @param session2 
 */
export function makeSessionsHash(session1: string, session2: string) {
    let runningProduct = 1;
    
    for (let i = 0; i < session1.length; i++) {
        runningProduct += (session1.charCodeAt(i) + 1);
    }

    for (let i = 0; i < session2.length; i++) {
        runningProduct += (session2.charCodeAt(i) + 1);
    }

    return runningProduct;
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
export function lineIntersection(
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

/**
 * Get the direction delta given a direction
 * @param direction
 * @returns 
 */
export function getDirectionDelta(direction: 0|1|2|3) {
    switch (direction) {
        case 0: return {dx: 1, dy: 0}
        case 1: return {dx: 0, dy: 1}
        case 2: return {dx: -1, dy: 0}
        case 3: return {dx: 0, dy: -1}
    }
}

/**
 * Finds the direction something needs to face in order to face otherNode from node 
 * @param node 
 * @param otherNode 
 * @returns 
 */
export function getTurnDirection(node: {x: number, y: number}|PathNode, otherNode: {x: number, y: number}|PathNode): 0|1|2|3|null {
    if (Math.abs(node.y-otherNode.y) == 0) return node.x - otherNode.x > 0 ? 2 : 0;
    if (Math.abs(node.x-otherNode.x) == 0) return node.y - otherNode.y > 0 ? 3 : 1;

    return null;
}