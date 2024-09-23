import * as THREE from "three";
import {
	bezierDirection,
	cubicBezier,
	directionInRadians,
	lerp,
} from "./util";

export default class InnerPage implements Page {
	public frontUrl: string;
	public backUrl: string;
	public width: number;
	public height: number;
	public flexibility: number;
	public thickness: number;
	public rootThickness: number;

	public mesh: THREE.Mesh;
	public frontTexture: THREE.Texture;
	public backTexture: THREE.Texture;
	public edgeTexture: THREE.Texture;
	public pivot: THREE.Group;

	private xSegments = 1;
	private ySegments = 1;
	private zSegments = 20;
	private vertexRelCoords: THREE.Vector3[] = [];

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
			distance: 0.62,
		},
		{
			turnProgress: 0,
			distance: 1,
		},
	];

	constructor(pageParams: InnerPageParams) {
		this.frontUrl = pageParams.frontUrl;
		this.backUrl = pageParams.backUrl;
		this.width = pageParams.width;
		this.height = pageParams.height;
		this.flexibility = pageParams.flexibility || 0;
		this.thickness = pageParams.thickness || 2;
		this.rootThickness = pageParams.rootThickness || 4;

		if (this.flexibility === 0) {
			this.xSegments = 1;
		}

		// Load front and back textures
		this.frontTexture = new THREE.TextureLoader().load(this.frontUrl);
		this.backTexture = new THREE.TextureLoader().load(this.backUrl);
		this.edgeTexture = new THREE.TextureLoader().load("/img/1.png");

		const geometry = new THREE.BoxGeometry(
			this.thickness,
			this.height,
			this.width,
			this.xSegments,
			this.ySegments,
			this.zSegments,
		);

		const materials = [
			new THREE.MeshBasicMaterial({ map: this.frontTexture }), // right face
			new THREE.MeshBasicMaterial({ map: this.backTexture }), // left face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // top face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // bottom face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // front face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // back face
		];

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
			console.log(
				this.vertexRelCoords[i].x,
				this.vertexRelCoords[i].y,
				this.vertexRelCoords[i].z,
			);
		}
		position.needsUpdate = true;
	}

	private calcControlPoint(
		pointParams: PageControlPointParams,
	): PageControlPoint {
		return {
			x:
				Math.sin(pointParams.turnProgress * (Math.PI / 2)) *
				pointParams.distance *
				this.width,
			z:
				Math.cos(pointParams.turnProgress * (Math.PI / 2)) *
				pointParams.distance *
				this.width,
		};
	}

	public updateGeometry() {
		const position = this.mesh.geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const relCoord = this.vertexRelCoords[i];

			const controlPoints = this.controlPoints
				.map(cp => this.calcControlPoint(cp))
				.map(cp => new THREE.Vector2(cp.x, cp.z));

			// console.log(JSON.stringify(controlPoints))

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
	}

	public setTurnProgress(turnProgress: number) {
		this.controlPoints = this.controlPoints.map(cp => ({
			...cp,
			turnProgress,
		}));
	}
}
