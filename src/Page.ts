import * as THREE from "three";
import { approach, directionInRadians, lerp } from "./util";

export default class Page {
	public textureUrls;
	public width: number;
	public height: number;
	public thickness: number;
	public rootThickness: number;
	public elevationLeft = 0;
	public elevationRight = 0;
	public isCover = false;

	public mesh: THREE.Mesh;
	public pivot: THREE.Group;

	private turnProgress: number = 0;
	private turnProgressLag: number = 0;
	private xSegments = 1;
	private ySegments = 1;
	private zSegments = 20;
	private vertexRelCoords: THREE.Vector3[] = [];
	public bendingEnabled: boolean = true;

	constructor(pageParams: PageParams) {
		this.textureUrls = pageParams.textureUrls;
		this.width = pageParams.width;
		this.height = pageParams.height;
		this.thickness = pageParams.thickness || 2;
		this.rootThickness = pageParams.rootThickness || 4;
		this.isCover = !!pageParams.isCover;

		if (this.isCover) {
			this.zSegments = 1;
		}

		// Load front and back textures
		const textures = {
			front: new THREE.TextureLoader().load(this.textureUrls.front),
			back: new THREE.TextureLoader().load(this.textureUrls.back),
			edgeLR: new THREE.TextureLoader().load(this.textureUrls.edgeLR),
			edgeTB: new THREE.TextureLoader().load(this.textureUrls.edgeTB),
		};
		const materials = [
			new THREE.MeshBasicMaterial({ map: textures.back }), // right face
			new THREE.MeshBasicMaterial({ map: textures.front }), // left face
			new THREE.MeshBasicMaterial({ map: textures.edgeTB }), // top face
			new THREE.MeshBasicMaterial({ map: textures.edgeTB }), // bottom face
			new THREE.MeshBasicMaterial({ map: textures.edgeLR }), // front face
			new THREE.MeshBasicMaterial({ map: textures.edgeLR }), // back face
		];

		const geometry = new THREE.BoxGeometry(
			this.thickness,
			this.height,
			this.width,
			this.xSegments,
			this.ySegments,
			this.zSegments,
		);

		this.mesh = new THREE.Mesh(geometry, materials);

		this.pivot = new THREE.Group();
		this.pivot.add(this.mesh);

		const position = geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			this.vertexRelCoords[i] = new THREE.Vector3(
				position.getX(i) / this.thickness + 0.5,
				position.getY(i) / this.height + 0.5,
				position.getZ(i) / this.width + 0.5,
			);
		}
		position.needsUpdate = true;
	}

	private getCurve() {
		if (this.isCover) {
			const backShift = this.rootThickness / 2;
			const angle = (-this.turnProgress + 1) * (Math.PI / 2);

			// Calculate the normalized direction vector
			const direction = new THREE.Vector2(
				Math.cos(angle),
				Math.sin(angle),
			);

			const p0 = new THREE.Vector2().addScaledVector(
				direction,
				-backShift,
			);
			const p2 = new THREE.Vector2().addScaledVector(
				direction,
				this.width - backShift,
			);
			const p1 = new THREE.Vector2()
				.addVectors(p0, p2)
				.multiplyScalar(0.5);

			return new THREE.QuadraticBezierCurve(p0, p1, p2);
		} else {
			const calc = (tp: number, dist: number) =>
				new THREE.Vector2(
					Math.sin(tp * (Math.PI / 2)) * dist,
					Math.cos(tp * (Math.PI / 2)) * dist,
				);

			const p0 = new THREE.Vector2();
			const p1 = calc(0, this.getElevation() / 2);
			const p2 = calc(this.turnProgress, this.width * 0.5);
			const p3 = calc(this.turnProgressLag, this.width);

			return new THREE.CubicBezierCurve(p0, p1, p2, p3);
		}
	}

	public update(dt: number) {
		this.turnProgressLag = approach(
			this.turnProgressLag,
			this.turnProgress,
			this.bendingEnabled ? 5 : 25,
			dt,
		);

		// // updating elevation
		// if (!this.isCover) {
		// 	this.controlPoints[1].distance =
		// 		(this.getElevation() / this.width) * 2;
		// }

		const curve = this.getCurve();

		const position = this.mesh.geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const relCoord = this.vertexRelCoords[i];

			const pos = curve.getPoint(relCoord.z);
			const direction =
				directionInRadians(curve.getTangent(relCoord.z)) + Math.PI / 2;

			const thickness = lerp(
				this.rootThickness,
				this.thickness,
				relCoord.z,
			);

			const sign = -Math.sign(relCoord.x - 0.5);
			const newX = pos.x + Math.cos(direction) * (thickness / 2) * sign;
			const newZ = pos.y + Math.sin(direction) * (thickness / 2) * sign;
			position.setX(i, newX);
			position.setZ(i, newZ);
		}

		position.needsUpdate = true;

		// if (this.isCover) {
		// 	this.mesh.updateMatrixWorld(true);
		// 	const worldPosition = new THREE.Vector3();
		// 	this.mesh.getWorldPosition(worldPosition);
		// 	console.log(
		// 		`Absolute Position: x = ${worldPosition.x}, y = ${worldPosition.y}, z = ${worldPosition.z}`,
		// 	);
		// }
	}

	public setTurnProgress(turnProgress: number) {
		if (!this.bendingEnabled) {
			const delta = this.turnProgress - turnProgress;
			this.turnProgressLag -= delta;
		}
		this.turnProgress = turnProgress;
	}

	public setElevation(elevationLeft: number, elevationRight: number) {
		if (this.isCover) return;
		this.elevationLeft = elevationLeft;
		this.elevationRight = elevationRight;
	}

	public getElevation() {
		const turnProgress = this.turnProgress + 1 / 2;
		return lerp(this.elevationLeft, this.elevationRight, turnProgress);
	}
}
