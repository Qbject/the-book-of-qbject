import * as THREE from "three";
import { gsap } from "gsap";
import { clamp, rotateY } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import Page from "./Page";
import * as dat from "dat.gui";

export default class Flipbook {
	private containerEl: HTMLElement;
	private pageWidth: number;
	private pageHeight: number;
	private pageThickness: number;
	private pageRootThickness: number;
	private coverThickness: number;
	private coverMargin: number;
	private textureUrls;
	private pageEdgeColor: number;
	public readonly settings: FlipbookSettings = {
		cameraAngle: 0,
		cameraDistance: 2500,
		cameraNearClip: 2000,
		cameraFarClip: 3000,

		spotLightX: 100,
		spotLightY: 300,
		spotLightZ: 1000,
		spotLightNearClip: 500,
		spotLightFarClip: 2000,
		spotLightMapSize: 2048,
	};

	private pages: Page[] = [];
	private group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private spineMesh: THREE.Mesh;
	private spotLight: THREE.SpotLight;
	private ambientLight: THREE.AmbientLight;

	private progress = 0;
	private spine1pos = new THREE.Vector3(0, 0, 0);
	private spine2pos = new THREE.Vector3(0, 0, 0);
	private spineWidth: number;
	private spineZ: number;

	private controls: OrbitControls;
	private stats;
	private datGui: dat.GUI;

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
	private lastGrabbedPageIndex?: number;
	spotLightHelper: THREE.SpotLightHelper;
	spotShadowHelper: THREE.CameraHelper;

	constructor(params: FlipBookParams) {
		this.containerEl = params.containerEl;
		this.pageWidth = params.pageWidth;
		this.pageHeight = params.pageHeight;
		this.pageThickness = params.pageThickness || 2;
		this.pageRootThickness = params.pageRootThickness || 4;
		this.coverThickness = params.coverThickness || 5;
		this.coverMargin = params.coverMargin || 8;
		this.textureUrls = params.textureUrls;
		this.pageEdgeColor = params.pageEdgeColor;

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

			const edgeTextures: Record<string, string> = {};
			if (isCover) {
				edgeTextures.edgeLR = this.textureUrls.coverEdgeLR;
				edgeTextures.edgeTB = this.textureUrls.coverEdgeTB;
			}

			this.pages.push(
				new Page({
					textureUrls: {
						front: this.textureUrls.pages[i * 2],
						back: this.textureUrls.pages[i * 2 + 1],
						...edgeTextures,
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
					edgeColor: this.pageEdgeColor,
				}),
			);
		}

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			20,
			window.innerWidth / window.innerHeight,
		);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.domElement.classList.add("flipbook-canvas");
		this.containerEl.appendChild(this.renderer.domElement);

		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		this.scene.add(this.ambientLight);

		this.spotLight = new THREE.SpotLight(0xffffff, 2000000, 0, 0.6, 0.2);
		this.spotLight.castShadow = true;
		this.spotLight.shadow.bias = -0.0001;
		this.scene.add(this.spotLight);

		this.spotLightHelper = new THREE.SpotLightHelper(this.spotLight);
		this.scene.add(this.spotLightHelper);

