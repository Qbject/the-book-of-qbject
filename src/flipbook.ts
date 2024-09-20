import * as THREE from "three";
import { gsap } from "gsap";
import Page from "./page";
import { clamp, lerp, lerpVectors, simulateHeavyLoad } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";

export default class Flipbook {
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private dom: { container: HTMLElement };
	private pages: Page[] = [];
	private progress = 0;
	private stats;
	private directionalLight: THREE.DirectionalLight;
	private spineWidth = 0;
	private spine1pos = new THREE.Vector3(0, 0, 0);
	private spine2pos = new THREE.Vector3(0, 0, 0);

	private curDrag?: {
		touchId: number | null; // null if mouse is used
		prevX: number;
		prevY: number;
		x: number;
		y: number;
	};

	private curTurn?: {
		grabbedPageIndex: number;
		inertia: number;
	};

	private controls: OrbitControls;

	constructor(container: HTMLElement, pages: PageInfo[]) {
		this.dom = { container };

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			20,
			window.innerWidth / window.innerHeight,
			0.1,
			3000,
		);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.domElement.classList.add("flipbook-canvas");
		this.dom.container.appendChild(this.renderer.domElement);

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.position.set(0, 0, 2500);
		this.directionalLight.castShadow = true;
		this.scene.add(this.directionalLight);

		this.camera.position.set(0, 0, 2500);

		// this.controls = new OrbitControls(
		// 	this.camera,
		// 	this.renderer.domElement,
		// );

		this.pages = pages.map(pageInfo => {
			const page = new Page(this, pageInfo);
			this.scene.add(page.pivot);
			return page;
		});

		// Load the texture
		// const textureLoader = new THREE.TextureLoader();
		// textureLoader.load("/img/desk.jpg", texture => {
		// 	// Create the plane geometry and material
		// 	const geometry = new THREE.PlaneGeometry(5, 5);
		// 	const material = new THREE.MeshBasicMaterial({
		// 		map: texture,
		// 		side: THREE.DoubleSide,
		// 	});

		// 	// Create the mesh
		// 	const plane = new THREE.Mesh(geometry, material);
		// 	plane.rotation.x = Math.PI / 2; // Ensure it's flat on the XY plane
		// 	this.scene.add(plane);
		// });

		const geometry = new THREE.PlaneGeometry(3000, 3000, 1, 1);

		const deskTexture = new THREE.TextureLoader().load("/img/desk.jpg");

		const material = new THREE.MeshStandardMaterial({
			map: deskTexture,
		});
		const plane = new THREE.Mesh(geometry, material);
		plane.rotation.z = Math.PI / 2; // Ensure it's flat on the XY plane
		this.scene.add(plane);

		this.stats = new Stats();
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		this.runAnimation();

		window.addEventListener(
			"resize",
			this.onWindowResize.bind(this),
			false,
		);

