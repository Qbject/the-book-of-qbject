import * as THREE from "three";
import { lerp } from "./util";

export default class CoverPage implements Page {
	public frontUrl: string;
	public backUrl: string;
	public width: number;
	public height: number;
	public thickness: number;
	public rootThickness: number;

	public mesh: THREE.Mesh;
	public frontTexture: THREE.Texture;
	public backTexture: THREE.Texture;
	public edgeTexture: THREE.Texture;
	public pivot: THREE.Group;

	private turnProgress: number = 0;
	private xSegments = 1;
	private ySegments = 1;
	private zSegments = 1;

	// TODO: reuse with InnerPage
	constructor(pageParams: CoverPageParams) {
		this.frontUrl = pageParams.frontUrl;
		this.backUrl = pageParams.backUrl;
		this.width = pageParams.width;
		this.height = pageParams.height;
		this.thickness = pageParams.thickness || 5;
		this.rootThickness = pageParams.rootThickness || 5;

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
		this.mesh.position.z = this.width / 2 - this.rootThickness / 2;

		this.pivot = new THREE.Group();
		this.pivot.add(this.mesh);

		// applying thickness
		const position = geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const thickness = lerp(
				this.rootThickness,
				this.thickness,
				position.getZ(i) / this.width + 0.5,
			);

			position.setX(i, (thickness / 2) * Math.sign(position.getX(i)));
		}
		position.needsUpdate = true;
	}

	public setTurnProgress(turnProgress: number) {
		this.turnProgress = turnProgress;
	}

	public update() {
		// update rotation
		this.pivot.rotation.y = (Math.PI / 2) * this.turnProgress;

		this.mesh.updateMatrixWorld(true);
		const worldPosition = new THREE.Vector3();
		this.mesh.getWorldPosition(worldPosition);
		console.log(
			`Absolute Position: x = ${worldPosition.x}, y = ${worldPosition.y}, z = ${worldPosition.z}`,
		);
	}
}