		this.spotShadowHelper = new THREE.CameraHelper(
			this.spotLight.shadow.camera,
		);
		this.scene.add(this.spotShadowHelper);

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
			new THREE.MeshStandardMaterial({ map: textures.spineEdgeLR }), // right face
			new THREE.MeshStandardMaterial({ map: textures.spineEdgeLR }), // left face
			new THREE.MeshStandardMaterial({ map: textures.spineEdgeTB }), // top face
			new THREE.MeshStandardMaterial({ map: textures.spineEdgeTB }), // bottom face
			new THREE.MeshStandardMaterial({ map: textures.spineInner }), // front face
			new THREE.MeshStandardMaterial({ map: textures.spineOuter }), // back face
		];
		const spineGeometry = new THREE.BoxGeometry(
			this.spineWidth,
			this.pageHeight + this.coverMargin * 2,
			this.coverThickness,
		);
		this.spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
		this.spineMesh.receiveShadow = true;
		this.spineMesh.castShadow = true;
		this.group.add(this.spineMesh);
		this.spineMesh.position.z = this.spineZ;

		// init pages
		let spinePlacementStart =
			-(this.spineWidth / 2) + this.coverThickness / 2;
		let spinePlacementShift = 0;
		this.pages.forEach((page, index) => {
			this.group.add(page.pivot);

			if (page.isCover) {
				page.pivot.position.z = this.spineZ + 0.5;
				page.pivot.position.x =
					index === 0 ? this.spine1pos.x : this.spine2pos.x;
			} else {
				const elevationLeft =
					spinePlacementShift + page.rootThickness / 2;
				const elevationRight =
					this.spineWidth - this.coverThickness - elevationLeft;
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
		deskMesh.position.z = 0;
		deskMesh.receiveShadow = true;
		deskMesh.castShadow = true;
		this.scene.add(deskMesh);

		this.applySettings(params.settings || {}, true);

		// Add fps counter
		this.stats = new Stats();
		this.stats.showPanel(0);
		document.body.appendChild(this.stats.dom);

		this.datGui = new dat.GUI();

		const cameraFolder = this.datGui.addFolder("Camera");
		cameraFolder.open();
		cameraFolder.add(this.settings, "cameraAngle", 0, 1);
		cameraFolder.add(this.settings, "cameraDistance", 0, 5000);
		cameraFolder.add(this.settings, "cameraNearClip", 5, 5000);
		cameraFolder.add(this.settings, "cameraFarClip", 5, 5000);

		const spotLightFolder = this.datGui.addFolder("Spot Light");
		const spotLightPosFolder = spotLightFolder.addFolder("Position");
		spotLightPosFolder.add(this.settings, "spotLightX", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightY", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightZ", 0, 2000);
		spotLightFolder.add(this.settings, "spotLightNearClip", 1, 2000);
		spotLightFolder.add(this.settings, "spotLightFarClip", 1, 2000);
		spotLightFolder.add(this.settings, "spotLightMapSize", 0, 4096);

		const addChangeListeners = (gui: dat.GUI): void => {
			gui.__controllers.forEach((controller: dat.GUIController) => {
				controller.onChange((value: any) => {
					this.applySettings({ [controller.property]: value });
				});
			});

			for (const folderName in gui.__folders) {
				if (gui.__folders.hasOwnProperty(folderName)) {
					addChangeListeners(gui.__folders[folderName]);
				}
			}
		};
		addChangeListeners(this.datGui);

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
				this.lastGrabbedPageIndex = this.curTurn.grabbedPageIndex;
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
				if (this.progress % 1) {
					const gravity = ((this.progress % 1) - 0.5) * 10 * dt;
					this.curTurn.inertia += gravity;
				}
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

			// TODO: remove?
			// updating renderOrder
			page.mesh.renderOrder =
				this.pages.length - Math.abs(this.progress - 0.5 - index);

			// toggle bend
			page.bendingEnabled = !(
				this.lastGrabbedPageIndex !== undefined &&
				this.pages[this.lastGrabbedPageIndex].isCover
			);

			page.setTurnProgress(tp);
			page.update(dt);
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

		// TODO: remove
		// update spine normals
		// this.spineMesh.geometry.computeVertexNormals();

		this.renderer.render(this.scene, this.camera);
	}

	private onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	public applySettings(
		newSettings: Partial<FlipbookSettings>,
		updateAll = false,
	) {
		Object.assign(this.settings, newSettings);
		if (updateAll) {
			newSettings = this.settings; // ensure all updates are triggered
		}

		if (newSettings.cameraDistance || newSettings.cameraAngle) {
			const { cameraDistance, cameraAngle } = this.settings;
			this.camera.position.set(
				0,
				Math.sin((cameraAngle * Math.PI) / 2) * -cameraDistance,
				Math.cos((cameraAngle * Math.PI) / 2) * cameraDistance,
			);
			this.camera.rotation.set((Math.PI / 2) * cameraAngle, 0, 0);
		}

		if (newSettings.cameraNearClip || newSettings.cameraFarClip) {
			this.camera.near = this.settings.cameraNearClip;
			this.camera.far = this.settings.cameraFarClip;
			this.camera.updateProjectionMatrix();
		}

		if (
			newSettings.spotLightX ||
			newSettings.spotLightY ||
			newSettings.spotLightZ
		) {
			this.spotLight.position.set(
				this.settings.spotLightX,
				this.settings.spotLightY,
				this.settings.spotLightZ,
			);
			this.spotLight.lookAt(new THREE.Vector3());

			this.spotLightHelper.update();
			this.spotShadowHelper.update();
		}

		if (newSettings.spotLightNearClip || newSettings.spotLightFarClip) {
			this.spotLight.shadow.camera.near = this.settings.spotLightNearClip;
			this.spotLight.shadow.camera.far = this.settings.spotLightFarClip;
			this.spotLight.shadow.camera.updateProjectionMatrix();
		}

		if (newSettings.spotLightMapSize) {
			this.spotLight.shadow.mapSize.x = this.settings.spotLightMapSize;
			this.spotLight.shadow.mapSize.y = this.settings.spotLightMapSize;
			this.spotLight.shadow.map?.dispose?.();
			this.spotLight.shadow.map = null;
			this.spotLight.shadow.needsUpdate = true;
		}
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
