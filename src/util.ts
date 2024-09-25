import * as THREE from "three";

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function rotateY(
	point: THREE.Vector3,
	pivot: THREE.Vector3,
	angle: number,
): THREE.Vector3 {
	// Translate point back to origin
	const translatedX = point.x - pivot.x;
	const translatedZ = point.z - pivot.z;

	// Perform rotation around the Y axis
	const rotatedX =
		translatedX * Math.cos(angle) - translatedZ * Math.sin(angle);
	const rotatedZ =
		translatedX * Math.sin(angle) + translatedZ * Math.cos(angle);

	// Translate point back to pivot
	const resultX = rotatedX + pivot.x;
	const resultZ = rotatedZ + pivot.z;

	return new THREE.Vector3(resultX, point.y, resultZ);
}

// TODO: remove
export function simulateHeavyLoad(durationMsec: number) {
	const endTime = performance.now() + durationMsec;
	while (performance.now() < endTime) {
		// Busy loop
	}
}

export function lerpVectors(
	v1: THREE.Vector3,
	v2: THREE.Vector3,
	t: number,
): THREE.Vector3 {
	// Ensure t is clamped between 0 and 1
	t = clamp(t, 0, 1);

	// Create a new vector to hold the result
	const result = new THREE.Vector3();

	// Perform the linear interpolation
	result.x = v1.x + (v2.x - v1.x) * t;
	result.y = v1.y + v2.y - v1.y * t;
	result.z = v1.z + (v2.z - v1.z) * t;

	// Return the interpolated vector
	return result;
}

export function lerp(a: number, b: number, t: number): number {
	t = clamp(t, 0, 1);
	return a + (b - a) * t;
}

export function cosineInterpolate(a: number, b: number, t: number) {
	const cosT = (1 - Math.cos(Math.PI * t)) / 2;
	return a + (b - a) * cosT;
}

export function cubicBezier(
	P0: THREE.Vector2,
	P1: THREE.Vector2,
	P2: THREE.Vector2,
	P3: THREE.Vector2,
	t: number,
): THREE.Vector2 {
	const oneMinusT = 1 - t;

	const point = P0.clone()
		.multiplyScalar(oneMinusT * oneMinusT * oneMinusT)
		.add(P1.clone().multiplyScalar(3 * oneMinusT * oneMinusT * t))
		.add(P2.clone().multiplyScalar(3 * oneMinusT * t * t))
		.add(P3.clone().multiplyScalar(t * t * t));

	return point;
}

export function bezierDirection(
	P0: THREE.Vector2,
	P1: THREE.Vector2,
	P2: THREE.Vector2,
	P3: THREE.Vector2,
	t: number,
): THREE.Vector2 {
	const oneMinusT = 1 - t;

	const direction = P1.clone()
		.sub(P0)
		.multiplyScalar(3 * oneMinusT * oneMinusT)
		.add(
			P2.clone()
				.sub(P1)
				.multiplyScalar(6 * oneMinusT * t),
		)
		.add(
			P3.clone()
				.sub(P2)
				.multiplyScalar(3 * t * t),
		);

	return direction.normalize();
}

export function directionInRadians(direction: THREE.Vector2) {
	return Math.atan2(direction.y, direction.x);
}

export function approach(
	val: number,
	target: number,
	speed: number,
	dt: number,
): number {
	let difference = target - val;
	if (Math.abs(difference) < 0.0001) {
		return target;
	}
	let change = difference * (1 - Math.exp(-speed * dt));
	val += change;
	return val;
}
