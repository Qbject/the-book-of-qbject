// TODO: move from global
type FlipBookParams = {
	containerEl: HTMLElement;
	pageWidth: number;
	pageHeight: number;
	pageThickness?: number;
	pageRootThickness?: number;
	coverThickness?: number;
	coverMargin?: number;
	pageEdgeColor: number;
	textureUrls: {
		pages: string[];
		spineInner: string;
		spineOuter: string;
		coverEdgeTB: string;
		coverEdgeLR: string;
		spineEdgeTB: string;
		spineEdgeLR: string;
	};
	settings?: Partial<FlipbookSettings>;
};

type FlipbookSettings = {
	cameraAngle: number;
	cameraDistance: number;
	cameraNearClip: number;
	cameraFarClip: number;

	spotLightX: number;
	spotLightY: number;
	spotLightZ: number;
	spotLightNearClip: number;
	spotLightFarClip: number;
	spotLightMapSize: number;
};

type PageParams = {
	textureUrls: {
		front: string;
		back: string;
		edgeLR?: string;
		edgeTB?: string;
	};
	edgeColor: number;
	width: number;
	height: number;
	thickness?: number;
	rootThickness?: number;
	isCover?: boolean;
	textureLoader: THREE.TextureLoader;
};

type PageControlPointParams = {
	turnProgress: number;
	distance: number;
};

type PageControlPoint = {
	x: number;
	z: number;
};
