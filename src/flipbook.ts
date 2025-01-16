import * as THREE from "three";
import { gsap } from "gsap";
import { clamp, lerpedSmoothstep, rotateY, sleep } from "./util";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "stats.js";
import Page from "./Page";
import * as dat from "dat.gui";
import VideoOverlay from "./video-overlay";
import { smoothstep } from "three/src/math/MathUtils.js";

export default class Flipbook {
	private containerEl: HTMLElement;
	private wrapperLinkEl: HTMLElement;
	private pageWidth: number;
	private pageHeight: number;
	private pageThickness: number;
	private pageRootThickness: number;
	private coverThickness: number;
	private coverMarginX: number;
	private coverMarginY: number;
	private textureUrls;
	private pageActiveAreas: PageActiveArea[] = [];
	private pageEdgeColor: number;
	public readonly settings: FlipbookSettings = {
		cameraAngle: 0.35,
		cameraDistance: 3150,
		cameraNearClip: 10,
		cameraFarClip: 10000,

		spotLightX: 910,
		spotLightY: 300,
		spotLightZ: 1650,
		spotLightColor: 0xffffff,
		spotLightIntensity: 6684995,
		spotLightAngle: 0.7,
		spotLightPenumbra: 0.6,
		spotLightDecay: 2,
		spotLightNearClip: 500,
		spotLightFarClip: 3500,
		spotLightMapSize: 2048,

		ambientLightColor: 0xffffff,
		ambientLightIntensity: 0.1,

		showSpotLightHelper: false,
		showSpotShadowHelper: false,
	};

	private pages: Page[] = [];
	private group: THREE.Group;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer;
	private spineMesh: THREE.Mesh;
	private spotLight: THREE.SpotLight;
	private ambientLight: THREE.AmbientLight;
	private raycaster: THREE.Raycaster;
	private sceneMousePos: THREE.Vector2;

	private progress = 0;
	private spineWidth: number;
	private spineZ: number;

	private controls: OrbitControls;
	private stats;
	private datGui: dat.GUI;

	// into about the current user gesture - mouse or touch drag
	private curDrag?: {
		touchId: number | null; // null if mouse is used
		prevX: number;
		prevY: number;
		x: number;
		y: number;
	};

	// into about the currently turning page
	private curTurn?: {
		grabbedPageIndex: number;
		inertia: number;
	};

	// into about the current camera shift in vertical mode
	private curShift?: {
		inertia: number;
	};

	private lastGrabbedPageIndex?: number;
	private spotLightHelper: THREE.SpotLightHelper | null = null;
	private spotShadowHelper: THREE.CameraHelper | null = null;
	private textureLoader: THREE.TextureLoader;
	private initCompleted: boolean = false;
	private videoOverlay: VideoOverlay;

	// @remark, css values has to be changed individually
	private focusedActiveArea: PageActiveArea | null = null;
	private isChangingFocus = false;
	private focusDuration = 1100;
	private focusShiftDuration = 800;
	// -1: look on the left page | 1: look on the right page
	private cameraSideShift = 1;
	private isVerticalMode = false;

