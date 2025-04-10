import * as THREE from "three";
import {
	clamp,
	lerp,
	cosineInterpolate,
	vectorToRadians,
	removeArrayItem,
	toggleVisibility,
} from "./util";

describe("Utility Functions", () => {
	describe("clamp", () => {
		it("should clamp values within range", () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(-5, 0, 10)).toBe(0);
			expect(clamp(15, 0, 10)).toBe(10);
		});
	});

	describe("lerp", () => {
		it("should interpolate between values", () => {
			expect(lerp(0, 10, 0.5)).toBe(5);
			expect(lerp(0, 10, 0)).toBe(0);
			expect(lerp(0, 10, 1)).toBe(10);
		});

		it("should clamp t between 0 and 1", () => {
			expect(lerp(0, 10, -1)).toBe(0);
			expect(lerp(0, 10, 2)).toBe(10);
		});
	});

	describe("cosineInterpolate", () => {
		it("should interpolate with cosine smoothing", () => {
			expect(cosineInterpolate(0, 10, 0)).toBe(0);
			expect(cosineInterpolate(0, 10, 1)).toBe(10);
			// The middle point should be approximately 5
			expect(Math.abs(cosineInterpolate(0, 10, 0.5) - 5)).toBeLessThan(
				0.1,
			);
		});
	});

	describe("vectorToRadians", () => {
		it("should convert vector to radians", () => {
			expect(vectorToRadians(new THREE.Vector2(1, 0))).toBe(0);
			expect(vectorToRadians(new THREE.Vector2(0, 1))).toBe(Math.PI / 2);
			expect(vectorToRadians(new THREE.Vector2(-1, 0))).toBe(Math.PI);
		});
	});

	describe("removeArrayItem", () => {
		it("should remove item from array", () => {
			const arr = [1, 2, 3, 4];
			expect(removeArrayItem(arr, 3)).toBe(true);
			expect(arr).toEqual([1, 2, 4]);
		});

		it("should return false if item not found", () => {
			const arr = [1, 2, 3, 4];
			expect(removeArrayItem(arr, 5)).toBe(false);
			expect(arr).toEqual([1, 2, 3, 4]);
		});
	});

	describe("toggleVisibility", () => {
		it("should toggle element visibility", () => {
			const el = document.createElement("div");
			el.style.display = "block";

			toggleVisibility(el);
			expect(el.style.display).toBe("none");

			toggleVisibility(el);
			expect(el.style.display).toBe("");
		});
	});
});
