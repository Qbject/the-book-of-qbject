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

export function lerp(a: number, b: number, t: number): number {
	t = clamp(t, 0, 1);
	return a + (b - a) * t;
}

export function cosineInterpolate(a: number, b: number, t: number) {
	const cosT = (1 - Math.cos(Math.PI * t)) / 2;
	return a + (b - a) * cosT;
}

export function vectorToRadians(direction: THREE.Vector2) {
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