	constructor(params: FlipBookParams) {
		this.containerEl = params.containerEl;
		this.pageWidth = params.pageWidth;
		this.pageHeight = params.pageHeight;
		this.pageThickness = params.pageThickness || 2;
		this.pageRootThickness = params.pageRootThickness || 4;
		this.coverThickness = params.coverThickness || 5;
		this.coverMarginX = params.coverMarginX || 8;
		this.coverMarginY = params.coverMarginY || 8;
		this.textureUrls = params.textureUrls;
		this.pageEdgeColor = params.pageEdgeColor;
		this.pageActiveAreas = params.pageActiveAreas || [];

		this.videoOverlay = new VideoOverlay(this.containerEl, () => {
			this.unfocusActiveArea();
		});
		this.pageActiveAreas.forEach(area =>
			this.videoOverlay.addVideo(area?.video),
		);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(
			20,
			window.innerWidth / window.innerHeight,
		);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		// this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		// this.renderer.toneMappingExposure = 1.2;
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.domElement.classList.add("flipbook-canvas");
		this.wrapperLinkEl = document.createElement("a");
		this.wrapperLinkEl.draggable = false;
		this.wrapperLinkEl.classList.add("wrapper-link");
		this.wrapperLinkEl.setAttribute("target", "_blank");
		this.containerEl.appendChild(this.wrapperLinkEl);
		this.wrapperLinkEl.appendChild(this.renderer.domElement);

		this.textureLoader = new THREE.TextureLoader();

		this.raycaster = new THREE.Raycaster();
		this.sceneMousePos = new THREE.Vector2();

		// add pages
		const totalPages = Math.ceil(this.textureUrls.pages.length / 2);
		for (let i = 0; i < totalPages; i++) {
			const isCover = i === 0 || i === totalPages - 1;
			const width = isCover
				? this.pageWidth + this.coverMarginX + this.coverThickness
				: this.pageWidth;
			const height = isCover
				? this.pageHeight + this.coverMarginY * 2
				: this.pageHeight;

			const edgeTextures: Record<string, string> = {};
			if (isCover) {
				edgeTextures.edgeLR = this.textureUrls.coverEdgeLR;
				edgeTextures.edgeTB = this.textureUrls.coverEdgeTB;
			}

			const page = new Page({
				textureUrls: {
					front: this.textureUrls.pages[i * 2],
					back: this.textureUrls.pages[i * 2 + 1],
					...edgeTextures,
				},
				width,
				height,
				thickness: isCover ? this.coverThickness : this.pageThickness,
				rootThickness: isCover
					? this.coverThickness
					: this.pageRootThickness,
				isCover,
				isFrontCover: i === 0,
				edgeColor: this.pageEdgeColor,
				textureLoader: this.textureLoader,
			});
			this.pages.push(page);
		}

		this.ambientLight = new THREE.AmbientLight();
		this.scene.add(this.ambientLight);

		this.spotLight = new THREE.SpotLight();
		this.spotLight.castShadow = true;
		this.spotLight.shadow.bias = -0.0001;
		this.scene.add(this.spotLight);

		// this.controls = new OrbitControls(
		// 	this.camera,
		// 	this.renderer.domElement,
		// );

		this.group = new THREE.Group();
		this.scene.add(this.group);

		// init spine
		this.spineWidth = (this.pages.length - 2) * this.pageRootThickness;
		this.spineZ = this.coverThickness / 2;

		// init spine mesh
		const _texture = (url: string) => {
			const texture = this.textureLoader.load(url);
			texture.colorSpace = THREE.SRGBColorSpace;
			return { map: texture };
		};

		const textures = {
			spineInner: _texture(this.textureUrls.spineInner),
			spineOuter: _texture(this.textureUrls.spineOuter),
			spineEdgeLR: _texture(this.textureUrls.spineEdgeLR),
			spineEdgeTB: _texture(this.textureUrls.spineEdgeTB),
		};
		const spineMaterials = [
			new THREE.MeshStandardMaterial(textures.spineEdgeLR), // right face
			new THREE.MeshStandardMaterial(textures.spineEdgeLR), // left face
			new THREE.MeshStandardMaterial(textures.spineEdgeTB), // top face
			new THREE.MeshStandardMaterial(textures.spineEdgeTB), // bottom face
			new THREE.MeshStandardMaterial(textures.spineInner), // front face
			new THREE.MeshStandardMaterial(textures.spineOuter), // back face
		];
		const spineGeometry = new THREE.BoxGeometry(
			this.spineWidth,
			this.pageHeight + this.coverMarginY * 2,
			this.coverThickness,
		);
		this.spineMesh = new THREE.Mesh(spineGeometry, spineMaterials);
		this.spineMesh.receiveShadow = true;
		this.spineMesh.castShadow = true;
		this.spineMesh.position.z = this.spineZ;
		this.spineMesh.renderOrder = 99;
		this.group.add(this.spineMesh);

		// init pages
		let spinePlacementStart = -this.spineWidth / 2;
		let spinePlacementShift = 0;
		this.pages.forEach((page, index) => {
			this.group.add(page.pivot);

			if (page.isCover) {
				page.pivot.position.z = this.coverThickness;
				page.pivot.position.x =
					(this.spineWidth / 2) * (index ? 1 : -1);
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
		const deskGeometry = new THREE.PlaneGeometry(3000, 2250, 1, 1);
		const deskTexture = this.textureLoader.load(this.textureUrls.desk);
		deskTexture.colorSpace = THREE.SRGBColorSpace;
		const deskMaterial = new THREE.MeshStandardMaterial({
			map: deskTexture,
		});
		const deskMesh = new THREE.Mesh(deskGeometry, deskMaterial);
		deskMesh.receiveShadow = true;
		deskMesh.castShadow = true;
		deskMesh.renderOrder = 100;
		this.scene.add(deskMesh);

		this.updateVerticalMode();
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
		cameraFolder.add(this.settings, "cameraFarClip", 5, 10000);

		const spotLightFolder = this.datGui.addFolder("Spot Light");
		const spotLightPosFolder = spotLightFolder.addFolder("Position");
		spotLightPosFolder.add(this.settings, "spotLightX", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightY", -1000, 1000);
		spotLightPosFolder.add(this.settings, "spotLightZ", 0, 2000);
		spotLightFolder.addColor(this.settings, "spotLightColor");
		spotLightFolder.add(this.settings, "spotLightIntensity", 0, 10000000);
		spotLightFolder.add(this.settings, "spotLightAngle", 0, Math.PI);
		spotLightFolder.add(this.settings, "spotLightPenumbra", 0, 1);
		spotLightFolder.add(this.settings, "spotLightDecay", 0, 10);
		spotLightFolder.add(this.settings, "spotLightNearClip", 1, 4000);
		spotLightFolder.add(this.settings, "spotLightFarClip", 1, 4000);
		spotLightFolder.add(this.settings, "spotLightMapSize", 0, 4096);

		const ambientLightFolder = this.datGui.addFolder("Ambient Light");
		ambientLightFolder.addColor(this.settings, "ambientLightColor");
		ambientLightFolder.add(this.settings, "ambientLightIntensity", 0, 1);

		const helpersFolder = this.datGui.addFolder("Helpers");
		helpersFolder.add(this.settings, "showSpotLightHelper");
		helpersFolder.add(this.settings, "showSpotShadowHelper");

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

		document.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Escape" || event.code === "Escape") {
				this.unfocusActiveArea();
			}
		});

		this.renderer.domElement.addEventListener("click", event => {
			this.sceneMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.sceneMousePos.y =
				-(event.clientY / window.innerHeight) * 2 + 1;
			this.onBookClick(this.sceneMousePos);
		});

		this.wrapperLinkEl.addEventListener("dblclick", () => {
			if (!document.fullscreenElement) {
				if (this.containerEl.requestFullscreen) {
					this.containerEl.requestFullscreen().catch(err => {
						console.error(
							"Failed to enter a full-screen mode",
							err,
						);
					});
				} else {
					console.error(
						"Fullscreen API is not supported in this browser.",
					);
				}
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen().catch(err => {
						console.error("Failed to exit a full-screen mode", err);
					});
				}
			}
		});

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
				event.touches.length === 0
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
			if (this.curDrag && !this.curDrag.touchId) {
				this.curDrag.x = event.clientX;
				this.curDrag.y = event.clientY;
			}

			// process interactive areas
			if (this.focusedActiveArea || this.isChangingFocus) {
				return;
			}
			this.sceneMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
			this.sceneMousePos.y =
				-(event.clientY / window.innerHeight) * 2 + 1;
			const activeArea = this.getActiveAreaAt(this.sceneMousePos);
			this.wrapperLinkEl.style.cursor = activeArea ? "pointer" : "";
			this.wrapperLinkEl.title = activeArea?.title || "";

			if (activeArea?.link) {
				let href = activeArea.link;
				if (typeof href !== "string") href = href();
				this.wrapperLinkEl.setAttribute("href", href);
			} else {
				this.wrapperLinkEl.removeAttribute("href");
			}
		});

		this.renderer.domElement.addEventListener("mouseup", () => {
			if (this.curDrag && !this.curDrag.touchId) {
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
		this.initCompleted = true;

		if (this.curDrag) {
			const deltaX = this.curDrag.x - this.curDrag.prevX;
			this.curDrag.prevX = this.curDrag.x;
			this.curDrag.prevY = this.curDrag.y;
			const progressDelta = this.swipeDeltaToProgress(deltaX);

			// create turn if user starts to drag
			if (!this.curTurn && !this.curShift && progressDelta) {
				if (
					this.isVerticalMode &&
					(this.cameraSideShift % 1 ||
						(this.cameraSideShift === -1 &&
							progressDelta > 0 &&
							this.progress < this.pages.length - 1) ||
						(this.cameraSideShift === 1 &&
							progressDelta < 0 &&
							this.progress > 0))
				) {
					this.curShift = { inertia: 0 };
				} else {
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
			}

			if (this.curTurn) {
				this.progress += progressDelta;
				this.curTurn.inertia =
					(this.curTurn.inertia * 2 + progressDelta / dt) / 3;
			}

			// TODO: properly calc shift delta
			if (this.curShift) {
				this.cameraSideShift += progressDelta * 2;
				this.curShift.inertia =
					(this.curShift.inertia * 2 + (progressDelta * 2) / dt) / 3;
			}
		}

		if (this.curTurn) {
			if (!this.curDrag) {
				// apply inertia and gravity
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

			// update cameraSideShift
			if (this.isVerticalMode) {
				const tp = this.progress - this.curTurn.grabbedPageIndex;
				this.cameraSideShift = (1 - tp) * 2 - 1;
			} else {
				// TODO: smoothing works only in one direction
				const bookOpenFactor = Math.min(
					this.progress,
					this.pages.length - this.progress,
					1,
				);

				this.cameraSideShift = 1 - bookOpenFactor;
				if (this.progress + 1 > this.pages.length) {
					this.cameraSideShift = -this.cameraSideShift;
				}
			}

			if (!this.curDrag && this.progress % 1 === 0) {
				// turn has ended
				this.curTurn = undefined;
			}
		}

		if (this.curShift) {
			if (!this.curDrag) {
				// apply inertia and convergence
				const convergence = this.cameraSideShift * 20 * dt;
				this.curShift.inertia += convergence;
				this.cameraSideShift += this.curShift.inertia * dt;
			}

			this.cameraSideShift = clamp(this.cameraSideShift, -1, 1);

			if (!this.curDrag && Math.abs(this.cameraSideShift) === 1) {
				// shift has ended
				this.curShift = undefined;
			}
		}

		if (!this.isChangingFocus && !this.focusedActiveArea) {
			this.restoreCamera();
		}

		const bookOpenFactor = Math.min(
			this.progress,
			this.pages.length - this.progress,
			1,
		);

		// TODO:
		// calculating visual turn progress to timely hide shadows
		// const topPage = this.pages[Math.max(Math.ceil(this.progress) - 1, 0)];
		// const visualProgress =
		// 	this.progress +
		// 	(topPage.turnProgress - topPage.turnProgressLag) * 0.5;

		this.pages.forEach((page, index) => {
			// toggle shadow
			if (index && index < this.pages.length - 1) {
				// TODO:
				// page.mesh.castShadow = visualProgress < index + 1.9;
			}

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

			// toggle bend
			page.bendingEnabled = !(
				this.lastGrabbedPageIndex !== undefined &&
				this.pages[this.lastGrabbedPageIndex].isCover
			);

			page.setTurnProgress(tp);

			page.mesh.renderOrder = Math.abs(this.progress - 0.5 - index);

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
			this.coverThickness,
		);
		if (bookAngle < 0) {
			pivot.x = -pivot.x;
		}
		const newPoint = rotateY(new THREE.Vector3(0, 0, 0), pivot, -bookAngle);
		this.group.position.x = newPoint.x;
		this.group.position.z = newPoint.z;

		if (!this.focusedActiveArea || this.isChangingFocus) {
			this.render();
		}
	}

	private render() {
		this.renderer.render(this.scene, this.camera);
	}

	private updateVerticalMode() {
		const bookAspect = (this.pageWidth * 2) / this.pageHeight;
		const screenAspect = window.innerWidth / window.innerHeight;
		// TODO: tweak the breakpoint
		this.isVerticalMode = bookAspect > screenAspect;
	}

	private onWindowResize() {
		this.updateVerticalMode();
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.render();
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
			this.restoreCamera();
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

			this.spotLightHelper?.update();
			this.spotShadowHelper?.update();
		}

		if (newSettings.spotLightColor) {
			this.spotLight.color = new THREE.Color(
				this.settings.spotLightColor,
			);
		}

		if (newSettings.spotLightIntensity) {
			this.spotLight.intensity = this.settings.spotLightIntensity;
		}

		if (newSettings.spotLightAngle) {
			this.spotLight.angle = this.settings.spotLightAngle;
		}

		if (newSettings.spotLightPenumbra) {
			this.spotLight.penumbra = this.settings.spotLightPenumbra;
		}

		if (newSettings.spotLightDecay) {
			this.spotLight.decay = this.settings.spotLightDecay;
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

		if (newSettings.ambientLightColor) {
			this.ambientLight.color = new THREE.Color(
				this.settings.ambientLightColor,
			);
		}

		if (newSettings.ambientLightIntensity) {
			this.ambientLight.intensity = this.settings.ambientLightIntensity;
		}

		if (typeof newSettings.showSpotLightHelper !== "undefined") {
			if (this.spotLightHelper && !newSettings.showSpotLightHelper) {
				this.scene.remove(this.spotLightHelper);
				this.spotLightHelper = null;
			}
			if (!this.spotLightHelper && newSettings.showSpotLightHelper) {
				this.spotLightHelper = new THREE.SpotLightHelper(
					this.spotLight,
				);
				this.scene.add(this.spotLightHelper);
			}
		}

		if (typeof newSettings.showSpotShadowHelper !== "undefined") {
			if (this.spotShadowHelper && !newSettings.showSpotShadowHelper) {
				this.scene.remove(this.spotShadowHelper);
				this.spotShadowHelper = null;
			}
			if (!this.spotShadowHelper && newSettings.showSpotShadowHelper) {
				this.spotShadowHelper = new THREE.CameraHelper(
					this.spotLight.shadow.camera,
				);
				this.scene.add(this.spotShadowHelper);
			}
		}
	}

	public getActiveAreaAt(scenePos: THREE.Vector2) {
		if (!this.initCompleted) return;
		if (this.curTurn) return;
		if (this.curShift) return;

		// determine a top pages
		const pr = Math.round(this.progress);
		const topPageIndices = [];
		if (pr !== 0) topPageIndices.push(pr - 1);
		if (pr !== this.pages.length) topPageIndices.push(pr);

		// run raycast
		this.raycaster.setFromCamera(scenePos, this.camera);
		const intersects = this.raycaster.intersectObjects(
			topPageIndices.map(i => this.pages[i].mesh),
		);
		if (!intersects.length) return;

		// check if ray hits one of the top pages
		const hoverPageIndex = topPageIndices.find(
			i => this.pages[i].mesh === intersects[0].object,
		);
		if (typeof hoverPageIndex !== "number") return;

		// prevent clicking bending pages
		const hoverPage = this.pages[hoverPageIndex];
		const hoverPageBend = Math.abs(
			hoverPage.turnProgress - hoverPage.turnProgressLag,
		);
		if (hoverPageBend > 0.01) return;

		// get face index
		let hoverFaceIndex;
		if (intersects[0].face?.materialIndex === 1) {
			hoverFaceIndex = hoverPageIndex * 2;
		} else if (intersects[0].face?.materialIndex === 0) {
			hoverFaceIndex = hoverPageIndex * 2 + 1;
		} else {
			return;
		}

		// find active area with given coords
		const faceX = intersects[0].uv?.x || 0;
		const faceY = 1 - (intersects[0].uv?.y || 0);
		return this.pageActiveAreas.find(
			area =>
				area.faceIndex === hoverFaceIndex &&
				faceY > area.top &&
				faceY < area.top + area.height &&
				faceX > area.left &&
				faceX < area.left + area.width,
		);
	}

	public watchRectangle(
		corners: THREE.Vector3[],
		distanceMultiplier: number = 1,
	) {
		const [TL, TR, BL, BR] = corners;

		const center = new THREE.Vector3()
			.addVectors(TL, TR)
			.add(BL)
			.add(BR)
			.multiplyScalar(0.25);

		// Calculate normal using cross product of diagonals
		let v1 = new THREE.Vector3().subVectors(BL, TR);
		let v2 = new THREE.Vector3().subVectors(BR, TL);
		const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

		const width = TL.distanceTo(TR);
		const height = TL.distanceTo(BL);

		// Calculate distance using camera's FOV and aspect ratio
		const fovYRadians = THREE.MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const hFOV = 2 * Math.atan(Math.tan(fovYRadians / 2) * aspect);

		const distanceH = width / 2 / Math.tan(hFOV / 2);
		const distanceV = height / 2 / Math.tan(fovYRadians / 2);
		const distance = Math.max(distanceH, distanceV) * distanceMultiplier;

		const targetPosition = {
			x: center.x + normal.x * distance,
			y: center.y + normal.y * distance,
			z: center.z + normal.z * distance,
		};

		// Calculate the quaternion for the target rotation
		const targetQuaternion = new THREE.Quaternion();
		const targetDirection = new THREE.Vector3()
			.subVectors(center, targetPosition)
			.normalize();
		targetQuaternion.setFromUnitVectors(
			new THREE.Vector3(0, 0, -1),
			targetDirection,
		);

		gsap.to(this.camera.position, {
			x: targetPosition.x,
			duration: this.focusShiftDuration / 1000,
			ease: "power2.inOut",
		});

		gsap.to(this.camera.position, {
			y: targetPosition.y,
			duration: this.focusShiftDuration / 1000,
			ease: "power2.inOut",
		});

		gsap.to(this.camera.position, {
			z: targetPosition.z,
			duration: this.focusDuration / 1000,
			ease: "power2.inOut",
		});

		gsap.to(this.camera.quaternion, {
			x: targetQuaternion.x,
			y: targetQuaternion.y,
			z: targetQuaternion.z,
			w: targetQuaternion.w,
			duration: this.focusShiftDuration / 1000,
			ease: "power2.inOut",
		});
	}

	public async restoreCamera(animate = false) {
		const { cameraAngle } = this.settings;

		const distanceMultiplier = 1.2;
		const fovYRadians = THREE.MathUtils.degToRad(this.camera.fov);
		const aspect = this.camera.aspect;
		const hFOV = 2 * Math.atan(Math.tan(fovYRadians / 2) * aspect);
		const minDistance =
			(this.pageWidth / 2 / Math.tan(hFOV / 2)) * distanceMultiplier;

		const cameraDistance = Math.max(
			minDistance,
			this.settings.cameraDistance,
		);

		let smoothShift;
		if (this.isVerticalMode) {
			smoothShift = lerpedSmoothstep(this.cameraSideShift, -1, 1);
		} else {
			const min = this.cameraSideShift < 0 ? -1 : 0;
			const max = this.cameraSideShift < 0 ? 0 : 1;
			smoothShift = lerpedSmoothstep(this.cameraSideShift, min, max);
		}
		const targetPosition = {
			x: (smoothShift * this.pageWidth) / 2,
			y: Math.sin((cameraAngle * Math.PI) / 2) * -cameraDistance,
			z: Math.cos((cameraAngle * Math.PI) / 2) * cameraDistance,
		};
		const targetRotation = { x: (Math.PI / 2) * cameraAngle, y: 0, z: 0 };

		if (!animate) {
			this.camera.position.set(
				targetPosition.x,
				targetPosition.y,
				targetPosition.z,
			);
			this.camera.rotation.set(
				targetRotation.x,
				targetRotation.y,
				targetRotation.z,
			);
			return;
		}

		gsap.to(this.camera.position, {
			z: targetPosition.z,
			duration: this.focusDuration / 1000,
			ease: "power2.inOut",
		});

		sleep(this.focusDuration - this.focusShiftDuration).then(() => {
			gsap.to(this.camera.position, {
				x: targetPosition.x,
				duration: this.focusShiftDuration / 1000,
				ease: "power2.inOut",
			});

			gsap.to(this.camera.position, {
				y: targetPosition.y,
				duration: this.focusShiftDuration / 1000,
				ease: "power2.inOut",
			});

			gsap.to(this.camera.rotation, {
				...targetRotation,
				duration: this.focusShiftDuration / 1000,
				ease: "power2.inOut",
			});
		});
	}

	private async focusActiveArea(
		area: PageActiveArea,
		distanceMultiplier: number = 1,
	) {
		if (this.isChangingFocus) return;

		this.wrapperLinkEl.removeAttribute("href");
		this.wrapperLinkEl.style.cursor = "";
		this.wrapperLinkEl.title = "";

		const page = this.pages[Math.floor(area.faceIndex / 2)];
		const isBackside = area.faceIndex % 2 === 1;
		const corners = page.getPageAreaCorners(area, isBackside);
		this.watchRectangle(corners, distanceMultiplier);

		this.focusedActiveArea = area;

		this.isChangingFocus = true;
		await sleep(this.focusDuration);
		this.isChangingFocus = false;
	}

	private async onBookClick(sceneMousePos: THREE.Vector2) {
		if (this.isChangingFocus) return;

		if (this.focusedActiveArea) {
			this.unfocusActiveArea();
			return;
		}

		const area = this.getActiveAreaAt(sceneMousePos);

		if (area?.video) {
			this.videoOverlay.open(area.video);
			this.focusActiveArea(area, 1.125);
		}

		if (area?.zoom) {
			this.focusActiveArea(area, 1.05);
		}
	}

	private async unfocusActiveArea() {
		if (this.isChangingFocus) return;

		this.focusedActiveArea = null;
		this.restoreCamera(true);
		this.videoOverlay.close();

		this.isChangingFocus = true;
		await sleep(this.focusDuration);
		this.isChangingFocus = false;
	}
}