		this.addTouchListeners();
		this.addMouseListeners();
	}

	private updateSpine() {
		this.spineWidth = this.pages.reduce(
			(acc, page) => acc + page.pageInfo.thickness,
			0,
		);
		const firstPage = this.pages.at(0);
		const lastPage = this.pages.at(-1);
		if (firstPage) {
			this.spineWidth -= firstPage.pageInfo.thickness / 2;
		}
		if (lastPage) {
			this.spineWidth -= lastPage.pageInfo.thickness / 2;
		}

		const p = clamp(this.progress, 0, 1);
		this.spine1pos = new THREE.Vector3(
			-Math.sin((Math.PI / 2) * p) + 0.5,
			0,
			Math.cos((Math.PI / 2) * p),
		).multiplyScalar(this.spineWidth);

		const p2 = clamp(this.progress - this.pages.length + 1, 0, 1);
		this.spine2pos = new THREE.Vector3(
			Math.cos((Math.PI / 2) * p2) - 0.5,
			0,
			Math.sin((Math.PI / 2) * p2),
		).multiplyScalar(this.spineWidth);
	}

	private addTouchListeners() {
		this.renderer.domElement.addEventListener("touchstart", event => {
			if (!this.curDrag) {
				this.curDrag = {
					prevX: event.touches[0].clientX,
					prevY: event.touches[0].clientY,
					x: event.touches[0].clientX,
					y: event.touches[0].clientY,
					touchId: event.touches[0].identifier,
				};
			}
		});

		this.renderer.domElement.addEventListener("touchmove", event => {
			const drag = Array.from(event.touches).find(
				touch => touch.identifier === this.curDrag?.touchId,
			);
			if (!drag || !this.curDrag) return;

			this.curDrag.x = drag.clientX;
			this.curDrag.y = drag.clientY;
		});

		this.renderer.domElement.addEventListener("touchend", event => {
			if (
				event.changedTouches.length === 1 &&
				event.touches.length === 0 &&
				this.curTurn
			) {
				this.curDrag = undefined;
			}
		});
	}

	private addMouseListeners() {
		this.renderer.domElement.addEventListener("mousedown", event => {
			if (!this.curDrag) {
				this.curDrag = {
					prevX: event.clientX,
					prevY: event.clientY,
					x: event.clientX,
					y: event.clientY,
					touchId: null,
				};
			}
		});

		this.renderer.domElement.addEventListener("mousemove", event => {
			if (!this.curDrag || this.curDrag.touchId) return;

			this.curDrag.x = event.clientX;
			this.curDrag.y = event.clientY;
		});

		this.renderer.domElement.addEventListener("mouseup", () => {
			if (this.curDrag && !this.curDrag.touchId && this.curTurn) {
				this.curDrag = undefined;
			}
		});
	}

	private swipeDeltaToProgress(delta: number) {
		return delta / -500; // TODO:
	}

	private runAnimation() {
		let previousTime = performance.now();

		const animate = ((currentTime: number) => {
			let deltaTime = (currentTime - previousTime) / 1000;
			previousTime = currentTime;
			this.stats.begin();
			this.update(deltaTime);
			this.stats.end();
			// this.controls.update();

			requestAnimationFrame(animate);
		}).bind(this);

		animate(performance.now());
	}

	private update(deltaTime: number) {
		if (!deltaTime) return;

		this.updateSpine();

		if (this.curDrag) {
			const deltaX = this.curDrag.x - this.curDrag.prevX;
			this.curDrag.prevX = this.curDrag.x;
			this.curDrag.prevY = this.curDrag.y;
			const progressDelta = this.swipeDeltaToProgress(deltaX);

			// create turn if user starts to drag
			if (!this.curTurn && progressDelta) {
				this.curTurn = {
					grabbedPageIndex: clamp(
						this.progress + (progressDelta > 0 ? 0 : -1),
						0,
						this.pages.length,
					),
					inertia: 0,
				};
			}

			// updating inertia
			if (this.curTurn) {
				this.curTurn.inertia =
					(this.curTurn.inertia * 2 + progressDelta / deltaTime) / 3;
			}

			this.progress += progressDelta;
		}

		if (this.curTurn) {
			if (!this.curDrag) {
				// inertia and gravity
				const inertiaShift =
					((this.progress % 1) - 0.5) * 10 * deltaTime;
				this.curTurn.inertia += inertiaShift;
				this.progress += this.curTurn.inertia * deltaTime;
			}

			this.progress = clamp(
				this.progress,
				this.curTurn.grabbedPageIndex,
				this.curTurn.grabbedPageIndex + 1,
			);

			if (!this.curDrag && this.progress % 1 === 0) {
				// turn has ended
				this.curTurn = undefined;
			}
		}

		this.pages.forEach((page, index) => {
			if (index >= this.progress) {
				// TODO:
				// page.setTurnProgress(0.21 - 0.022 * index);
				page.setTurnProgress(0);
			} else if (index < Math.floor(this.progress)) {
				page.setTurnProgress(1);
			} else {
				page.setTurnProgress(this.progress % 1);
			}

			let pagePosition;
			if (index === 0) {
				pagePosition = this.spine1pos;
			} else if (index === this.pages.length - 1) {
				pagePosition = this.spine2pos;
			} else {
				pagePosition = lerpVectors(
					this.spine1pos,
					this.spine2pos,
					index / (this.pages.length - 1),
				);
				// console.log(index / (this.pages.length - 1))
			}
			page.pivot.position.set(...pagePosition.toArray());

			// TODO: remove?
			// updating renderOrder
			page.mesh.renderOrder =
				this.pages.length - Math.abs(this.progress - 0.5 - index);

			page.update(deltaTime);
		});

		this.renderer.render(this.scene, this.camera);
	}

	private onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	public animateCameraShift(
		targetX: number,
		targetY: number,
		duration: number = 2,
	) {
		gsap.to(this.camera.position, {
			x: targetX,
			y: targetY,
			duration: duration,
			ease: "power2.inOut",
		});
	}

	public animateCameraScale(targetZ: number, duration: number = 2) {
		gsap.to(this.camera.position, {
			z: targetZ,
			duration: duration,
			ease: "power2.inOut",
		});
	}

	public animateCameraRotation(
		targetRotationY: number,
		duration: number = 2,
	) {
		gsap.to(this.camera.rotation, {
			y: targetRotationY,
			duration: duration,
			ease: "power2.inOut",
		});
	}
}
