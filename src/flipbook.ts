import * as THREE from "three";
import { gsap } from "gsap";
import { clamp, rotateY } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import Page from "./Page";

export default class Flipbook {
	private containerEl: HTMLElement;
	private pageWidth: number;
	private pageHeight: number;
	private pageThickness: number;
	private pageRootThickness: number;
	private coverThickness: number;
	private coverMargin: number;
	private textureUrls;

	private pages: Page[] = [];
	private group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private spineMesh: THREE.Mesh;
	private directionalLight: THREE.DirectionalLight;

	private progress = 0;
	private spine1pos = new THREE.Vector3(0, 0, 0);
	private spine2pos = new THREE.Vector3(0, 0, 0);
	private spineWidth: number;
	private spineZ: number;

	private controls: OrbitControls;
	private stats;

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

	constructor(params: FlipBookParams) {
		this.containerEl = params.containerEl;
		this.pageWidth = params.pageWidth;
		this.pageHeight = params.pageHeight;
		this.pageThickness = params.pageThickness || 2;
		this.pageRootThickness = params.pageRootThickness || 4;
		this.coverThickness = params.coverThickness || 5;
		this.coverMargin = params.coverMargin || 8;
		this.textureUrls = params.textures;

		// add pages
		const totalPages = Math.ceil(this.textureUrls.pages.length / 2);
		for (let i = 0; i < totalPages; i++) {
			const isCover = i === 0 || i === totalPages - 1;
			const width = isCover
				? this.pageWidth + this.coverMargin + this.coverThickness
				: this.pageWidth;
			const height = isCover
				? this.pageHeight + this.coverMargin * 2
				: this.pageHeight;

			this.pages.push(
				new Page({
					textureUrls: {
						front: this.textureUrls.pages[i * 2],
						back: this.textureUrls.pages[i * 2 + 1],
						edgeLR: this.textureUrls.coverEdgeLR,
						edgeTB: this.textureUrls.coverEdgeTB,
					},
					width,
					height,
					thickness: isCover
						? this.coverThickness
						: this.pageThickness,
					rootThickness: isCover
						? this.coverThickness
						: this.pageRootThickness,
					isCover,
				}),
			);
		}

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			20,
			window.innerWidth / window.innerHeight,
			2000,
			3000,
		);
		this.camera.position.set(0, 0, 2500);

		// bottom view
		this.camera.position.set(0, -1462, 441);
		this.camera.rotation.set(1.27, 0, 0);
		this.camera.near = 1000;
		this.camera.updateProjectionMatrix();

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.domElement.classList.add("flipbook-canvas");
		this.containerEl.appendChild(this.renderer.domElement);

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		this.directionalLight.position.set(0, 0, 2500);
		this.directionalLight.castShadow = true;
		this.scene.add(this.directionalLight);

		// this.controls = new OrbitControls(
		// 	this.camera,
		// 	this.renderer.domElement,
		// );

		this.group = new THREE.Group();
		this.scene.add(this.group);

		// init spine
		this.spineWidth =
			this.pages
				.filter(page => !page.isCover)
				.reduce((acc, page) => acc + page.rootThickness, 0) +
			this.coverThickness;
		this.spineZ = this.coverThickness / 2;
		this.spine1pos = new THREE.Vector3(
			-this.spineWidth / 2,
			0,
			this.spineZ,
		);
		this.spine2pos = this.spine1pos.clone().setX(-this.spine1pos.x);

		// init spine mesh
		const textures = {
			spineInner: new THREE.TextureLoader().load(
				this.textureUrls.spineInner,
			),
			spineOuter: new THREE.TextureLoader().load(
				this.textureUrls.spineOuter,
			),
			spineEdgeLR: new THREE.TextureLoader().load(
				this.textureUrls.spineEdgeLR,
			),
			spineEdgeTB: new THREE.TextureLoader().load(
				this.textureUrls.spineEdgeTB,
			),
		};
		const spineMaterials = [
			new THREE.MeshBasicMaterial({ map: textures.spineEdgeLR }), // right face
			new THREE.MeshBasicMaterial({ map: textures.spineEdgeLR }), // left face
			new THREE.MeshBasicMaterial({ map: textures.spineEdgeTB }), // top face
			new THREE.MeshBasicMaterial({ map: textures.spineEdgeTB }), // bottom face
			new THREE.MeshBasicMaterial({ map: textures.spineInner }), // front face
			new THREE.MeshBasicMaterial({ map: textures.spineOuter }), // back face
		];
		const spineGeometry = new THREE.BoxGeometry(
			this.spineWidth,
			this.pageHeight + this.coverMargin * 2,
			this.coverThickness,
		);
		this.spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
		this.group.add(this.spineMesh);
		this.spineMesh.position.z = this.spineZ;

		// init pages
		let spinePlacementStart =
			-(this.spineWidth / 2) + this.coverThickness / 2;
		let spinePlacementShift = 0;
		this.pages.forEach((page, index) => {
			this.group.add(page.pivot);

			if (page.isCover) {
				page.pivot.position.z = this.spineZ;
				page.pivot.position.x =
					index === 0 ? this.spine1pos.x : this.spine2pos.x;
			} else {
				const elevationLeft =
					spinePlacementShift + page.rootThickness / 2;
				const elevationRight = this.spineWidth - elevationLeft;
				page.setElevation(elevationLeft, elevationRight);

				page.pivot.position.z = this.spineZ + this.coverThickness / 2;
				page.pivot.position.x =
					spinePlacementStart +
					spinePlacementShift +
					page.rootThickness / 2;
				spinePlacementShift += page.rootThickness;
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
		deskMesh.position.z = -50;
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
				if (page.isCover) {
					tp = index ? bookOpenFactor : -bookOpenFactor;
				} else {
					tp = (this.progress % 1) * -2 + 1;
				}
			}

			page.setTurnProgress(tp);

			// TODO: remove?
			// updating renderOrder
			page.mesh.renderOrder =
				this.pages.length - Math.abs(this.progress - 0.5 - index);

			page.update(dt);

			// toggle bend
			page.bendingEnabled = bookOpenFactor === 1;
		});

		// handle book rotation
		let bookAngle = 0;
		if (this.progress < 1) {
			bookAngle = 1 - this.progress;
		} else if (this.progress > this.pages.length - 1) {
			bookAngle = this.pages.length - 1 - this.progress;
		}
		bookAngle *= Math.PI / 2;
		this.group.rotation.y = bookAngle;

		// handle book rotation shift
		const pivot = new THREE.Vector3(
			this.spineWidth / 2,
			0,
			this.coverThickness / 2,
		);
		if (bookAngle < 0) {
			pivot.x = -pivot.x;
		}

		const newPoint = rotateY(new THREE.Vector3(0, 0, 0), pivot, -bookAngle);
		this.group.position.x = newPoint.x;
		this.group.position.z = newPoint.z;

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
