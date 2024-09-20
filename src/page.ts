import Flipbook from "./flipbook";
import * as THREE from "three";
import { clamp, rotateY } from "./util";

export default class Page {
	public mesh: THREE.Mesh;
	public frontTexture: THREE.Texture;
	public backTexture: THREE.Texture;
	public edgeTexture: THREE.Texture;
	public pivot: THREE.Group;
	private turnProgress: number = 0;
	private bendFactor = 0;
	private xSegments = 20;
	private ySegments = 1;
	private zSegments = 1;
	private vertexColumns: number[] = [];
	private frontVertices: number[] = [];

	constructor(
		private book: Flipbook,
		public pageInfo: PageInfo,
	) {
		if (this.pageInfo.hard) {
			this.xSegments = 1;
		}

		// Load front and back textures
		this.frontTexture = new THREE.TextureLoader().load(
			this.pageInfo.frontUrl,
		);
		this.backTexture = new THREE.TextureLoader().load(
			this.pageInfo.backUrl,
		);
		this.edgeTexture = new THREE.TextureLoader().load("/img/1.png");

		const geometry = new THREE.BoxGeometry(
			this.pageInfo.width,
			this.pageInfo.height,
			this.pageInfo.thickness,
			this.xSegments,
			this.ySegments,
			this.zSegments,
		);

		// Custom shader material to handle both textures
		// const material = new THREE.ShaderMaterial({
		// 	uniforms: {
		// 		frontTexture: { value: this.frontTexture },
		// 		backTexture: { value: this.backTexture },
		// 	},
		// 	vertexShader: `
		// 		varying vec2 vUv;
		// 		void main() {
		// 			vUv = uv;
		// 			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		// 		}
		// 	`,
		// 	fragmentShader: `
		// 		uniform sampler2D frontTexture;
		// 		uniform sampler2D backTexture;
		// 		varying vec2 vUv;
		// 		void main() {
		// 			vec4 frontColor = texture2D(frontTexture, vUv);
		// 			vec4 backColor = texture2D(backTexture, vUv);
		// 			if (gl_FrontFacing) {
		// 				gl_FragColor = frontColor;
		// 			} else {
		// 				gl_FragColor = backColor;
		// 			}
		// 		}
		// 	`,
		// 	side: THREE.DoubleSide,
		// });

		// const material = new THREE.MeshBasicMaterial({
		// 	color: 0xffffff,
		// 	wireframe: true
		// });

		const materials = [
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // right face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // left face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // top face
			new THREE.MeshBasicMaterial({ map: this.edgeTexture }), // bottom face
			new THREE.MeshBasicMaterial({ map: this.frontTexture }), // front face
			new THREE.MeshBasicMaterial({ map: this.backTexture }), // back face
		];

		this.mesh = new THREE.Mesh(geometry, materials);
		this.mesh.position.x =
			this.pageInfo.width / 2 - this.pageInfo.thickness / 2;

		this.pivot = new THREE.Group();
		this.pivot.add(this.mesh);

		const segSize = this.pageInfo.width / this.xSegments;
		const position = geometry.attributes.position;
		for (let i = 0; i < position.count; i++) {
			const x = position.getX(i) + this.pageInfo.width / 2;
			this.vertexColumns[i] = Math.round(x / segSize);
			if (position.getZ(i) > 0) {
				this.frontVertices.push(i);
			}
		}
	}

	public setTurnProgress(progress: number) {
		const progressDelta = progress - this.turnProgress;
		this.turnProgress = progress;
		this.setBendFactor(clamp(this.bendFactor + progressDelta, -1, 1));
	}

	public update(deltaTime: number) {
		// update rotation
		this.pivot.rotation.y = Math.PI * -this.turnProgress;

		// gravity
		const targetBend = -(this.turnProgress - 0.5) * 0.1;

		// handle bend faloff
		const faloffDelta = targetBend - this.bendFactor;
		const faloff = faloffDelta * deltaTime * 15;
		this.setBendFactor(this.bendFactor + faloff);
	}

	private setBendFactor(bendFactor: number) {
		if (this.pageInfo.hard) return;

		if (Math.abs(bendFactor) < 0.000001) {
			bendFactor = 0;
		}

		bendFactor = clamp(
			bendFactor,
			(this.turnProgress - 1) * 0.25,
			this.turnProgress * 0.25,
		);

		if (bendFactor === this.bendFactor) {
			return;
		}

		this.bendFactor = bendFactor;
		this.applyBend();
	}

	private applyBend() {
		const columnDisplacements: THREE.Vector3[] = [];
		for (let i = 0; i < this.xSegments + 1; i++) {
			const x = (i / this.xSegments - 0.5) * this.pageInfo.width;
			columnDisplacements.push(new THREE.Vector3(x, 0, 0));
		}

		for (let i = columnDisplacements.length - 1; i >= 0; i--) {
			for (let j = i + 1; j < columnDisplacements.length; j++) {
				columnDisplacements[j] = rotateY(
					columnDisplacements[j],
					columnDisplacements[i],
					(-this.bendFactor * 15) / this.xSegments,
				);
			}
		}

		const geometry = this.mesh.geometry as THREE.PlaneGeometry;
		const position = geometry.attributes.position;

		for (let i = 0; i < position.count; i++) {
			const column = this.vertexColumns[i];
			const displacement = columnDisplacements[column];

			const faceAngle = this.frontVertices.includes(i)
				? Math.PI / 2
				: Math.PI / -2;

			const direction =
				((-this.bendFactor * 15) / this.xSegments) * column;
			let dx =
				(Math.cos(direction + faceAngle) * this.pageInfo.thickness) / 2;
			let dz =
				(Math.sin(direction + faceAngle) * this.pageInfo.thickness) / 2;

			if (displacement) {
				const newPos = displacement.clone();
				newPos.x += dx;
				newPos.z += dz;

				position.setZ(i, newPos.z);
				position.setX(i, newPos.x);
			}
		}

		position.needsUpdate = true;
	}
}
