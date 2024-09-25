import * as THREE from "three";
import {
	approach,
	bezierDirection,
	cubicBezier,
	directionInRadians,
	lerp,
} from "./util";

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
	private xSegments = 1;
	private ySegments = 1;
	private zSegments = 20;
	private vertexRelCoords: THREE.Vector3[] = [];
	public bendingEnabled: boolean = true;

	private controlPoints: PageControlPointParams[] = [
		{
			turnProgress: 0,
			distance: 0,
		},
		{
			turnProgress: 0,
			distance: 0.25,
		},
		{
			turnProgress: 0,
			distance: 0.5,
		},
		{
			turnProgress: 0,
			distance: 1,
		},
	];

	constructor(pageParams: PageParams) {
		this.textureUrls = pageParams.textureUrls;
		this.width = pageParams.width;
		this.height = pageParams.height;
		this.thickness = pageParams.thickness || 2;
		this.rootThickness = pageParams.rootThickness || 4;
		this.isCover = !!pageParams.isCover;

		if (this.isCover) {
			this.zSegments = 1;

			const backShift = this.rootThickness / 2 / this.width;
			this.controlPoints = this.controlPoints.map(cp => ({
				...cp,
				distance: cp.distance - backShift,
			}));
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

	private calcControlPoint(
		pointParams: PageControlPointParams,
		index: number,
	): PageControlPoint {
		const point = {
			x:
				Math.sin(pointParams.turnProgress * (Math.PI / 2)) *
				pointParams.distance *
				this.width,
			z:
				Math.cos(pointParams.turnProgress * (Math.PI / 2)) *
				pointParams.distance *
				this.width,
		};
		// TODO: p3 shouldn't be affected?
		if (index === 2 || index === 3) {
			point.z = Math.max(this.getElevation(), point.z);
		}
		return point;
	}

	public update(dt: number) {
		// updating elevation
		if (!this.isCover) {
			this.controlPoints[1].distance =
				(this.getElevation() / this.width) * 2;
		}

		// updating bend
		this.controlPoints[3].turnProgress = approach(
			this.controlPoints[3].turnProgress,
			this.controlPoints[2].turnProgress,
			5,
			dt,
		);
		// TODO: refactor PLEASE
		if (this.isCover) {
			this.controlPoints[0].turnProgress =
				this.controlPoints[1].turnProgress =
					this.controlPoints[2].turnProgress;
		}

		const position = this.mesh.geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const relCoord = this.vertexRelCoords[i];

			const controlPoints = this.controlPoints
				.map((cp, i) => this.calcControlPoint(cp, i))
				.map(cp => new THREE.Vector2(cp.x, cp.z));

			// this.isCover && console.log(JSON.stringify(this.controlPoints))
			// this.isCover && console.log(JSON.stringify(controlPoints))

			const pos = cubicBezier(
				controlPoints[0],
				controlPoints[1],
				controlPoints[2],
				controlPoints[3],
				relCoord.z,
			);

			const direction =
				directionInRadians(
					bezierDirection(
						controlPoints[0],
						controlPoints[1],
						controlPoints[2],
						controlPoints[3],
						relCoord.z,
					),
				) +
				Math.PI / 2;

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
		this.turnProgress = turnProgress;

		this.controlPoints.forEach((cp, index) => {
			if (index === 2) {
				this.controlPoints[index] = {
					...cp,
					turnProgress,
				};
			}
			if (index === 3) {
				this.controlPoints[index] = {
					...cp,
					turnProgress:
						this.isCover || !this.bendingEnabled
							? turnProgress
							: approach(
									cp.turnProgress,
									turnProgress,
									0.1,
									0.01,
								),
				};
			}
		});
	}

	public setElevation(elevationLeft: number, elevationRight: number) {
		if (this.isCover) return;
		this.elevationLeft = elevationLeft;
		this.elevationRight = elevationRight;
	}

	public getElevation() {
		const turnProgress = this.controlPoints[2].turnProgress + 1 / 2;
		return lerp(this.elevationLeft, this.elevationRight, turnProgress);
	}
}
