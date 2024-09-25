import * as THREE from "three";
import { gsap } from "gsap";
import { clamp } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import InnerPage from "./InnerPage";
import CoverPage from "./CoverPage";

export default class Flipbook {
	public containerEl: HTMLElement;
	public pages: Page[];
	public spineThickness: number;
	public spineHeight: number;
	public spineEdgeTexture: THREE.Texture;
	public spineFrontTexture: THREE.Texture;
	public spineBackTexture: THREE.Texture;

	public group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private progress = 0;
	private stats;
	private directionalLight: THREE.DirectionalLight;
	private spine1pos = new THREE.Vector3(0, 0, 0);
	private spine2pos = new THREE.Vector3(0, 0, 0);
	private spineWidth: number;
	private spineZ: number;

	private controls: OrbitControls;

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

	constructor(
		params: FlipBookParams,
		// public containerEl: HTMLElement,
		// public pages: Page[],
		// public spineThickness: number = 5,
	) {
		this.containerEl = params.containerEl;
		this.pages = params.pages;
		this.spineThickness = params.spineThickness || 5;
		this.spineHeight = params.spineHeight;

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
		this.containerEl.appendChild(this.renderer.domElement);

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.position.set(0, 0, 2500);
		this.directionalLight.castShadow = true;
		this.scene.add(this.directionalLight);

		this.camera.position.set(0, 0, 2500);

		// this.controls = new OrbitControls(
		// 	this.camera,
		// 	this.renderer.domElement,
		// );

		this.group = new THREE.Group();
		this.scene.add(this.group);

		// init spine
		this.spineWidth = this.pages
			.filter(page => page instanceof InnerPage)
			.reduce((acc, page) => acc + page.rootThickness, 0);
		this.spineZ = this.spineThickness / 2;
		this.spine1pos = new THREE.Vector3(
			-this.spineWidth / 2,
			0,
			this.spineZ,
		);
		this.spine2pos = new THREE.Vector3(this.spineWidth / 2, 0, this.spineZ);

		// init spine mesh
		// TODO:
		const spineTextureUrl = `https://picsum.photos/id/236/${this.spineWidth}/${this.spineHeight}`;
		this.spineFrontTexture = new THREE.TextureLoader().load(
			spineTextureUrl,
		);
		this.spineBackTexture = new THREE.TextureLoader().load(spineTextureUrl);
		this.spineEdgeTexture = new THREE.TextureLoader().load(spineTextureUrl);
		const spineMaterials = [
			new THREE.MeshBasicMaterial({ map: this.spineEdgeTexture }), // right face
			new THREE.MeshBasicMaterial({ map: this.spineEdgeTexture }), // left face
			new THREE.MeshBasicMaterial({ map: this.spineEdgeTexture }), // top face
			new THREE.MeshBasicMaterial({ map: this.spineEdgeTexture }), // bottom face
			new THREE.MeshBasicMaterial({ map: this.spineFrontTexture }), // front face
			new THREE.MeshBasicMaterial({ map: this.spineBackTexture }), // back face
		];
		const spineGeometry = new THREE.BoxGeometry(
			this.spineWidth,
			this.spineHeight,
			this.spineThickness,
		);
		const spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
		this.group.add(spineMesh);
		spineMesh.position.z = this.spineZ;

		// init pages
		let spinePlacementOffset = -(this.spineWidth / 2);
		this.pages.forEach((page, index) => {
			this.group.add(page.pivot);

			if (page instanceof CoverPage) {
				page.pivot.position.z = this.spineZ;
				page.pivot.position.x =
					index === 0
						? this.spine1pos.x - page.rootThickness / 2
						: this.spine2pos.x + page.rootThickness / 2;
			}

			if (page instanceof InnerPage) {
				const elevationLeft =
					spinePlacementOffset +
					this.spineWidth / 2 +
					page.rootThickness / 2;
				const elevationRight = this.spineWidth - elevationLeft;
				page.setElevation(elevationLeft, elevationRight);

				page.pivot.position.z = this.spineZ + this.spineThickness / 2;
				page.pivot.position.x =
					spinePlacementOffset + page.rootThickness / 2;
				spinePlacementOffset += page.rootThickness;
			}
		});

		// create desk
		const deskGeometry = new THREE.PlaneGeometry(3000, 3000, 1, 1);
		const deskTexture = new THREE.TextureLoader().load("/img/desk.jpg");
		const deskMaterial = new THREE.MeshStandardMaterial({
			map: deskTexture,
		});
		const deskMesh = new THREE.Mesh(deskGeometry, deskMaterial);
		deskMesh.rotation.z = Math.PI / 2; // Ensure it's flat on the XY plane
		deskMesh.position.z = -20;
		this.scene.add(deskMesh);

		// Add fps counter
		this.stats = new Stats();
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		// event listeners
		window.addEventListener(
			"resize",
			this.onWindowResize.bind(this),
			false,
		);
		this.addTouchListeners();
		this.addMouseListeners();

		// main loop
		this.runAnimation();
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
			let dt = (currentTime - previousTime) / 1000;
			previousTime = currentTime;
			this.stats.begin();
			this.update(dt);
			this.stats.end();
			this.controls?.update?.();

			requestAnimationFrame(animate);
		}).bind(this);

		animate(performance.now());
	}

	private update(dt: number) {
		if (!dt) return;

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
						this.pages.length - 1,
					),
					inertia: 0,
				};
			}

			// updating inertia
			if (this.curTurn) {
				this.curTurn.inertia =
					(this.curTurn.inertia * 2 + progressDelta / dt) / 3;
			}

			this.progress += progressDelta;
		}

		if (this.curTurn) {
			if (!this.curDrag) {
				// inertia and gravity
				const inertiaShift = ((this.progress % 1) - 0.5) * 10 * dt;
				this.curTurn.inertia += inertiaShift;
				this.progress += this.curTurn.inertia * dt;
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

		const bookOpenFactor = Math.min(
			this.progress,
			this.pages.length - this.progress,
			1,
		);

		this.pages.forEach((page, index) => {
			let tp;
			if (index >= this.progress) {
				tp = bookOpenFactor;
			} else if (index < Math.floor(this.progress)) {
				tp = -bookOpenFactor;
			} else {
				if (page instanceof CoverPage) {
					tp = index ? bookOpenFactor : -bookOpenFactor;
				} else {
					tp = (this.progress % 1) * -2 + 1;
				}
			}

			page.setTurnProgress(tp);
		});

		this.pages.forEach((page, index) => {
			// TODO: remove?
			// updating renderOrder
			page.mesh.renderOrder =
				this.pages.length - Math.abs(this.progress - 0.5 - index);

			page.update(dt);
		});

		// handle book rotation
		let rotation = 0;
		if (this.progress < 1) {
			rotation = 1 - this.progress;
		}
		if (this.progress > this.pages.length - 1) {
			rotation = this.pages.length - 1 - this.progress;
		}
		this.group.rotation.y = (Math.PI / 2) * rotation;

		// handle book rotation shift
		// TODO: coverThickness
		const shiftLeft = this.spineWidth / 2 + this.pages[0].rootThickness;
		const shiftRight =
			this.spineWidth / 2 +
			this.pages[this.pages.length - 1].rootThickness;
		if (rotation < 0) {
			this.group.position.x =
				(Math.cos(Math.PI * 0.5 * rotation) - 1) *
				(shiftLeft - this.pages[0].rootThickness);
		} else {
			this.group.position.x =
				(Math.sin(Math.PI * 1.5 + Math.PI * 0.5 * rotation) + 1) *
				(shiftLeft - this.pages[0].rootThickness);
		}
		this.group.position.z =
			Math.sin(Math.PI * 0.5 * Math.abs(rotation)) * shiftLeft;
		console.log(this.group.position.x, this.group.position.z);
		// const shiftX = Math.sin((Math.PI / 2) * rotation) * shiftLeft;
		// this.group.position.x = shiftX;

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
